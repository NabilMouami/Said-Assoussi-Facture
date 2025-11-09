const Invoice = require("../models/invoice");
const InvoiceItem = require("../models/invoiceItem");
const Advancement = require("../models/Advancement");
const PDFDocument = require("pdfkit");
const getLastInvoiceId = async () => {
  try {
    const lastInvoice = await Invoice.findOne({
      order: [["id", "DESC"]],
      attributes: ["id"],
    });

    return lastInvoice ? lastInvoice.id : 0;
  } catch (error) {
    console.error("Error getting last invoice ID:", error);
    return 0;
  }
};

const generateInvoiceNumber = async () => {
  const lastId = await getLastInvoiceId();
  const nextId = lastId + 1;
  return `FACT-${nextId}`;
};

const createInvoice = async (req, res) => {
  console.log("Invoice Data:", req.body);
  try {
    const {
      customerName,
      customerPhone,
      issueDate,
      notes,
      items,
      status,
      discountType,
      discountValue,
      paymentType,
      advancements,
      advancement, // numeric value (the one we check)
      remainingAmount,
      subTotal, // Add this from request
      total, // Add this from request
    } = req.body;

    // ✅ Validate customer name
    if (!customerName || customerName.trim() === "") {
      return res.status(400).json({ message: "Customer name is required" });
    }

    // ✅ Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "Invoice must have at least one item" });
    }

    // ✅ Generate invoice number automatically (last ID + 1)
    const invoiceNumber = await generateInvoiceNumber();

    // ✅ Calculate item totals (for verification)
    const preparedItems = items.map((item) => {
      const totalPrice =
        item.quantity * item.v1 * item.v2 * item.v3 * item.unitPrice;
      return {
        ...item,
        totalPrice,
        articleName: item.articleName || item.product || "",
      };
    });

    // ✅ Calculate totals to verify with frontend
    const calculatedSubTotal = preparedItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    const calculateDiscount = () => {
      if (discountType === "percentage") {
        return (calculatedSubTotal * discountValue) / 100;
      } else {
        return discountValue || 0;
      }
    };

    const calculatedDiscount = calculateDiscount();
    const calculatedTotal = Math.max(
      0,
      calculatedSubTotal - calculatedDiscount
    );

    // Calculate total advancement
    let totalAdvancement = 0;
    if (advancements && Array.isArray(advancements)) {
      totalAdvancement = advancements.reduce(
        (sum, adv) => sum + parseFloat(adv.amount || 0),
        0
      );
    }
    if (advancement && Number(advancement) > 0) {
      totalAdvancement += Number(advancement);
    }

    const calculatedRemainingAmount = Math.max(
      0,
      calculatedTotal - totalAdvancement
    );

    console.log("Calculated totals:", {
      subTotal: calculatedSubTotal,
      discount: calculatedDiscount,
      total: calculatedTotal,
      advancement: totalAdvancement,
      remainingAmount: calculatedRemainingAmount,
    });

    console.log("Received totals:", {
      subTotal: subTotal,
      total: total,
      remainingAmount: remainingAmount,
    });

    // ✅ Prepare existing advancements if any were sent
    const preparedAdvancements = advancements
      ? advancements.map((adv) => ({
          amount: adv.amount,
          paymentDate: adv.paymentDate || new Date(),
          paymentMethod: adv.paymentMethod || "espece",
          reference: adv.reference || "",
          notes: adv.notes || "",
        }))
      : [];

    // ✅ If a single advancement > 0 was provided, push it as a new record
    if (advancement && Number(advancement) > 0) {
      preparedAdvancements.push({
        amount: Number(advancement),
        paymentDate: new Date(),
        paymentMethod: paymentType || "espece",
        reference: "",
        notes: "Avancement initial automatique",
      });
    }

    // ✅ Create invoice with items + advancements
    const invoice = await Invoice.create(
      {
        invoiceNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone || null,
        issueDate,
        notes,
        status: status || "brouillon",
        discountType: discountType || "fixed",
        discountValue: discountValue || 0,
        paymentType: paymentType || "non_paye",
        advancement: totalAdvancement,
        remainingAmount: calculatedRemainingAmount, // Use calculated value
        subTotal: calculatedSubTotal,
        total: calculatedTotal,
        discountAmount: calculatedDiscount,
        items: preparedItems,
        advancements: preparedAdvancements,
      },
      {
        include: [
          { model: InvoiceItem, as: "items" },
          { model: Advancement, as: "advancements" },
        ],
      }
    );

    // ✅ Don't recalculate totals if we already have them calculated correctly
    // Remove this line if it's causing the discrepancy:
    // invoice.calculateTotals();

    // Just save the invoice as is
    await invoice.save();

    return res.status(201).json({
      message: "Invoice created successfully",
      invoice,
    });
  } catch (err) {
    console.error("Create invoice error:", err);

    // Handle duplicate invoice number
    if (err.name === "SequelizeUniqueConstraintError") {
      const fallbackInvoiceNumber = `FACT-${Date.now()}`;
      return res.status(409).json({
        message: "Invoice number conflict, please try again",
        fallbackSuggestion: fallbackInvoiceNumber,
      });
    }

    // Handle validation errors
    if (err.name === "SequelizeValidationError") {
      const errors = err.errors.map((error) => error.message);
      return res.status(400).json({
        message: "Validation error",
        errors,
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
const getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
      include: [
        { model: InvoiceItem, as: "items" },
        { model: Advancement, as: "advancements" },
      ],
      order: [["createdAt", "DESC"]],
    });
    return res.json(invoices);
  } catch (err) {
    console.error("Get invoices error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        { model: InvoiceItem, as: "items" },
        { model: Advancement, as: "advancements" },
      ],
    });
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    return res.json(invoice);
  } catch (err) {
    console.error("Get invoice error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        { model: InvoiceItem, as: "items" },
        { model: Advancement, as: "advancements" },
      ],
    });
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const {
      invoiceNumber,
      customerName,
      customerPhone,
      issueDate,
      notes,
      items,
      status,
      discountType,
      discountValue,
      paymentType,
      advancements,
      remainingAmount,
    } = req.body;

    console.log("Updating invoice with data:", {
      status: status,
      currentStatus: invoice.status,
    }); // Debug log

    // Update invoice fields - use direct assignment with proper validation
    if (invoiceNumber !== undefined) invoice.invoiceNumber = invoiceNumber;
    if (customerName !== undefined) invoice.customerName = customerName;
    if (customerPhone !== undefined) invoice.customerPhone = customerPhone;
    if (issueDate !== undefined) invoice.issueDate = issueDate;
    if (notes !== undefined) invoice.notes = notes;

    // CRITICAL: Make sure status is being set
    if (status !== undefined) {
      console.log("Setting status from:", invoice.status, "to:", status); // Debug log
      invoice.status = status;
    }

    if (discountType !== undefined) invoice.discountType = discountType;
    if (discountValue !== undefined) invoice.discountValue = discountValue;
    if (paymentType !== undefined) invoice.paymentType = paymentType;
    if (remainingAmount !== undefined)
      invoice.remainingAmount = remainingAmount;

    console.log("Invoice after field assignment, before save:", {
      status: invoice.status,
      customerName: invoice.customerName,
    }); // Debug log

    // Save the invoice first to update basic fields
    await invoice.save();

    console.log(
      "Invoice saved successfully, status should be:",
      invoice.status
    ); // Debug log

    // Replace items if provided
    if (items && Array.isArray(items)) {
      console.log("Updating items..."); // Debug log

      await InvoiceItem.destroy({ where: { invoiceId: invoice.id } });

      const newItems = items.map((item) => {
        const totalPrice =
          item.quantity * item.v1 * item.v2 * item.v3 * item.unitPrice;
        return {
          ...item,
          totalPrice,
          invoiceId: invoice.id,
          articleName: item.articleName || "",
        };
      });

      await InvoiceItem.bulkCreate(newItems);
    }

    // Replace advancements if provided
    if (advancements && Array.isArray(advancements)) {
      await Advancement.destroy({ where: { invoiceId: invoice.id } });

      const newAdvancements = advancements.map((adv) => ({
        amount: adv.amount,
        paymentDate: adv.paymentDate || new Date(),
        paymentMethod: adv.paymentMethod || "espece",
        reference: adv.reference || "",
        notes: adv.notes || "",
        invoiceId: invoice.id,
      }));

      await Advancement.bulkCreate(newAdvancements);
    }

    // Reload and recalculate totals
    await invoice.reload({
      include: [
        { model: InvoiceItem, as: "items" },
        { model: Advancement, as: "advancements" },
      ],
    });
    invoice.calculateTotals();
    await invoice.save();

    // Return the updated invoice
    return res.json({
      message: "Invoice updated successfully",
      invoice,
    });
  } catch (err) {
    console.error("Update invoice error:", err);

    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: "Invoice number already exists",
      });
    }

    if (err.name === "SequelizeValidationError") {
      const errors = err.errors.map((error) => error.message);
      return res.status(400).json({
        message: "Validation error",
        errors,
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    await invoice.destroy();
    return res.json({ message: "Invoice deleted successfully" });
  } catch (err) {
    console.error("Delete invoice error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const addAdvancement = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { amount, paymentDate, paymentMethod, reference, notes } = req.body;

    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const advancement = await Advancement.create({
      amount,
      paymentDate: paymentDate || new Date(),
      paymentMethod: paymentMethod || "espece",
      reference: reference || "",
      notes: notes || "",
      invoiceId: invoice.id,
    });

    // Recalculate totals
    await invoice.reload({
      include: [
        { model: InvoiceItem, as: "items" },
        { model: Advancement, as: "advancements" },
      ],
    });
    invoice.calculateTotals();
    await invoice.save();

    return res.json({
      message: "Advancement added successfully",
      advancement,
      invoice,
    });
  } catch (err) {
    console.error("Add advancement error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const generateInvoicePDF = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        { model: InvoiceItem, as: "items" },
        { model: Advancement, as: "advancements" },
      ],
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`
    );

    doc.pipe(res);

    // ===== HEADER =====
    doc.rect(0, 0, doc.page.width, 100).fill("#1a73e8"); // blue header background
    doc
      .fillColor("white")
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("FACTURE", 50, 40);
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`N°: ${invoice.invoiceNumber}`, 450, 40)
      .text(
        `Date: ${new Date(invoice.issueDate).toLocaleDateString("fr-FR")}`,
        450,
        60
      );

    doc.moveDown(3);

    // ===== CLIENT INFO =====
    doc
      .fillColor("#333")
      .font("Helvetica-Bold")
      .fontSize(14)
      .text("Informations du client", 50, 130);
    doc.moveTo(50, 145).lineTo(550, 145).strokeColor("#1a73e8").stroke();

    doc
      .font("Helvetica")
      .fontSize(12)
      .text(`Nom du client : ${invoice.customerName}`, 50, 160)
      .text(`Téléphone : ${invoice.customerPhone || "—"}`, 50, 180);

    doc.moveDown(2);

    // ===== ITEMS TABLE =====
    const tableTop = 220;
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#1a73e8")
      .text("Article", 50, tableTop)
      .text("Quantité", 250, tableTop)
      .text("Prix Unitaire", 350, tableTop)
      .text("Total", 470, tableTop);
    doc
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .strokeColor("#ccc")
      .stroke();

    let yPosition = tableTop + 25;
    doc.font("Helvetica").fontSize(12).fillColor("#000");

    invoice.items.forEach((item, i) => {
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }
      doc.text(item.articleName || `Article ${i + 1}`, 50, yPosition);
      doc.text(item.quantity.toString(), 270, yPosition);
      doc.text(`${item.unitPrice} DH`, 370, yPosition);
      doc.text(`${item.totalPrice} DH`, 470, yPosition);
      yPosition += 20;
    });

    // ===== TOTALS SECTION =====
    yPosition += 20;
    doc
      .moveTo(50, yPosition)
      .lineTo(550, yPosition)
      .strokeColor("#ddd")
      .stroke();

    yPosition += 15;
    doc
      .font("Helvetica")
      .text(`Sous-total:`, 350, yPosition)
      .text(`${invoice.subTotal} DH`, 470, yPosition, { align: "right" });

    if (invoice.discountValue > 0) {
      yPosition += 20;
      const discountText =
        invoice.discountType === "percentage"
          ? `Remise (${invoice.discountValue}%):`
          : "Remise:";
      doc
        .text(discountText, 350, yPosition)
        .text(`-${invoice.discountAmount} DH`, 470, yPosition, {
          align: "right",
        });
    }

    yPosition += 25;
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#1a73e8")
      .text(`Total TTC:`, 350, yPosition)
      .text(`${invoice.total} DH`, 470, yPosition, { align: "right" });

    // ===== ADVANCEMENTS =====
    if (invoice.advancements && invoice.advancements.length > 0) {
      yPosition += 40;
      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .fillColor("#333")
        .text("Acomptes:", 50, yPosition);
      yPosition += 20;

      doc.font("Helvetica").fontSize(12);
      invoice.advancements.forEach((a) => {
        doc.text(
          `- ${a.amount} DH (${a.paymentMethod}) - ${new Date(
            a.paymentDate
          ).toLocaleDateString("fr-FR")}`,
          60,
          yPosition
        );
        yPosition += 15;
      });

      yPosition += 10;
      doc
        .font("Helvetica-Bold")
        .text(`Montant restant: ${invoice.remainingAmount} DH`, 50, yPosition);
    }

    // ===== STATUS =====
    yPosition += 40;
    const statusText = {
      brouillon: "Brouillon",
      envoyée: "Envoyée",
      payée: "Payée",
      partiellement_payée: "Partiellement payée",
      en_retard: "En retard",
      annulée: "Annulée",
      en_litige: "En litige",
      en_attente: "En attente",
      acompte_reçu: "Acompte reçu",
    };

    doc
      .font("Helvetica-Bold")
      .fillColor("#1a73e8")
      .text(
        `Statut: ${statusText[invoice.status] || invoice.status}`,
        50,
        yPosition
      );

    // ===== NOTES =====
    if (invoice.notes) {
      yPosition += 30;
      doc
        .font("Helvetica-Bold")
        .fillColor("#333")
        .text("Notes:", 50, yPosition);
      yPosition += 15;
      doc
        .font("Helvetica")
        .fillColor("#000")
        .text(invoice.notes, 50, yPosition, { width: 500 });
    }

    doc.end();
  } catch (err) {
    console.error("Generate PDF error:", err);
    return res.status(500).json({
      message: "Error generating PDF",
      error: err.message,
    });
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  addAdvancement,
  generateInvoicePDF,
};
