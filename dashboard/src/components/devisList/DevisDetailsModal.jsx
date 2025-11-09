import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Badge,
  Button,
} from "reactstrap";
import {
  FiX,
  FiPrinter,
  FiDownload,
  FiSave,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import DatePicker from "react-datepicker";
import axios from "axios";
import { config_url } from "@/utils/config";
import topTost from "@/utils/topTost";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
// Devis status options (specific for quotes)
const statusOptions = [
  { value: "brouillon", label: "Brouillon" },
  { value: "envoyé", label: "Envoyé au client" },
  { value: "en_attente", label: "En Attente de réponse" },
  { value: "accepté", label: "Accepté par le client" },
  { value: "refusé", label: "Refusé" },
  { value: "expiré", label: "Expiré" },
  { value: "transformé_facture", label: "Transformé en Facture" },
];

const DevisDetailsModal = ({ isOpen, toggle, devis, onUpdate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    issueDate: new Date(),
    notes: "",
    status: "brouillon",
    discountType: "fixed",
    discountValue: 0,
    items: [],
  });

  // Initialize form data when devis changes
  useEffect(() => {
    if (devis) {
      console.log("Initializing form with devis:", devis);
      setFormData({
        customerName: devis.customerName || "",
        customerPhone: devis.customerPhone || "",
        issueDate: devis.issueDate ? new Date(devis.issueDate) : new Date(),
        validityDate: devis.validityDate ? new Date(devis.validityDate) : null,
        notes: devis.notes || "",
        status: devis.status || "brouillon",
        discountType: devis.discountType || "fixed",
        discountValue: parseFloat(devis.discountValue) || 0,
        items: devis.items
          ? devis.items.map((item) => ({
              id: item.id,
              articleName: item.articleName,
              quantity: parseFloat(item.quantity) || 1,
              v1: parseFloat(item.v1) || 1,
              v2: parseFloat(item.v2) || 1,
              v3: parseFloat(item.v3) || 1,
              unitPrice: parseFloat(item.unitPrice) || 1,
              totalPrice: parseFloat(item.totalPrice) || 1,
            }))
          : [],
      });
    }
  }, [devis]);

  if (!devis) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case "brouillon":
        return "warning";
      case "envoyé":
        return "info";
      case "accepté":
        return "success";
      case "refusé":
        return "danger";
      case "en_attente":
        return "primary";
      case "expiré":
        return "secondary";
      case "transformé_facture":
        return "dark";
      default:
        return "secondary";
    }
  };

  // Calculate item total
  const calculateItemTotal = (item) => {
    return item.quantity * item.v1 * item.v2 * item.v3 * item.unitPrice;
  };

  // Calculate all totals
  const subTotal = formData.items.reduce(
    (sum, item) => sum + calculateItemTotal(item),
    0
  );

  const calculateDiscount = () => {
    if (formData.discountType === "percentage") {
      return (subTotal * formData.discountValue) / 100;
    } else {
      return formData.discountValue;
    }
  };

  const discount = calculateDiscount();
  const total = Math.max(0, subTotal - discount);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === "articleName" ? value : parseFloat(value) || 0,
    };

    if (["quantity", "v1", "v2", "v3", "unitPrice"].includes(field)) {
      updatedItems[index].totalPrice = calculateItemTotal(updatedItems[index]);
    }

    setFormData((prev) => ({
      ...prev,
      items: updatedItems,
    }));
  };

  const addItem = () => {
    const newItem = {
      id: Date.now(),
      articleName: "",
      quantity: 1,
      v1: 1,
      v2: 1,
      v3: 1,
      unitPrice: 1,
      totalPrice: 1,
    };
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const removeItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      items: updatedItems,
    }));
  };

  const handleSubmit = async () => {
    console.log("Current form data before submit:", formData);

    // Validate customer name
    if (!formData.customerName.trim()) {
      topTost("Le nom du client est requis", "error");
      return;
    }

    // Validate items
    if (!formData.items || formData.items.length === 0) {
      topTost("Le devis doit avoir au moins un article", "error");
      return;
    }

    // Validate all items have names
    const emptyArticleNames = formData.items.filter(
      (item) => !item.articleName.trim()
    );
    if (emptyArticleNames.length > 0) {
      topTost("Tous les articles doivent avoir un nom", "error");
      return;
    }

    // Regular update (conversion is handled separately by status change)
    setIsSubmitting(true);

    try {
      // Prepare the data for backend - ensure all item fields are properly formatted
      const updateData = {
        devisNumber: devis.devisNumber,
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        issueDate: formData.issueDate.toISOString().split("T")[0],
        validityDate: formData.validityDate
          ? formData.validityDate.toISOString().split("T")[0]
          : null,
        notes: formData.notes,
        status: formData.status,
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        items: formData.items.map((item) => ({
          // Don't send temporary IDs to backend
          articleName: item.articleName.trim(),
          quantity: parseFloat(item.quantity) || 1,
          v1: parseFloat(item.v1) || 1,
          v2: parseFloat(item.v2) || 1,
          v3: parseFloat(item.v3) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
          // totalPrice will be calculated by backend
        })),
      };

      console.log("Sending update data to backend:", updateData);

      const response = await axios.put(
        `${config_url}/api/devis/${devis.id}`,
        updateData
      );

      console.log("Update response from backend:", response.data);

      topTost("Devis mis à jour avec succès!", "success");

      if (onUpdate) {
        onUpdate(response.data.devis);
      }

      toggle();
    } catch (error) {
      console.error("Error updating devis:", error);
      console.error("Error response data:", error.response?.data);

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0] ||
        "Erreur lors de la mise à jour du devis. Veuillez réessayer.";
      topTost(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === "transformé_facture" && !devis.convertedToInvoice) {
      // Check if devis is already converted
      if (devis.convertedToInvoice) {
        topTost("Ce devis a déjà été transformé en facture", "warning");
        setFormData((prev) => ({ ...prev, status: devis.status }));
        return;
      }

      // Check if devis is accepted before converting
      if (devis.status !== "accepté") {
        const confirmConvert = window.confirm(
          "Seuls les devis acceptés peuvent être transformés en facture. Voulez-vous continuer et convertir ce devis en facture ?"
        );
        if (!confirmConvert) {
          setFormData((prev) => ({ ...prev, status: devis.status }));
          return;
        }
      }

      // Convert to invoice immediately
      await convertToInvoice();
    } else {
      // For other status changes, just update the form
      handleInputChange("status", newStatus);
    }
  };

  const convertToInvoice = async () => {
    try {
      setIsSubmitting(true);
      const response = await axios.post(
        `${config_url}/api/devis/${devis.id}/convert-to-invoice`
      );

      topTost("Devis converti en facture avec succès!", "success");

      if (onUpdate) {
        onUpdate(response.data.devis);
      }

      toggle();
    } catch (error) {
      console.error("Error converting devis to invoice:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Erreur lors de la conversion en facture";
      topTost(errorMessage, "error");

      // Reset status on error
      setFormData((prev) => ({ ...prev, status: devis.status }));
    } finally {
      setIsSubmitting(false);
    }
  };
  const handlePrint = () => {
    if (!devis) return;

    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      return d.toLocaleDateString("fr-FR");
    };

    // Add the missing calculations
    const subTotal = formData.items.reduce(
      (sum, item) =>
        sum + item.quantity * item.v1 * item.v2 * item.v3 * item.unitPrice,
      0
    );

    const calculateDiscount = () => {
      if (formData.discountType === "percentage") {
        return (subTotal * formData.discountValue) / 100;
      } else {
        return formData.discountValue;
      }
    };

    const discount = calculateDiscount();
    const total = Math.max(0, subTotal - discount);

    // Create a print-friendly version
    const printWindow = window.open("", "_blank");
    const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Devis ${devis.devisNumber}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          margin: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        .company-info, .devis-info {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .info-block {
          flex: 1;
          min-width: 220px;
        }
        .info-block p {
          margin: 3px 0;
        }
   .table {
  width: 100%;
  border-collapse: collapse;
  margin: 15px 0;
  table-layout: fixed;
}
.table th, .table td {
  border: 1px solid #ddd;
  padding: 6px;
  text-align: left;
  word-wrap: break-word;
  white-space: normal;
  vertical-align: top;
}
.table th {
  background-color: #f5f5f5;
}
.table td:first-child {
  width: 30%;
}

        .totals {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          margin-top: 20px;
        }
        .totals p {
          margin: 2px 0;
        }
        .notes {
          margin-top: 20px;
        }
        .footer {
          margin-top: 40px;
          border-top: 1px solid #333;
          padding-top: 15px;
          text-align: center;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2 style="margin: 0;">DEVIS</h2>
      </div>

      <div class="company-info">
        <div class="info-block">
          <p><strong>Fer-Aluminium-Inox</strong></p>
          <p>Assoussi</p>
          <p>Tél: +212 661-431237</p>
        </div>
        <div class="info-block" style="text-align:right;">
          <p><strong>Devis N°:</strong> ${devis.devisNumber}</p>
          <p><strong>Date:</strong> ${formatDate(formData.issueDate)}</p>
        </div>
      </div>

      <div class="devis-info">
        <div class="info-block">
          <p><strong>Client:</strong> ${formData.customerName}</p>
          <p><strong>Téléphone:</strong> ${
            formData.customerPhone || "Non spécifié"
          }</p>
        </div>
  
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Article</th>
            <th>Qté</th>
            <th>Long.</th>
            <th>Larg.</th>
            <th>Haut.</th>
            <th>Prix U.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${formData.items
            .map(
              (item) => `
            <tr>
              <td>${item.articleName}</td>
              <td>${parseFloat(item.quantity).toFixed(2)}</td>
              <td>${parseFloat(item.v1).toFixed(2)}</td>
              <td>${parseFloat(item.v2).toFixed(2)}</td>
              <td>${parseFloat(item.v3).toFixed(2)}</td>
              <td>${parseFloat(item.unitPrice).toFixed(2)} Dh</td>
              <td>${parseFloat(item.totalPrice).toFixed(2)} Dh</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>

      <div class="totals">
        <p><strong>Sous-total:</strong> ${subTotal.toFixed(2)} Dh</p>
        ${
          discount > 0
            ? `<p><strong>Remise:</strong> -${discount.toFixed(2)} Dh</p>`
            : ""
        }
        <p><strong>Total estimé:</strong> ${total.toFixed(2)} Dh</p>
      </div>

      <div class="footer">
        <p>Signature et cachet</p>
        <p>_________________________</p>
      </div>
    </body>
    </html>
  `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };
  // Handle PDF upload
  // Download PDF with debugging

  // Add this function to generate and download PDF
  const generateAndDownloadPDF = async () => {
    try {
      // Create a temporary container for the PDF content
      const pdfContainer = document.createElement("div");
      pdfContainer.id = "pdf-container";
      pdfContainer.style.width = "210mm"; // A4 width
      pdfContainer.style.minHeight = "297mm";
      pdfContainer.style.padding = "15mm 20mm";
      pdfContainer.style.background = "white";
      pdfContainer.style.color = "#000";
      pdfContainer.style.fontFamily = "Arial, sans-serif";
      pdfContainer.style.fontSize = "11px";
      pdfContainer.style.lineHeight = "1.5";
      pdfContainer.style.position = "absolute";
      pdfContainer.style.left = "-9999px";
      pdfContainer.style.top = "0";

      // Format date helper
      const formatDate = (date) => {
        if (!date) return "";
        return new Date(date).toLocaleDateString("fr-FR");
      };

      // Build PDF HTML
      pdfContainer.innerHTML = `
      <div style="text-align:center; border-bottom:2px solid #333; padding-bottom:10px; margin-bottom:15px;">
        <h1 style="margin:0; color:#2c5aa0;">DEVIS</h1>
        <h3 style="margin:5px 0;">Fer-Aluminium-Inox - Assoussi</h3>
        <p style="font-size:10px;">Tél: +212 661-431237 </p>
      </div>

      <div style="display:flex; justify-content:space-between">
        <div>
          <h4 style="margin-bottom:5px;">Client</h4>
          <p><strong>Nom:</strong> ${formData.customerName}</p>
          <p><strong>Téléphone:</strong> ${
            formData.customerPhone || "Non spécifié"
          }</p>
        </div>
        <div>
          <h4 style="margin-bottom:5px;">Devis</h4>
          <p><strong>N°:</strong> ${devis.devisNumber}</p>
          <p><strong>Date:</strong> ${formatDate(formData.issueDate)}</p>
          <p><strong>Statut:</strong> ${
            statusOptions.find((opt) => opt.value === formData.status)?.label ||
            formData.status
          }</p>
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:15px;">
        <thead>
          <tr style="background-color:#2c5aa0; color:#fff;">
            <th style="padding:6px; border:1px solid #2c5aa0;">Article</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Qty</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">L</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">l</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">H</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">P.U</th>
            <th style="padding:6px; border:1px solid #2c5aa0;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${formData.items
            .map(
              (item, i) => `
              <tr style="${i % 2 === 0 ? "background:#f9f9f9;" : ""}">
                <td style="border:1px solid #ddd; padding:5px;">${
                  item.articleName
                }</td>
                <td style="border:1px solid #ddd; text-align:center;">${
                  item.quantity
                }</td>
                <td style="border:1px solid #ddd; text-align:center;">${
                  item.v1
                }</td>
                <td style="border:1px solid #ddd; text-align:center;">${
                  item.v2
                }</td>
                <td style="border:1px solid #ddd; text-align:center;">${
                  item.v3
                }</td>
                <td style="border:1px solid #ddd; text-align:right;">${item.unitPrice.toFixed(
                  2
                )} Dh</td>
                <td style="border:1px solid #ddd; text-align:right;">${item.totalPrice.toFixed(
                  2
                )} Dh</td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>

      <div style="text-align:right; margin-top:20px;">
        <p><strong>Sous-total:</strong> ${subTotal.toFixed(2)} Dh</p>
        ${
          discount > 0
            ? `<p><strong>Remise:</strong> -${discount.toFixed(2)} Dh</p>`
            : ""
        }
        <p style="font-size:13px; font-weight:bold; color:#2c5aa0; border-top:2px solid #2c5aa0; padding-top:5px;">
          Total estimé: ${total.toFixed(2)} Dh
        </p>
      </div>

      <div style="margin-top:20px; border-top:1px solid #ccc; padding-top:10px;">
        <p style="margin-top:25px;">Signature et cachet: __________________________</p>
      </div>
    `;

      document.body.appendChild(pdfContainer);

      // Generate image from HTML content
      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#fff",
      });

      document.body.removeChild(pdfContainer);

      // Convert to PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      // ✅ Fix: Prevent duplicate blank page
      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);
      } else {
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 1) {
          // prevent floating-point white page
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      pdf.save(`Devis-${devis.devisNumber}.pdf`);
      topTost("PDF téléchargé avec succès!", "success");
    } catch (err) {
      console.error("Erreur PDF:", err);
      topTost("Erreur lors de la génération du PDF", "error");
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="xl">
      <ModalHeader toggle={toggle}>
        Devis #{devis.devisNumber}
        <Badge color={getStatusBadge(formData.status)} className="ms-2">
          {statusOptions.find((opt) => opt.value === formData.status)?.label ||
            formData.status}
        </Badge>
      </ModalHeader>

      <ModalBody>
        <div className="row">
          {/* Customer Information */}
          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label">Nom Client *</label>
              <input
                type="text"
                className="form-control"
                value={formData.customerName}
                onChange={(e) =>
                  handleInputChange("customerName", e.target.value)
                }
                required
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label">
                Téléphone Client
                {["envoyé", "en_attente"].includes(formData.status) && (
                  <span className="text-danger"> *</span>
                )}
              </label>
              <input
                type="tel"
                className="form-control"
                value={formData.customerPhone}
                onChange={(e) =>
                  handleInputChange("customerPhone", e.target.value)
                }
                placeholder="06 XX XX XX XX ou +212 6 XX XX XX XX"
                required={["envoyé", "en_attente"].includes(formData.status)}
              />
            </div>
          </div>

          {/* Devis Details */}
          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label">Date du Devis</label>
              <div>
                <DatePicker
                  selected={formData.issueDate}
                  onChange={(date) => handleInputChange("issueDate", date)}
                  className="form-control"
                  dateFormat="dd/MM/yyyy"
                />
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label">Statut *</label>
              <select
                className="form-control"
                value={formData.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={isSubmitting || devis.convertedToInvoice}
              >
                {statusOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={
                      option.value === "transformé_facture" &&
                      devis.convertedToInvoice
                    }
                  >
                    {option.label}
                    {option.value === "transformé_facture" &&
                    devis.convertedToInvoice
                      ? " (Déjà converti)"
                      : ""}
                  </option>
                ))}
              </select>
              {devis.convertedToInvoice && (
                <small className="text-success">
                  ✓ Ce devis a été converti en facture #
                  {devis.convertedInvoiceId}
                </small>
              )}
            </div>
          </div>

          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label">
                {formData.discountType === "percentage"
                  ? "Remise (%)"
                  : "Remise (Dh)"}
              </label>
              <input
                type="number"
                className="form-control"
                value={formData.discountValue}
                onChange={(e) =>
                  handleInputChange(
                    "discountValue",
                    parseFloat(e.target.value) || 0
                  )
                }
                min="0"
                max={formData.discountType === "percentage" ? 100 : subTotal}
                step={formData.discountType === "percentage" ? 1 : 0.01}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="col-12">
            <div className="form-group mb-3">
              <label className="form-label">Notes / Description</label>
              <textarea
                className="form-control"
                rows="3"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Description des travaux, conditions particulières, validité..."
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6>Articles / Prestations</h6>
              <Button color="primary" size="sm" onClick={addItem}>
                <FiPlus className="me-1" />
                Ajouter Article
              </Button>
            </div>
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Article</th>
                    <th>Qty</th>
                    <th>Longueur</th>
                    <th>Largeur</th>
                    <th>Hauteur</th>
                    <th>Prix/Unité</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={item.id || index}>
                      <td>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={item.articleName}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "articleName",
                              e.target.value
                            )
                          }
                          placeholder="Nom de l'article"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, "quantity", e.target.value)
                          }
                          min="1"
                          step="1"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={item.v1}
                          onChange={(e) =>
                            handleItemChange(index, "v1", e.target.value)
                          }
                          min="0.01"
                          step="0.01"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={item.v2}
                          onChange={(e) =>
                            handleItemChange(index, "v2", e.target.value)
                          }
                          min="0.01"
                          step="0.01"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={item.v3}
                          onChange={(e) =>
                            handleItemChange(index, "v3", e.target.value)
                          }
                          min="0.01"
                          step="0.01"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(index, "unitPrice", e.target.value)
                          }
                          min="0.01"
                          step="0.01"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={item.totalPrice.toFixed(2)}
                          readOnly
                        />
                      </td>
                      <td>
                        {formData.items.length > 1 && (
                          <Button
                            color="danger"
                            size="sm"
                            onClick={() => removeItem(index)}
                          >
                            <FiTrash2 />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Section */}
          <div className="col-12">
            <div className="bg-light p-3 rounded mt-3">
              <div className="row">
                <div className="col-md-6">
                  <h6>Résumé du Devis</h6>
                  <p>
                    <strong>Client:</strong> {formData.customerName}
                  </p>
                  <p>
                    <strong>Téléphone:</strong>{" "}
                    {formData.customerPhone || "Non spécifié"}
                  </p>
                  <p>
                    <strong>Statut:</strong>{" "}
                    {
                      statusOptions.find((opt) => opt.value === formData.status)
                        ?.label
                    }
                  </p>
                </div>
                <div className="col-md-6 text-end">
                  <h6>Montants Estimés</h6>
                  <div className="d-flex justify-content-between">
                    <span>Sous-total:</span>
                    <span>{subTotal.toFixed(2)} Dh</span>
                  </div>
                  {discount > 0 && (
                    <div className="d-flex justify-content-between text-danger">
                      <span>Remise:</span>
                      <span>-{discount.toFixed(2)} Dh</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between fw-bold border-top pt-1">
                    <span>Total estimé:</span>
                    <span>{total.toFixed(2)} Dh</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        {devis.convertedToInvoice && (
          <Button
            color="success"
            onClick={() =>
              window.open(`/invoices/${devis.convertedInvoiceId}`, "_blank")
            }
          >
            Voir la Facture
          </Button>
        )}

        <Button
          color="primary"
          onClick={handleSubmit}
          disabled={isSubmitting || devis.convertedToInvoice}
        >
          <FiSave className="me-2" />
          {isSubmitting ? "Enregistrement..." : "Enregistrer les modifications"}
          {devis.convertedToInvoice && " (Lecture seule)"}
        </Button>

        <Button onClick={handlePrint} color="outline-primary">
          <FiPrinter className="me-2" />
          Imprimer
        </Button>

        <button
          className="btn btn-outline-primary"
          onClick={generateAndDownloadPDF}
        >
          <FiDownload className="me-2" />
          Télécharger le Devis
        </button>

        <Button color="secondary" onClick={toggle}>
          <FiX className="me-2" />
          Fermer
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default DevisDetailsModal;
