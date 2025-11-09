const { Devis, DevisItem } = require("../models");
const Invoice = require("../models/invoice");
const InvoiceItem = require("../models/invoiceItem");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const getLastDevisId = async () => {
  try {
    const lastDevis = await Devis.findOne({
      order: [["id", "DESC"]],
      attributes: ["id"],
    });

    return lastDevis ? lastDevis.id : 0;
  } catch (error) {
    console.error("Error getting last devis ID:", error);
    return 0;
  }
};

const generateDevisNumber = async () => {
  const lastId = await getLastDevisId();
  const nextId = lastId + 1;
  return `DEV-${nextId}`;
};

const createDevis = async (req, res) => {
  console.log("Devis Data:", req.body);
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
      validityDate,
    } = req.body;

    // ✅ Validate customer name
    if (!customerName || customerName.trim() === "") {
      return res.status(400).json({ message: "Customer name is required" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "Devis must have at least one item" });
    }

    // Generate devis number automatically
    const devisNumber = await generateDevisNumber();

    // Calculate item totals
    const preparedItems = items.map((item) => {
      const totalPrice =
        item.quantity * item.v1 * item.v2 * item.v3 * item.unitPrice;
      return {
        ...item,
        totalPrice,
        articleName: item.articleName || item.product || "",
      };
    });

    // Create devis with items
    const devis = await Devis.create(
      {
        devisNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone || null,
        issueDate,
        notes,
        validityDate: validityDate || null,
        status: status || "brouillon",
        discountType: discountType || "fixed",
        discountValue: discountValue || 0,
        subTotal: 0, // Will be calculated
        total: 0, // Will be calculated
        items: preparedItems,
      },
      {
        include: [{ model: DevisItem, as: "items" }],
      }
    );

    // Calculate totals and update devis
    await devis.reload({
      include: [{ model: DevisItem, as: "items" }],
    });
    devis.calculateTotals();
    await devis.save();

    return res.status(201).json({
      message: "Devis created successfully",
      devis,
    });
  } catch (err) {
    console.error("Create devis error:", err);

    // Handle duplicate devis number
    if (err.name === "SequelizeUniqueConstraintError") {
      const fallbackDevisNumber = `DEV-${Date.now()}`;
      return res.status(409).json({
        message: "Devis number conflict, please try again",
        fallbackSuggestion: fallbackDevisNumber,
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

const getDevis = async (req, res) => {
  try {
    const devis = await Devis.findAll({
      attributes: {
        exclude: ["pdfPath", "pdfUploadedAt"], // Temporarily exclude these fields
      },
      include: [{ model: DevisItem, as: "items" }],
      order: [["createdAt", "DESC"]],
    });
    return res.json(devis);
  } catch (err) {
    console.error("Get devis error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const getDevisById = async (req, res) => {
  try {
    const devis = await Devis.findByPk(req.params.id, {
      include: [{ model: DevisItem, as: "items" }],
    });
    if (!devis) return res.status(404).json({ message: "Devis not found" });
    return res.json(devis);
  } catch (err) {
    console.error("Get devis error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
const updateDevis = async (req, res) => {
  try {
    const devis = await Devis.findByPk(req.params.id, {
      include: [{ model: DevisItem, as: "items" }],
    });
    if (!devis) return res.status(404).json({ message: "Devis not found" });

    const {
      devisNumber,
      customerName,
      customerPhone,
      issueDate,
      notes,
      items,
      status,
      discountType,
      discountValue,
      validityDate,
    } = req.body;

    console.log("Update devis request body:", req.body);
    console.log("Items received:", items);

    // Update devis fields
    if (devisNumber !== undefined) devis.devisNumber = devisNumber;
    if (customerName !== undefined) devis.customerName = customerName;
    if (customerPhone !== undefined) devis.customerPhone = customerPhone;
    if (issueDate !== undefined) devis.issueDate = issueDate;
    if (notes !== undefined) devis.notes = notes;
    if (validityDate !== undefined) devis.validityDate = validityDate;
    if (status !== undefined) devis.status = status;
    if (discountType !== undefined) devis.discountType = discountType;
    if (discountValue !== undefined) devis.discountValue = discountValue;

    // Save the devis first to update basic fields
    await devis.save();

    // Replace items if provided
    if (items && Array.isArray(items)) {
      console.log("Processing items update...");

      // Destroy existing items
      await DevisItem.destroy({ where: { devisId: devis.id } });

      // Prepare new items - handle both existing items (with id) and new items (without id)
      const newItems = items.map((item) => {
        // Calculate total price
        const totalPrice =
          (item.quantity || 1) *
          (item.v1 || 1) *
          (item.v2 || 1) *
          (item.v3 || 1) *
          (item.unitPrice || 0);

        console.log(`Item ${item.articleName}:`, {
          quantity: item.quantity,
          v1: item.v1,
          v2: item.v2,
          v3: item.v3,
          unitPrice: item.unitPrice,
          totalPrice: totalPrice,
        });

        return {
          articleName: item.articleName || "Nouvel article",
          quantity: parseFloat(item.quantity) || 1,
          v1: parseFloat(item.v1) || 1,
          v2: parseFloat(item.v2) || 1,
          v3: parseFloat(item.v3) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
          totalPrice: totalPrice,
          devisId: devis.id,
        };
      });

      console.log("Creating new items:", newItems);

      // Create new items
      const createdItems = await DevisItem.bulkCreate(newItems);
      console.log("Items created successfully:", createdItems.length);
    }

    // Reload and recalculate totals
    await devis.reload({
      include: [{ model: DevisItem, as: "items" }],
    });

    console.log("Devis after reload:", {
      id: devis.id,
      itemsCount: devis.items ? devis.items.length : 0,
      items: devis.items,
    });

    devis.calculateTotals();
    await devis.save();

    console.log("Devis totals calculated:", {
      subTotal: devis.subTotal,
      total: devis.total,
      discountAmount: devis.discountAmount,
    });

    return res.json({
      message: "Devis updated successfully",
      devis,
    });
  } catch (err) {
    console.error("Update devis error:", err);

    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: "Devis number already exists",
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

const updateDevisStatus = async (req, res) => {
  try {
    const devis = await Devis.findByPk(req.params.id);
    if (!devis) return res.status(404).json({ message: "Devis not found" });

    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    devis.status = status;
    await devis.save();

    return res.json({
      message: "Devis status updated successfully",
      devis,
    });
  } catch (err) {
    console.error("Update devis status error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const convertToInvoice = async (req, res) => {
  try {
    const devis = await Devis.findByPk(req.params.id, {
      include: [{ model: DevisItem, as: "items" }],
    });
    if (!devis) return res.status(404).json({ message: "Devis not found" });

    // Check if devis is already converted
    if (devis.convertedToInvoice) {
      return res.status(400).json({
        message: "Devis already converted to invoice",
        invoiceId: devis.convertedInvoiceId,
      });
    }

    // Get last invoice ID for number generation
    const getLastInvoiceId = async () => {
      const lastInvoice = await Invoice.findOne({
        order: [["id", "DESC"]],
        attributes: ["id"],
      });
      return lastInvoice ? lastInvoice.id : 0;
    };

    const generateInvoiceNumber = async () => {
      const lastId = await getLastInvoiceId();
      const nextId = lastId + 1;
      return `FACT-${nextId}`;
    };

    const invoiceNumber = await generateInvoiceNumber();

    // Prepare invoice data from devis
    const invoiceData = {
      invoiceNumber,
      customerName: devis.customerName,
      customerPhone: devis.customerPhone,
      issueDate: new Date(),
      notes: `Converti depuis le devis: ${devis.devisNumber}\n${
        devis.notes || ""
      }`,
      items: devis.items.map((item) => ({
        articleName: item.articleName,
        quantity: item.quantity,
        v1: item.v1,
        v2: item.v2,
        v3: item.v3,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      status: "brouillon",
      discountType: devis.discountType,
      discountValue: devis.discountValue,
      subTotal: devis.subTotal,
      total: devis.total,
      discountAmount: devis.discountAmount,
      paymentType: "non_paye",
      remainingAmount: devis.total,
    };

    // Create the invoice
    const invoice = await Invoice.create(
      {
        ...invoiceData,
        items: invoiceData.items,
      },
      {
        include: [{ model: InvoiceItem, as: "items" }],
      }
    );

    // Update devis to mark it as converted
    devis.convertedToInvoice = true;
    devis.convertedInvoiceId = invoice.id;
    devis.status = "transformé_facture";
    await devis.save();

    return res.json({
      message: "Devis converted to invoice successfully",
      devis,
      invoice,
    });
  } catch (err) {
    console.error("Convert devis to invoice error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const getDevisPDF = async (req, res) => {
  try {
    const devis = await Devis.findByPk(req.params.id, {
      include: [{ model: DevisItem, as: "items" }],
    });
    if (!devis) return res.status(404).json({ message: "Devis not found" });

    // For now, return JSON data - you can integrate PDF generation later
    return res.json({
      message: "PDF endpoint - integrate PDF generation here",
      devis,
    });
  } catch (err) {
    console.error("Get devis PDF error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const deleteDevis = async (req, res) => {
  try {
    const devis = await Devis.findByPk(req.params.id);
    if (!devis) return res.status(404).json({ message: "Devis not found" });

    await devis.destroy();
    return res.json({ message: "Devis deleted successfully" });
  } catch (err) {
    console.error("Delete devis error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const uploadDevisPDF = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "No PDF file uploaded" });
    }

    const devis = await Devis.findByPk(id);
    if (!devis) {
      // Delete the uploaded file if devis not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Devis not found" });
    }

    // Delete old PDF if exists
    if (devis.pdfPath && fs.existsSync(devis.pdfPath)) {
      fs.unlinkSync(devis.pdfPath);
    }

    // Update devis with PDF path
    devis.pdfPath = req.file.path;
    devis.pdfUploadedAt = new Date();
    await devis.save();

    return res.json({
      message: "PDF uploaded successfully",
      pdfPath: req.file.path,
      filename: req.file.filename,
    });
  } catch (err) {
    console.error("Upload PDF error:", err);

    // Delete the uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      message: "Server error during PDF upload",
      error: err.message,
    });
  }
};
const generateDevisPDF = async (req, res) => {
  try {
    const { id } = req.params;

    const devis = await Devis.findByPk(id, {
      include: [{ model: DevisItem, as: "items" }],
    });

    if (!devis) {
      return res.status(404).json({ message: "Devis not found" });
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=devis-${devis.devisNumber}.pdf`
    );

    doc.pipe(res);

    // ===== HEADER =====
    doc.rect(0, 0, doc.page.width, 100).fill("#1a73e8");
    doc
      .fillColor("white")
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("DEVIS", 50, 40);
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`N°: ${devis.devisNumber}`, 450, 40)
      .text(
        `Date: ${
          devis.issueDate
            ? new Date(devis.issueDate).toLocaleDateString("fr-FR")
            : "-"
        }`,
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
      .text(`Nom du client : ${devis.customerName}`, 50, 160)
      .text(`Téléphone : ${devis.customerPhone || "—"}`, 50, 180);

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

    let subTotal = 0;

    devis.items.forEach((item, i) => {
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }

      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const total = qty * price;
      subTotal += total;

      doc.text(item.articleName || `Article ${i + 1}`, 50, yPosition);
      doc.text(qty.toString(), 270, yPosition);
      doc.text(`${price.toFixed(2)} DH`, 370, yPosition);
      doc.text(`${total.toFixed(2)} DH`, 470, yPosition);
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
      .fontSize(12)
      .text("Sous-total:", 350, yPosition)
      .text(`${subTotal.toFixed(2)} DH`, 470, yPosition, { align: "right" });

    // ---- Remise ----
    let remise = 0;
    const discountValue = Number(devis.discountValue) || 0;
    const discountType = devis.discountType || "amount";

    if (discountValue > 0) {
      if (discountType === "percentage") {
        remise = (subTotal * discountValue) / 100;
      } else {
        remise = discountValue;
      }

      yPosition += 20;
      const discountText =
        discountType === "percentage"
          ? `Remise (${discountValue}%):`
          : "Remise:";
      doc
        .text(discountText, 350, yPosition)
        .text(`-${remise.toFixed(2)} DH`, 470, yPosition, {
          align: "right",
        });
    }

    // ---- Total After Remise ----
    const totalAfterRemise = subTotal - remise;
    yPosition += 25;
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#1a73e8")
      .text("Total à payer:", 350, yPosition)
      .text(`${totalAfterRemise.toFixed(2)} DH`, 470, yPosition, {
        align: "right",
      });

    // ===== VALIDITY =====
    yPosition += 40;
    doc
      .font("Helvetica-Bold")
      .fillColor("#333")
      .text("Validité du devis :", 50, yPosition);
    doc
      .font("Helvetica")
      .fillColor("#000")
      .text(
        devis.validUntil
          ? `Ce devis est valable jusqu’au ${new Date(
              devis.validUntil
            ).toLocaleDateString("fr-FR")}.`
          : "Date de validité non spécifiée.",
        50,
        yPosition + 20
      );

    // ===== NOTES =====
    if (devis.notes) {
      yPosition += 60;
      doc
        .font("Helvetica-Bold")
        .fillColor("#333")
        .text("Notes:", 50, yPosition);
      yPosition += 15;
      doc
        .font("Helvetica")
        .fillColor("#000")
        .text(devis.notes, 50, yPosition, { width: 500 });
    }

    doc.end();
  } catch (err) {
    console.error("Generate Devis PDF error:", err);
    return res.status(500).json({
      message: "Error generating Devis PDF",
      error: err.message,
    });
  }
};

module.exports = {
  createDevis,
  getDevis,
  getDevisById,
  updateDevis,
  deleteDevis,
  updateDevisStatus,
  convertToInvoice,
  getDevisPDF,
  uploadDevisPDF,
  generateDevisPDF,
};
