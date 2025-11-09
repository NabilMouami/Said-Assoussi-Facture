const express = require("express");

const router = express.Router();

const {
  createDevis,
  getDevis,
  getDevisById,
  updateDevis,
  deleteDevis,
  updateDevisStatus,
  convertToInvoice,
  generateDevisPDF,
} = require("../controllers/devisController");

router.post("/", createDevis);
router.get("/", getDevis);
router.get("/:id", getDevisById);
router.put("/:id", updateDevis);
router.delete("/:id", deleteDevis);
router.patch("/:id/status", updateDevisStatus);
router.post("/:id/convert-to-invoice", convertToInvoice);
router.get("/:id/pdf", generateDevisPDF);

module.exports = router;
