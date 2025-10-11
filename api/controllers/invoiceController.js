const Invoice = require("../models/invoice");
const InvoiceItem = require("../models/invoiceItem");
const Advancement = require("../models/Advancement");

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
      remainingAmount,
    } = req.body;

    // ✅ Validate customer name
    if (!customerName || customerName.trim() === "") {
      return res.status(400).json({ message: "Customer name is required" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "Invoice must have at least one item" });
    }

    // Generate invoice number automatically (last ID + 1)
    const invoiceNumber = await generateInvoiceNumber();

    // Calculate item totals
    const preparedItems = items.map((item) => {
      const totalPrice =
        item.quantity * item.v1 * item.v2 * item.v3 * item.unitPrice;
      return {
        ...item,
        totalPrice,
        articleName: item.articleName || item.product || "", // Handle both field names
      };
    });

    // Prepare advancements if provided
    const preparedAdvancements = advancements
      ? advancements.map((adv) => ({
          amount: adv.amount,
          paymentDate: adv.paymentDate || new Date(),
          paymentMethod: adv.paymentMethod || "espece",
          reference: adv.reference || "",
          notes: adv.notes || "",
        }))
      : [];

    // Create invoice with items
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
        remainingAmount: remainingAmount || 0,
        subTotal: 0, // Will be calculated
        total: 0, // Will be calculated
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

    // Calculate totals and update invoice
    await invoice.reload({
      include: [
        { model: InvoiceItem, as: "items" },
        { model: Advancement, as: "advancements" },
      ],
    });
    invoice.calculateTotals();
    await invoice.save();

    return res.status(201).json({
      message: "Invoice created successfully",
      invoice,
    });
  } catch (err) {
    console.error("Create invoice error:", err);

    // Handle duplicate invoice number (should rarely happen)
    if (err.name === "SequelizeUniqueConstraintError") {
      // If there's a conflict, use timestamp as fallback
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

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  addAdvancement,
};
