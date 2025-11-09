const express = require("express");
const router = express.Router();
const {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  addAdvancement,
  generateInvoicePDF, // Add this import
} = require("../controllers/invoiceController");

router.post("/", createInvoice);
router.get("/", getInvoices);
router.get("/:id", getInvoiceById);
router.put("/:id", updateInvoice);
router.delete("/:id", deleteInvoice);
router.post("/:invoiceId/advancements", addAdvancement);
router.get("/:id/pdf", generateInvoicePDF); // Add this route
module.exports = router;
