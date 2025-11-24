const BonLivraison = require("../models/bonLivraison");
const BonLivraisonItem = require("../models/bonLivraisonItem");
const Advancement = require("../models/Advancement");
const Invoice = require("../models/invoice");
const PDFDocument = require("pdfkit");

const getLastBonLivraisonId = async () => {
  try {
    const lastBonLivraison = await BonLivraison.findOne({
      order: [["id", "DESC"]],
      attributes: ["id"],
    });

    return lastBonLivraison ? lastBonLivraison.id : 0;
  } catch (error) {
    console.error("Error getting last delivery note ID:", error);
    return 0;
  }
};

const generateDeliveryNumber = async () => {
  const lastId = await getLastBonLivraisonId();
  const nextId = lastId + 1;
  return `BL-${nextId}`;
};

const createBonLivraison = async (req, res) => {
  console.log("🚀 CREATE BON LIVRAISON - START");
  console.log("📦 Request body:", JSON.stringify(req.body, null, 2));

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
      advancement,

      invoiceId,
      preparedBy,
      deliveredBy,
      receiverName,
      receiverSignature,
    } = req.body;

    console.log("✅ Validating required fields...");

    // Validate required fields
    if (!customerName || customerName.trim() === "") {
      console.log("❌ Validation failed: Customer name is required");
      return res.status(400).json({ message: "Customer name is required" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log("❌ Validation failed: Items are required");
      return res
        .status(400)
        .json({ message: "Delivery note must have at least one item" });
    }

    console.log("✅ All validations passed");

    // Generate delivery number
    console.log("🔢 Generating delivery number...");
    const deliveryNumber = await generateDeliveryNumber();
    console.log("📋 Generated delivery number:", deliveryNumber);

    // Calculate item totals
    console.log("🧮 Calculating item totals...");
    const preparedItems = items.map((item, index) => {
      const totalPrice =
        item.quantity * item.v1 * item.v2 * item.v3 * item.unitPrice;
      const deliveredQuantity = item.deliveredQuantity || item.quantity;

      console.log(`📦 Item ${index + 1}:`, {
        articleName: item.articleName,
        quantity: item.quantity,
        totalPrice: totalPrice,
      });

      return {
        ...item,
        totalPrice,
        deliveredQuantity,
        articleName: item.articleName || item.product || "",
      };
    });

    // Calculate totals
    console.log("💰 Calculating totals...");
    const calculatedSubTotal = preparedItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );
    const calculatedDiscount =
      discountType === "percentage"
        ? (calculatedSubTotal * discountValue) / 100
        : discountValue || 0;
    const calculatedTotal = Math.max(
      0,
      calculatedSubTotal - calculatedDiscount
    );

    // Calculate advancement
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

    console.log("📊 Final calculated values:", {
      subTotal: calculatedSubTotal,
      discount: calculatedDiscount,
      total: calculatedTotal,
      advancement: totalAdvancement,
      remainingAmount: calculatedRemainingAmount,
    });

    // Prepare advancements
    console.log("💳 Preparing advancements...");
    const preparedAdvancements = advancements
      ? advancements.map((adv) => ({
          amount: adv.amount,
          paymentDate: adv.paymentDate || new Date(),
          paymentMethod: adv.paymentMethod || "espece",
          reference: adv.reference || "",
          notes: adv.notes || "",
        }))
      : [];

    if (advancement && Number(advancement) > 0) {
      preparedAdvancements.push({
        amount: Number(advancement),
        paymentDate: new Date(),
        paymentMethod: paymentType || "espece",
        reference: "",
        notes: "Avancement initial automatique",
      });
    }

    console.log("🎯 Prepared data for creation:", {
      deliveryNumber,
      customerName: customerName.trim(),
      itemsCount: preparedItems.length,
      advancementsCount: preparedAdvancements.length,
    });

    // Create the delivery note
    console.log("🔄 Attempting to create BonLivraison...");
    const bonLivraison = await BonLivraison.create(
      {
        deliveryNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone || null,
        issueDate,
        notes,
        status: status || "brouillon",
        discountType: discountType || "fixed",
        discountValue: discountValue || 0,
        paymentType: paymentType || "non_paye",
        advancement: totalAdvancement,
        remainingAmount: calculatedRemainingAmount,
        subTotal: calculatedSubTotal,
        total: calculatedTotal,
        discountAmount: calculatedDiscount,
        invoiceId: invoiceId || null,
        preparedBy: preparedBy || null,
        deliveredBy: deliveredBy || null,
        receiverName: receiverName || null,
        receiverSignature: receiverSignature || null,
        items: preparedItems,
        advancements: preparedAdvancements,
      },
      {
        include: [
          { model: BonLivraisonItem, as: "items" },
          { model: Advancement, as: "advancements" },
        ],
      }
    );

    console.log("✅ BonLivraison created successfully! ID:", bonLivraison.id);
    console.log("📋 Delivery Number:", bonLivraison.deliveryNumber);

    return res.status(201).json({
      message: "Delivery note created successfully",
      bonLivraison,
    });
  } catch (err) {
    console.error("❌ CREATE BON LIVRAISON - ERROR:");
    console.error("❌ Error name:", err.name);
    console.error("❌ Error message:", err.message);
    console.error("❌ Error stack:", err.stack);

    if (err.errors) {
      console.error(
        "❌ Validation errors:",
        err.errors.map((e) => ({
          field: e.path,
          message: e.message,
          value: e.value,
        }))
      );
    }

    if (err.parent) {
      console.error("❌ Parent error:", err.parent);
    }

    // Handle specific error types
    if (err.name === "SequelizeUniqueConstraintError") {
      const fallbackDeliveryNumber = `BL-${Date.now()}`;
      return res.status(409).json({
        message: "Delivery number conflict, please try again",
        fallbackSuggestion: fallbackDeliveryNumber,
      });
    }

    if (err.name === "SequelizeValidationError") {
      const errors = err.errors.map((error) => error.message);
      return res.status(400).json({
        message: "Validation error",
        errors,
      });
    }

    if (err.name === "SequelizeDatabaseError") {
      return res.status(500).json({
        message: "Database error",
        error: err.message,
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  } finally {
    console.log("🏁 CREATE BON LIVRAISON - COMPLETED");
  }
};
const getBonLivraisons = async (req, res) => {
  try {
    const bonLivraisons = await BonLivraison.findAll({
      include: [
        { model: BonLivraisonItem, as: "items" },
        { model: Advancement, as: "advancements" },
      ],
      order: [["createdAt", "DESC"]],
    });
    return res.json(bonLivraisons);
  } catch (err) {
    console.error("Get delivery notes error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const getBonLivraisonById = async (req, res) => {
  try {
    const bonLivraison = await BonLivraison.findByPk(req.params.id, {
      include: [
        { model: BonLivraisonItem, as: "items" },
        { model: Advancement, as: "advancements" },
      ],
    });
    if (!bonLivraison) {
      return res.status(404).json({ message: "Delivery note not found" });
    }
    return res.json(bonLivraison);
  } catch (err) {
    console.error("Get delivery note error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const updateBonLivraison = async (req, res) => {
  try {
    const bonLivraison = await BonLivraison.findByPk(req.params.id, {
      include: [
        { model: BonLivraisonItem, as: "items" },
        { model: Advancement, as: "advancements" },
      ],
    });
    if (!bonLivraison) {
      return res.status(404).json({ message: "Delivery note not found" });
    }

    const {
      deliveryNumber,
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
      receiverName,
      receiverSignature,
    } = req.body;

    console.log("Updating delivery note with data:", {
      status: status,
      currentStatus: bonLivraison.status,
    });

    // Update basic fields EXCEPT status for now
    const updateFields = {
      deliveryNumber,
      customerName,
      customerPhone,
      issueDate,
      notes,
      discountType,
      discountValue,
      paymentType,
      remainingAmount,
      receiverName,
      receiverSignature,
    };

    Object.keys(updateFields).forEach((key) => {
      if (updateFields[key] !== undefined) {
        bonLivraison[key] = updateFields[key];
      }
    });

    // Handle status update separately
    if (status !== undefined) {
      console.log("Setting status from:", bonLivraison.status, "to:", status);
      bonLivraison.status = status;
    }

    console.log("Delivery note after field assignment, before save:", {
      status: bonLivraison.status,
      customerName: bonLivraison.customerName,
    });

    // Save the delivery note first
    await bonLivraison.save();
    console.log(
      "Delivery note saved successfully, status is:",
      bonLivraison.status
    );

    // Update items if provided
    if (items && Array.isArray(items)) {
      console.log("Updating items...");

      await BonLivraisonItem.destroy({
        where: { bonLivraisonId: bonLivraison.id },
      });

      const newItems = items.map((item) => {
        const totalPrice =
          item.quantity * item.v1 * item.v2 * item.v3 * item.unitPrice;
        const deliveredQuantity = item.deliveredQuantity || item.quantity;

        return {
          ...item,
          totalPrice,
          deliveredQuantity,
          bonLivraisonId: bonLivraison.id,
          articleName: item.articleName || "",
        };
      });

      await BonLivraisonItem.bulkCreate(newItems);
    }

    // Update advancements if provided
    if (advancements && Array.isArray(advancements)) {
      await Advancement.destroy({ where: { bonLivraisonId: bonLivraison.id } });

      const newAdvancements = advancements.map((adv) => ({
        amount: adv.amount,
        paymentDate: adv.paymentDate || new Date(),
        paymentMethod: adv.paymentMethod || "espece",
        reference: adv.reference || "",
        notes: adv.notes || "",
        bonLivraisonId: bonLivraison.id,
      }));

      await Advancement.bulkCreate(newAdvancements);
    }

    // Reload and recalculate totals WITHOUT overwriting status
    await bonLivraison.reload({
      include: [
        { model: BonLivraisonItem, as: "items" },
        { model: Advancement, as: "advancements" },
      ],
    });

    // Store current status before calculations
    const currentStatus = bonLivraison.status;
    bonLivraison.calculateTotals();
    bonLivraison.status = currentStatus; // Restore status after calculations
    await bonLivraison.save();

    // Return the updated delivery note
    return res.json({
      message: "Delivery note updated successfully",
      bonLivraison,
    });
  } catch (err) {
    console.error("Update delivery note error:", err);

    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: "Delivery number already exists",
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
const deleteBonLivraison = async (req, res) => {
  try {
    const bonLivraison = await BonLivraison.findByPk(req.params.id);
    if (!bonLivraison) {
      return res.status(404).json({ message: "Delivery note not found" });
    }

    await bonLivraison.destroy();
    return res.json({ message: "Delivery note deleted successfully" });
  } catch (err) {
    console.error("Delete delivery note error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const addAdvancementToBonLivraison = async (req, res) => {
  try {
    const { bonLivraisonId } = req.params;
    const { amount, paymentDate, paymentMethod, reference, notes } = req.body;

    const bonLivraison = await BonLivraison.findByPk(bonLivraisonId);
    if (!bonLivraison) {
      return res.status(404).json({ message: "Delivery note not found" });
    }

    const advancement = await Advancement.create({
      amount,
      paymentDate: paymentDate || new Date(),
      paymentMethod: paymentMethod || "espece",
      reference: reference || "",
      notes: notes || "",
      bonLivraisonId: bonLivraison.id,
    });

    // Recalculate totals
    await bonLivraison.reload({
      include: [
        { model: BonLivraisonItem, as: "items" },
        { model: Advancement, as: "advancements" },
      ],
    });
    bonLivraison.calculateTotals();
    await bonLivraison.save();

    return res.json({
      message: "Advancement added successfully to delivery note",
      advancement,
      bonLivraison,
    });
  } catch (err) {
    console.error("Add advancement to delivery note error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const generateBonLivraisonPDF = async (req, res) => {
  try {
    const bonLivraison = await BonLivraison.findByPk(req.params.id, {
      include: [
        { model: BonLivraisonItem, as: "items" },
        { model: Advancement, as: "advancements" },
        { model: Invoice, as: "invoice" },
      ],
    });

    if (!bonLivraison) {
      return res.status(404).json({ message: "Delivery note not found" });
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=bon-livraison-${bonLivraison.deliveryNumber}.pdf`
    );

    doc.pipe(res);

    // ===== HEADER =====
    doc.rect(0, 0, doc.page.width, 100).fill("#28a745"); // green header for delivery note
    doc
      .fillColor("white")
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("BON DE LIVRAISON", 50, 40);
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`N°: ${bonLivraison.deliveryNumber}`, 450, 40)
      .text(
        `Date d'émission: ${new Date(bonLivraison.issueDate).toLocaleDateString(
          "fr-FR"
        )}`,
        450,
        60
      )
      .text(
        `Date de livraison: ${new Date(
          bonLivraison.deliveryDate
        ).toLocaleDateString("fr-FR")}`,
        450,
        80
      );

    doc.moveDown(3);

    // ===== CLIENT INFO =====
    doc
      .fillColor("#333")
      .font("Helvetica-Bold")
      .fontSize(14)
      .text("Informations du client", 50, 130);
    doc.moveTo(50, 145).lineTo(550, 145).strokeColor("#28a745").stroke();

    doc
      .font("Helvetica")
      .fontSize(12)
      .text(`Nom du client : ${bonLivraison.customerName}`, 50, 160)
      .text(`Téléphone : ${bonLivraison.customerPhone || "—"}`, 50, 180);

    doc.moveDown(2);

    // ===== ITEMS TABLE =====
    const tableTop = bonLivraison.deliveryAddress ? 280 : 220;
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#28a745")
      .text("Article", 50, tableTop)
      .text("Quantité", 200, tableTop)
      .text("Livrée", 280, tableTop)
      .text("Prix Unitaire", 350, tableTop)
      .text("Total", 470, tableTop);
    doc
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .strokeColor("#ccc")
      .stroke();

    let yPosition = tableTop + 25;
    doc.font("Helvetica").fontSize(12).fillColor("#000");

    bonLivraison.items.forEach((item, i) => {
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }
      doc.text(item.articleName || `Article ${i + 1}`, 50, yPosition);
      doc.text(item.quantity.toString(), 220, yPosition);
      doc.text(
        (item.deliveredQuantity || item.quantity).toString(),
        300,
        yPosition
      );
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
      .text(`${bonLivraison.subTotal} DH`, 470, yPosition, { align: "right" });

    if (bonLivraison.discountValue > 0) {
      yPosition += 20;
      const discountText =
        bonLivraison.discountType === "percentage"
          ? `Remise (${bonLivraison.discountValue}%):`
          : "Remise:";
      doc
        .text(discountText, 350, yPosition)
        .text(`-${bonLivraison.discountAmount} DH`, 470, yPosition, {
          align: "right",
        });
    }

    yPosition += 25;
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#28a745")
      .text(`Total TTC:`, 350, yPosition)
      .text(`${bonLivraison.total} DH`, 470, yPosition, { align: "right" });

    // ===== ADVANCEMENTS =====
    if (bonLivraison.advancements && bonLivraison.advancements.length > 0) {
      yPosition += 40;
      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .fillColor("#333")
        .text("Acomptes:", 50, yPosition);
      yPosition += 20;

      doc.font("Helvetica").fontSize(12);
      bonLivraison.advancements.forEach((a) => {
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
        .text(
          `Montant restant: ${bonLivraison.remainingAmount} DH`,
          50,
          yPosition
        );
    }

    // ===== DELIVERY INFORMATION =====
    yPosition += 40;
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#333")
      .text("Informations de livraison:", 50, yPosition);

    yPosition += 20;
    doc.font("Helvetica").fontSize(12);

    // ===== NOTES =====
    if (bonLivraison.notes) {
      yPosition += 30;
      doc
        .font("Helvetica-Bold")
        .fillColor("#333")
        .text("Notes:", 50, yPosition);
      yPosition += 15;
      doc
        .font("Helvetica")
        .fillColor("#000")
        .text(bonLivraison.notes, 50, yPosition, { width: 500 });
    }

    // ===== SIGNATURE =====
    if (bonLivraison.receiverSignature) {
      yPosition += 50;
      doc.font("Helvetica-Bold").text("Signature du client:", 50, yPosition);

      // You could add signature image handling here if needed
      doc
        .font("Helvetica")
        .fontSize(10)
        .text("(Signature ci-dessus)", 50, yPosition + 40);
    }

    doc.end();
  } catch (err) {
    console.error("Generate delivery note PDF error:", err);
    return res.status(500).json({
      message: "Error generating PDF",
      error: err.message,
    });
  }
};

module.exports = {
  createBonLivraison,
  getBonLivraisons,
  getBonLivraisonById,
  updateBonLivraison,
  deleteBonLivraison,
  addAdvancementToBonLivraison,
  generateBonLivraisonPDF,
};
