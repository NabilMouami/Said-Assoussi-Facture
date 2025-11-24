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
import Swal from "sweetalert2";

import withReactContent from "sweetalert2-react-content";
const MySwal = withReactContent(Swal);

// Moroccan invoice status options
const statusOptions = [
  { value: "brouillon", label: "Brouillon" },
  { value: "envoyée", label: "Envoyée" },
  { value: "payée", label: "Payée" },
  { value: "partiellement_payée", label: "Partiellement Payée" },
  { value: "en_retard", label: "En Retard" },
  { value: "annulée", label: "Annulée" },
  { value: "en_attente", label: "En Attente" },
];

// Moroccan payment types
const paymentTypeOptions = [
  { value: "espece", label: "Espèce" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement Bancaire" },
  { value: "carte", label: "Carte Bancaire" },
  { value: "multiple", label: "Paiement Multiple" },
  { value: "non_paye", label: "Non Payé" },
];

// Payment methods for advancements
const paymentMethodOptions = [
  { value: "espece", label: "Espèce" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement Bancaire" },
  { value: "carte", label: "Carte Bancaire" },
];

const BonLivrDetailsModal = ({ isOpen, toggle, invoice, onUpdate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    issueDate: new Date(),
    notes: "",
    status: "brouillon",
    discountType: "fixed",
    discountValue: 0,
    paymentType: "non_paye",
    items: [],
    advancements: [],
  });

  // Initialize form data when invoice changes
  useEffect(() => {
    if (invoice) {
      console.log("Initializing form with invoice:", invoice);
      setFormData({
        customerName: invoice.customerName || "",
        customerPhone: invoice.customerPhone || "",
        issueDate: invoice.issueDate ? new Date(invoice.issueDate) : new Date(),
        notes: invoice.notes || "",
        status: invoice.status || "brouillon",
        discountType: invoice.discountType || "fixed",
        discountValue: parseFloat(invoice.discountValue) || 0,
        paymentType: invoice.paymentType || "non_paye",
        items: invoice.items
          ? invoice.items.map((item) => ({
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
        advancements: invoice.advancements
          ? invoice.advancements.map((adv) => ({
              id: adv.id,
              amount: parseFloat(adv.amount) || 0,
              paymentDate: adv.paymentDate
                ? new Date(adv.paymentDate)
                : new Date(),
              paymentMethod: adv.paymentMethod || "espece",
              reference: adv.reference || "",
              notes: adv.notes || "",
            }))
          : [],
      });
    }
  }, [invoice]);

  if (!invoice) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case "brouillon":
        return "warning";
      case "payée":
        return "success";
      case "envoyée":
        return "info";
      case "en_retard":
        return "danger";
      case "partiellement_payée":
        return "primary";
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
  const totalAfterDiscount = Math.max(0, subTotal - discount);

  // Calculate total advancement from advancements array
  const totalAdvancement = formData.advancements.reduce(
    (sum, adv) => sum + parseFloat(adv.amount || 0),
    0
  );

  const remainingAmount = Math.max(0, totalAfterDiscount - totalAdvancement);

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

  // Advancement handlers
  const addAdvancement = () => {
    const newAdvancement = {
      id: Date.now(), // Temporary ID for new advancements
      amount: 0,
      paymentDate: new Date(),
      paymentMethod: "espece",
      reference: "",
      notes: "",
    };
    setFormData((prev) => ({
      ...prev,
      advancements: [...prev.advancements, newAdvancement],
    }));
  };

  const removeAdvancement = async (index) => {
    const result = await MySwal.fire({
      title: (
        <p>
          Supprimer <strong>Cette Avancement</strong>?
        </p>
      ),
      text: "Êtes-vous sûr de vouloir supprimer ce devis?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Oui, supprimer!",
      cancelButtonText: "Annuler",
    });
    if (result.isConfirmed) {
      const updatedAdvancements = formData.advancements.filter(
        (_, i) => i !== index
      );
      setFormData((prev) => ({
        ...prev,
        advancements: updatedAdvancements,
      }));
    }
  };

  const handleAdvancementChange = (index, field, value) => {
    const updatedAdvancements = [...formData.advancements];
    updatedAdvancements[index] = {
      ...updatedAdvancements[index],
      [field]:
        field === "paymentDate"
          ? value
          : field === "paymentMethod" ||
            field === "reference" ||
            field === "notes"
          ? value
          : parseFloat(value) || 0,
    };
    setFormData((prev) => ({
      ...prev,
      advancements: updatedAdvancements,
    }));
  };

  const handleSubmit = async () => {
    console.log("Current form data before submit:", formData);

    // Validate customer name
    if (!formData.customerName.trim()) {
      topTost("Le nom du client est requis", "error");
      return;
    }

    // Validate items - at least one item required
    if (!formData.items || formData.items.length === 0) {
      topTost("La Bon Livraison doit avoir au moins un article", "error");
      return;
    }

    // Validate each item has required fields
    for (const item of formData.items) {
      if (!item.articleName.trim()) {
        topTost("Tous les articles doivent avoir un nom", "error");
        return;
      }
      if (item.quantity <= 0 || item.unitPrice <= 0) {
        topTost("Quantité et prix unitaire doivent être positifs", "error");
        return;
      }
    }

    // Validate advancements don't exceed total
    if (totalAdvancement > totalAfterDiscount) {
      topTost(
        "Le total des acomptes ne peut pas dépasser le montant total",
        "error"
      );
      return;
    }

    // Validate individual advancements
    for (const adv of formData.advancements) {
      if (!adv.amount || adv.amount <= 0) {
        topTost("Tous les acomptes doivent avoir un montant positif", "error");
        return;
      }
      if (!adv.paymentDate) {
        topTost("Tous les acomptes doivent avoir une date", "error");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Prepare the data for backend - match the updateBonLivraison controller structure
      const updateData = {
        deliveryNumber: invoice.deliveryNumber, // Use deliveryNumber instead of invoiceNumber
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        issueDate: formData.issueDate.toISOString().split("T")[0],
        notes: formData.notes,
        status: formData.status,
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        paymentType: formData.paymentType,
        remainingAmount: remainingAmount, // Add remaining amount
        receiverName: formData.receiverName || "", // Add receiver fields if needed
        receiverSignature: formData.receiverSignature || "",
        items: formData.items.map((item) => ({
          id: item.id,
          articleName: item.articleName,
          quantity: item.quantity,
          v1: item.v1,
          v2: item.v2,
          v3: item.v3,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice, // Include totalPrice
        })),
        advancements: formData.advancements.map((adv) => ({
          id: adv.id,
          amount: adv.amount,
          paymentDate: adv.paymentDate.toISOString().split("T")[0],
          paymentMethod: adv.paymentMethod,
          reference: adv.reference,
          notes: adv.notes,
        })),
      };

      console.log("Sending update data to backend:", updateData);

      // FIX: Use the correct endpoint for bonlivraisons
      const response = await axios.put(
        `${config_url}/api/bonlivraisons/${invoice.id}`, // Changed from /api/invoices/ to /api/bonlivraisons/
        updateData
      );

      console.log("Update response from backend:", response.data);

      topTost("Bon Livraison mise à jour avec succès!", "success");

      if (onUpdate) {
        onUpdate(response.data.bonLivraison || response.data); // Updated to expect bonLivraison
      }

      toggle();
    } catch (error) {
      console.error("Error updating delivery note:", error);
      console.error("Error response data:", error.response?.data);

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0] ||
        "Erreur lors de la mise à jour de la Bon Livraison. Veuillez réessayer.";
      topTost(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };
  const removeItem = (index) => {
    // Create a new array without the item at the specified index
    const updatedItems = formData.items.filter((_, i) => i !== index);

    // Update the form data with the new items array
    setFormData((prev) => ({
      ...prev,
      items: updatedItems,
    }));
  };

  const handlePrint = () => {
    if (!invoice) return;

    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      return d.toLocaleDateString("fr-FR");
    };

    // Use formData instead of invoice to get current values
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
    const totalAfterDiscount = Math.max(0, subTotal - discount);

    // Calculate total advancement from current formData advancements
    const totalAdvancement = formData.advancements.reduce(
      (sum, adv) => sum + parseFloat(adv.amount || 0),
      0
    );

    const remainingAmount = Math.max(0, totalAfterDiscount - totalAdvancement);

    const printWindow = window.open("", "_blank");
    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Bon Livraison ${invoice.deliveryNumber}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 10px;
      margin: 20px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .company-info, .invoice-info {
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
    .advancements {
      margin-top: 25px;
    }
    .advancements h3 {
      margin-bottom: 5px;
      font-size: 12px;
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
    <h2 style="margin: 0;">Bon Livraison</h2>
  </div>

  <div class="company-info">
    <div class="info-block">
      <p>Assoussi</p>

      <p><strong>Fer-Aluminium-Inox</strong></p>

      <p>Tél: +212 661-431237</p>
    </div>
    <div class="info-block" style="text-align:right;">
      <p><strong>Bon Livraison N°:</strong> ${invoice.deliveryNumber}</p>
      <p><strong>Date:</strong> ${formatDate(formData.issueDate)}</p>
    </div>
  </div>

  <div class="invoice-info">
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
    <p><strong>Total:</strong> ${totalAfterDiscount.toFixed(2)} Dh</p>
    ${
      totalAdvancement > 0
        ? `<p><strong>Avancement:</strong> -${totalAdvancement.toFixed(
            2
          )} Dh</p>
           <p><strong>Reste à payer:</strong> ${remainingAmount.toFixed(
             2
           )} Dh</p>`
        : `<p><strong>Reste à payer:</strong> ${remainingAmount.toFixed(
            2
          )} Dh</p>`
    }
  </div>

  ${
    formData.advancements && formData.advancements.length > 0
      ? `
    <div class="advancements">
      <h3>Historique des Avancements</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Date Paiement</th>
            <th>Montant</th>
            <th>Méthode</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${formData.advancements
            .map(
              (a) => `
            <tr>
              <td>${formatDate(a.paymentDate)}</td>
              <td>${parseFloat(a.amount).toFixed(2)} Dh</td>
              <td>${a.paymentMethod}</td>
              <td>${a.notes || "-"}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `
      : ""
  }

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

      // Calculate totals (same as in handlePrint)
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
      const totalAfterDiscount = Math.max(0, subTotal - discount);

      // Calculate total advancement from current formData advancements
      const totalAdvancement = formData.advancements.reduce(
        (sum, adv) => sum + parseFloat(adv.amount || 0),
        0
      );

      const remainingAmount = Math.max(
        0,
        totalAfterDiscount - totalAdvancement
      );

      // Build PDF HTML with advancements history
      pdfContainer.innerHTML = `
      <div style="text-align:center; border-bottom:2px solid #333; padding-bottom:10px; margin-bottom:15px;">
        <h1 style="margin:0; color:#2c5aa0;">Bon Livraison</h1>
        <h3 style="margin:5px 0;">Fer-Aluminium-Inox - Assoussi</h3>
        <p style="font-size:10px;">Tél: +212 661-431237  </p>
      </div>

      <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
        <div>
          <h4 style="margin-bottom:5px;">Client</h4>
          <p><strong>Nom:</strong> ${formData.customerName}</p>
          <p><strong>Téléphone:</strong> ${
            formData.customerPhone || "Non spécifié"
          }</p>
        </div>
        <div>
          <h4 style="margin-bottom:5px;">Bon Livraison</h4>
          <p><strong>N°:</strong> ${invoice.deliveryNumber}</p>
          <p><strong>Date:</strong> ${formatDate(formData.issueDate)}</p>
      
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
        <p><strong>Total après remise:</strong> ${totalAfterDiscount.toFixed(
          2
        )} Dh</p>
        ${
          totalAdvancement > 0
            ? `<p><strong>Avancement:</strong> -${totalAdvancement.toFixed(
                2
              )} Dh</p>
               <p style="font-size:13px; font-weight:bold; color:#2c5aa0; border-top:2px solid #2c5aa0; padding-top:5px;">
                 Reste à payer: ${remainingAmount.toFixed(2)} Dh
               </p>`
            : `<p style="font-size:13px; font-weight:bold; color:#2c5aa0; border-top:2px solid #2c5aa0; padding-top:5px;">
                 Reste à payer: ${remainingAmount.toFixed(2)} Dh
               </p>`
        }
      </div>

      ${
        formData.advancements && formData.advancements.length > 0
          ? `
        <div style="margin-top:25px;">
          <h4 style="margin-bottom:10px; border-bottom:1px solid #ccc; padding-bottom:5px;">Historique des Avancements</h4>
          <table style="width:100%; border-collapse:collapse; font-size:9px; margin-top:10px;">
            <thead>
              <tr style="background-color:#f5f5f5;">
                <th style="border:1px solid #ddd; padding:4px; text-align:left;">Date Paiement</th>
                <th style="border:1px solid #ddd; padding:4px; text-align:right;">Montant</th>
                <th style="border:1px solid #ddd; padding:4px; text-align:left;">Méthode</th>
                <th style="border:1px solid #ddd; padding:4px; text-align:left;">Notes</th>
              </tr>
            </thead>
            <tbody>
              ${formData.advancements
                .map(
                  (a) => `
                <tr>
                  <td style="border:1px solid #ddd; padding:4px;">${formatDate(
                    a.paymentDate
                  )}</td>
                  <td style="border:1px solid #ddd; padding:4px; text-align:right;">${parseFloat(
                    a.amount
                  ).toFixed(2)} Dh</td>
                  <td style="border:1px solid #ddd; padding:4px;">${
                    a.paymentMethod
                  }</td>
                 
                  <td style="border:1px solid #ddd; padding:4px;">${
                    a.notes || "-"
                  }</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `
          : ""
      }

      <div style="margin-top:40px; border-top:1px solid #ccc; padding-top:15px;">
        <p style="margin-top:25px; text-align:center;">
          Signature et cachet<br>
          _________________________
        </p>
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

      // ✅ Fix: Avoid duplicate white page
      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);
      } else {
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 1) {
          // prevent rounding white page
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      pdf.save(`Bon Livraison-${invoice.deliveryNumber}.pdf`);
      topTost("PDF téléchargé avec succès!", "success");
    } catch (err) {
      console.error("Erreur PDF:", err);
      topTost("Erreur lors de la génération du PDF", "error");
    }
  };
  return (
    <Modal isOpen={isOpen} toggle={toggle} size="xl">
      <ModalHeader toggle={toggle}>
        Bon Livraison #{invoice.invoiceNumber}
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
              <label className="form-label">Téléphone Client</label>
              <input
                type="tel"
                className="form-control"
                value={formData.customerPhone}
                onChange={(e) =>
                  handleInputChange("customerPhone", e.target.value)
                }
                placeholder="+212 XXX-XXXXXX"
              />
            </div>
          </div>

          {/* Invoice Details */}
          <div className="col-md-4">
            <div className="form-group mb-3">
              <label className="form-label">Date Facturation</label>
              <DatePicker
                selected={formData.issueDate}
                onChange={(date) => handleInputChange("issueDate", date)}
                className="form-control"
                dateFormat="dd/MM/yyyy"
              />
            </div>
          </div>
          <div className="col-md-4">
            <div className="form-group mb-3">
              <label className="form-label">Statut *</label>
              <select
                className="form-control"
                value={formData.status}
                onChange={(e) => handleInputChange("status", e.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-md-4">
            <div className="form-group mb-3">
              <label className="form-label">Type de Paiement</label>
              <select
                className="form-control"
                value={formData.paymentType}
                onChange={(e) =>
                  handleInputChange("paymentType", e.target.value)
                }
              >
                {paymentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Discount Section */}
          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label">Type de Remise</label>
              <select
                className="form-control"
                value={formData.discountType}
                onChange={(e) =>
                  handleInputChange("discountType", e.target.value)
                }
              >
                <option value="fixed">Montant Fixe (Dh)</option>
                <option value="percentage">Pourcentage (%)</option>
              </select>
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

          {/* Advancements Section */}
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6>Avances</h6>
              <Button color="primary" size="sm" onClick={addAdvancement}>
                <FiPlus className="me-1" />
                Ajouter Avance
              </Button>
            </div>

            {formData.advancements.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Montant (Dh)</th>
                      <th>Méthode</th>
                      <th>Référence</th>
                      <th>Notes</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.advancements.map((advancement, index) => (
                      <tr key={advancement.id || index}>
                        <td>
                          <DatePicker
                            selected={advancement.paymentDate}
                            onChange={(date) =>
                              handleAdvancementChange(
                                index,
                                "paymentDate",
                                date
                              )
                            }
                            className="form-control form-control-sm"
                            dateFormat="dd/MM/yyyy"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={advancement.amount}
                            onChange={(e) =>
                              handleAdvancementChange(
                                index,
                                "amount",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            min="0.01"
                            step="0.01"
                          />
                        </td>
                        <td>
                          <select
                            className="form-control form-control-sm"
                            value={advancement.paymentMethod}
                            onChange={(e) =>
                              handleAdvancementChange(
                                index,
                                "paymentMethod",
                                e.target.value
                              )
                            }
                          >
                            {paymentMethodOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={advancement.reference}
                            onChange={(e) =>
                              handleAdvancementChange(
                                index,
                                "reference",
                                e.target.value
                              )
                            }
                            placeholder="N° chèque, référence..."
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={advancement.notes}
                            onChange={(e) =>
                              handleAdvancementChange(
                                index,
                                "notes",
                                e.target.value
                              )
                            }
                            placeholder="Notes..."
                          />
                        </td>
                        <td>
                          <Button
                            color="danger"
                            size="sm"
                            onClick={() => removeAdvancement(index)}
                          >
                            <FiTrash2 />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert alert-info">
                Aucun avancement enregistré. Cliquez sur "Ajouter Avance" pour
                en ajouter.
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="col-12">
            <div className="form-group mb-3">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                rows="3"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Notes supplémentaires..."
              />
            </div>
          </div>

          {/* Items Table */}
          {/* Items Table */}
          <div className="col-12">
            <h6>Articles</h6>
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
                    <th>Action</th> {/* Add this column */}
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
                        {/* Add the remove button */}
                        <Button
                          color="danger"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={formData.items.length <= 1}
                          title={
                            formData.items.length <= 1
                              ? "Au moins un article est requis"
                              : "Supprimer cet article"
                          }
                        >
                          <FiTrash2 />
                        </Button>
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
                  <h6>Résumé de la Bon Livraison</h6>
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
                  <p>
                    <strong>Paiement:</strong>{" "}
                    {
                      paymentTypeOptions.find(
                        (opt) => opt.value === formData.paymentType
                      )?.label
                    }
                  </p>
                </div>
                <div className="col-md-6 text-end">
                  <h6>Montants</h6>
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
                  <div className="d-flex justify-content-between fw-bold">
                    <span>Total après remise:</span>
                    <span>{totalAfterDiscount.toFixed(2)} Dh</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Total Advancenment(s):</span>
                    <span>{totalAdvancement.toFixed(2)} Dh</span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold border-top pt-1">
                    <span>Reste à payer:</span>
                    <span>{remainingAmount.toFixed(2)} Dh</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <button
          className="btn btn-outline-primary"
          onClick={generateAndDownloadPDF} // or generateSimplePDF for the simpler version
        >
          <FiDownload className="me-2" />
          Télécharger la Bon Livraison{" "}
        </button>
        <Button onClick={handlePrint} color="outline-primary">
          <FiPrinter className="me-2" />
          Imprimer
        </Button>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          <FiSave className="me-2" />
          {isSubmitting ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
        <button className="btn btn-secondary" onClick={toggle}>
          <FiX className="me-2" />
          Fermer
        </button>
      </ModalFooter>
    </Modal>
  );
};

export default BonLivrDetailsModal;
