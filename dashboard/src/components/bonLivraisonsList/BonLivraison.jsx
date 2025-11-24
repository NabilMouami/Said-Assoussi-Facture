import React, { useState, useEffect } from "react";
import axios from "axios";
import BonLivrDetailsModal from "./BonLivrDetailsModal";

import Table from "@/components/shared/table/Table";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css"; // Main style file
import "react-date-range/dist/theme/default.css"; // Theme CSS file
import { format, subDays } from "date-fns";
import {
  FiEye,
  FiFilter,
  FiCalendar,
  FiPlusCircle,
  FiTrash,
  FiSend,
  FiUpload,
} from "react-icons/fi";
import { config_url } from "@/utils/config";
import Swal from "sweetalert2";
import { Input, InputGroup, InputGroupText, Label } from "reactstrap";

import withReactContent from "sweetalert2-react-content";
import { Link } from "react-router-dom";
const MySwal = withReactContent(Swal);

// Moroccan invoice status options
const statusOptions = [
  { value: "all", label: "Tous les statuts" },
  { value: "brouillon", label: "Brouillon" },
  { value: "envoyée", label: "Envoyée" },
  { value: "payée", label: "Payée" },
  { value: "partiellement_payée", label: "Partiellement Payée" },
  { value: "en_retard", label: "En Retard" },
  { value: "annulée", label: "Annulée" },
  { value: "en_attente", label: "En Attente" },
];

const BonLivraisonTable = () => {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState([
    {
      startDate: subDays(new Date(), 30),
      endDate: new Date(),
      key: "selection",
    },
  ]);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [advancementPrice, setAdvancementPrice] = useState(0);
  const [invoiceStatus, setInvoiceStatus] = useState("brouillon");

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await axios.get(`${config_url}/api/bonlivraisons`);
        const data = response.data;

        console.log("Data Bons: " + JSON.stringify(data));
        const formattedData = data.map((invoice) => {
          const total = parseFloat(invoice.total) || 0;
          const advancement = parseFloat(invoice.advancement) || 0;
          const remainingAmount =
            parseFloat(invoice.remainingAmount) || total - advancement;

          return {
            id: invoice.id,
            deliveryNumber: invoice.deliveryNumber,
            customerName: invoice.customerName,
            customerPhone: invoice.customerPhone,
            total,
            advancement,
            remainingAmount,
            status: invoice.status,
            createdAt: new Date(invoice.createdAt), // keep it as a Date
            createdAtString: new Date(invoice.createdAt).toLocaleString(), // for display
          };
        });

        setBookings(formattedData);
        setFilteredBookings(formattedData);
      } catch (error) {
        console.error("Error fetching bons:", error);
        setBookings([]);
        setFilteredBookings([]);
      }
    };
    fetchBookings();
  }, []);

  // Filter bookings based on selected status and date range booking
  useEffect(() => {
    let result = [...bookings];

    // Filter by status
    if (selectedStatus !== "all") {
      result = result.filter((booking) => booking.status === selectedStatus);
    }

    // Filter by date range
    if (dateRange[0].startDate && dateRange[0].endDate) {
      const start = new Date(dateRange[0].startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(dateRange[0].endDate);
      end.setHours(23, 59, 59, 999);

      result = result.filter((booking) => {
        const bookingDate = new Date(booking.createdAt);
        return bookingDate >= start && bookingDate <= end;
      });
    }

    setFilteredBookings(result);
  }, [selectedStatus, dateRange, bookings]);

  const handleDateRangeChange = (ranges) => {
    setDateRange([ranges.selection]);
    setShowDatePicker(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      brouillon: "bg-secondary text-white",
      envoyée: "bg-primary text-white",
      payée: "bg-success text-white",
      partiellement_payée: "bg-warning text-dark",
      en_retard: "bg-danger text-white",
      annulée: "bg-dark text-white",
      en_attente: "bg-info text-white",
    };
    return colors[status] || "bg-secondary text-white";
  };

  const getStatusText = (status) => {
    const texts = {
      brouillon: "Brouillon",
      envoyée: "Envoyée",
      payée: "Payée",
      partiellement_payée: "Partiellement Payée",
      en_retard: "En Retard",
      annulée: "Annulée",
      en_attente: "En Attente",
    };
    return texts[status] || status;
  };
  const handleInvoiceUpdate = (updatedInvoice) => {
    // Update the bookings state with the updated invoice
    setBookings((prevBookings) =>
      prevBookings.map((booking) =>
        booking.id === updatedInvoice.id
          ? {
              ...booking,
              customerName: updatedInvoice.customerName,
              customerPhone: updatedInvoice.customerPhone,
              status: updatedInvoice.status,
              advancement: updatedInvoice.advancement || 0,
              remainingAmount:
                updatedInvoice.remainingAmount || updatedInvoice.total,
              // Add any other fields that might be updated
            }
          : booking
      )
    );

    // Also update filteredBookings to reflect changes immediately
    setFilteredBookings((prevFiltered) =>
      prevFiltered.map((booking) =>
        booking.id === updatedInvoice.id
          ? {
              ...booking,
              customerName: updatedInvoice.customerName,
              customerPhone: updatedInvoice.customerPhone,
              status: updatedInvoice.status,
              advancement: updatedInvoice.advancement || 0,
              remainingAmount:
                updatedInvoice.remainingAmount || updatedInvoice.total,
            }
          : booking
      )
    );

    // Show success message
    MySwal.fire({
      title: <p>Succès</p>,
      text: "Bon Livraison mise à jour avec succès!",
      icon: "success",
    });
  };
  // Handle advancement price change
  const handleAdvancementChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setAdvancementPrice(value);

    // Update the selected invoice if it exists
    if (selectedInvoice) {
      const remainingAmount = selectedInvoice.total - value;
      setSelectedInvoice({
        ...selectedInvoice,
        advancement: value,
        remainingAmount: remainingAmount > 0 ? remainingAmount : 0,
      });
    }
  };

  // Handle status change
  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setInvoiceStatus(newStatus);

    if (selectedInvoice) {
      setSelectedInvoice({
        ...selectedInvoice,
        status: newStatus,
      });
    }
  };

  // Send invoice via WhatsApp
  const handleSendWhatsApp = async () => {
    if (!selectedInvoice) return;

    try {
      // First, update the invoice status if it's changed
      if (
        selectedInvoice.status !== invoiceStatus ||
        selectedInvoice.advancement !== advancementPrice
      ) {
        await axios.put(
          `${config_url}/api/bonlivraisons/${selectedInvoice.id}`,
          {
            status: invoiceStatus,
            advancement: advancementPrice,
            remainingAmount: selectedInvoice.total - advancementPrice,
          },
          {
            withCredentials: true,
          }
        );
      }

      // Generate WhatsApp message
      const message = `Bonjour ${
        selectedInvoice.customerName
      },\n\nVotre Bon Livraison ${
        selectedInvoice.invoiceNumber
      } d'un montant de ${
        selectedInvoice.total
      }Dh est disponible.\nAcompte: ${advancementPrice}Dh\nMontant restant: ${
        selectedInvoice.total - advancementPrice
      }Dh\n\nMerci de votre confiance!`;
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${selectedInvoice.customerPhone}?text=${encodedMessage}`;

      // Open WhatsApp in new tab
      window.open(whatsappUrl, "_blank");

      MySwal.fire({
        title: <p>Succès</p>,
        text: "Bon Livraison envoyée via WhatsApp!",
        icon: "success",
      });
    } catch (error) {
      console.error("Error sending invoice:", error);
      MySwal.fire({
        title: <p>Erreur</p>,
        text: "Erreur lors de l'envoi de la Bon Livraison",
        icon: "error",
      });
    }
  };

  // Upload PDF invoice
  const handleUploadPDF = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedInvoice) return;

    if (file.type !== "application/pdf") {
      MySwal.fire({
        title: <p>Format invalide</p>,
        text: "Veuillez sélectionner un fichier PDF",
        icon: "error",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("invoiceId", selectedInvoice.id);

      await axios.post(`${config_url}/api/bonlivraisons/upload-pdf`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
      });

      MySwal.fire({
        title: <p>Succès</p>,
        text: "PDF téléchargé avec succès!",
        icon: "success",
      });
    } catch (error) {
      console.error("Error uploading PDF:", error);
      MySwal.fire({
        title: <p>Erreur</p>,
        text: "Erreur lors du téléchargement du PDF",
        icon: "error",
      });
    }
  };

  const handleDeleteEmployee = async (bookId) => {
    const result = await MySwal.fire({
      title: (
        <p>
          Supprimer <strong>Cette Bon Livraison</strong>?
        </p>
      ),
      text: "Etes-vous sûr de vouloir supprimer ceci Bon Livraison?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        const response = await axios.delete(
          `${config_url}/api/bonlivraisons/${bookId}`,
          {
            withCredentials: true,
          }
        );

        if (response.status === 200 || response.status === 204) {
          setBookings((prev) => prev.filter((book) => book.id !== bookId));
          MySwal.fire({
            title: <p>Supprimé!</p>,
            text: `Cette Bon Livraison a été supprimée.`,
            icon: "success",
          });
        } else {
          throw new Error("Unexpected response status");
        }
      } catch (error) {
        console.error("Delete error:", error);

        let errorMessage = "Failed to delete Bon Livraison";
        if (error.response) {
          if (error.response.status === 404) {
            errorMessage = "Bon Livraison not found";
          } else if (error.response.status === 409) {
            errorMessage = "Bon Livraison has associated records";
          } else {
            errorMessage = error.response.data?.message || errorMessage;
          }
        }

        MySwal.fire({
          title: <p>Error</p>,
          text: errorMessage,
          icon: "error",
        });
      }
    }
  };

  const handleViewInvoice = (invoiceId) => {
    const invoice = bookings.find((booking) => booking.id === invoiceId);
    if (invoice) {
      axios
        .get(`${config_url}/api/bonlivraisons/${invoiceId}`, {
          withCredentials: true,
        })
        .then((response) => {
          const invoiceData = response.data;
          setSelectedInvoice({
            ...invoiceData,
            advancement: invoiceData.advancement || 0,
            remainingAmount: invoiceData.remainingAmount || invoiceData.total,
          });
          setAdvancementPrice(invoiceData.advancement || 0);
          setInvoiceStatus(invoiceData.status || "brouillon");
          setIsDetailsModalOpen(true);
        })
        .catch((error) => {
          console.error("Error fetching invoice details:", error);
          MySwal.fire({
            title: <p>Error</p>,
            text: "Failed to load invoice details",
            icon: "error",
          });
        });
    }
  };

  const columns = [
    {
      accessorKey: "id",
      header: ({ table }) => {
        const checkboxRef = React.useRef(null);

        useEffect(() => {
          if (checkboxRef.current) {
            checkboxRef.current.indeterminate = table.getIsSomeRowsSelected();
          }
        }, [table.getIsSomeRowsSelected()]);

        return (
          <input
            type="checkbox"
            className="custom-table-checkbox"
            ref={checkboxRef}
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        );
      },
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="custom-table-checkbox"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      meta: {
        headerClassName: "width-30",
      },
    },
    {
      accessorKey: "deliveryNumber",
      header: () => "N° Bon Livraison",
      cell: ({ getValue }) => <span className="font-mono">{getValue()}</span>,
    },
    {
      accessorKey: "customerName",
      header: () => "Client",
      cell: ({ getValue }) => <span>{getValue()}</span>,
    },
    {
      accessorKey: "total",
      header: () => "Total",
      cell: ({ getValue }) => <span>{getValue()} Dh</span>,
    },
    {
      accessorKey: "advancement",
      header: () => "Avancement",
      cell: ({ getValue }) => <span>{getValue() || 0} Dh</span>,
    },
    {
      accessorKey: "remainingAmount",
      header: () => "Reste à Payer",
      cell: ({ row }) => {
        const total = row.original.total;
        const advancement = row.original.advancement || 0;
        const remaining = total - advancement;
        return <span>{remaining > 0 ? remaining : 0} Dh</span>;
      },
    },
    {
      accessorKey: "status",
      header: () => "Statut",
      cell: ({ getValue }) => {
        const status = getValue();
        return (
          <span className={`badge ${getStatusColor(status)}`}>
            {getStatusText(status)}
          </span>
        );
      },
    },
    {
      accessorKey: "createdAtString",
      header: () => "Date de Création",
      cell: ({ getValue }) => <span>{getValue()}</span>,
    },

    {
      accessorKey: "actions",
      header: () => "Actions",
      cell: ({ row }) => (
        <div className="hstack d-flex gap-4 justify-content-center">
          <div
            className="avatar-text avatar-md mr-8"
            style={{
              cursor: "pointer",
              backgroundColor: "green",
              borderRadius: "50%",
              padding: "8px",
            }}
            onClick={() => handleViewInvoice(row.original.id)}
          >
            <FiEye
              style={{
                color: "white",
              }}
            />
          </div>

          <div
            className="avatar-text avatar-md mr-8"
            style={{
              cursor: "pointer",
              backgroundColor: "red",
              borderRadius: "50%",
              padding: "8px",
            }}
            onClick={() => handleDeleteEmployee(row.original.id)}
          >
            <FiTrash style={{ color: "white" }} />
          </div>
        </div>
      ),
      meta: {
        headerClassName: "text-center",
      },
    },
  ];

  return (
    <>
      <div
        className="mb-3 d-flex align-items-center flex-wrap gap-3"
        style={{
          zIndex: 999,
          marginTop: "60px",
        }}
      >
        <InputGroup size="sm" className="w-auto shadow-sm rounded">
          <InputGroupText className="bg-white border-0">
            <FiFilter className="text-primary fs-6" />
          </InputGroupText>
          <Input
            type="select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border-0 bg-white"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Input>
        </InputGroup>

        {/* Date Range Filter */}
        <div className="position-relative">
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setShowDatePicker(!showDatePicker)}
          >
            <FiCalendar className="me-2" />
            {format(dateRange[0].startDate, "MMM d, yyyy")} -{" "}
            {format(dateRange[0].endDate, "MMM d, yyyy")}
          </button>

          {showDatePicker && (
            <div>
              <DateRangePicker
                onChange={handleDateRangeChange}
                showSelectionPreview={true}
                moveRangeOnFirstSelection={false}
                months={2}
                ranges={dateRange}
                direction="horizontal"
              />
            </div>
          )}
        </div>
        <div>
          <Link to="/bon-livraison/create">
            <button className="btn btn-sm btn-success">
              <FiPlusCircle className="me-2" />
              Créer Nouvelle Bon Livraison
            </button>
          </Link>
        </div>
      </div>
      <div className="mt-4">
        <Table data={filteredBookings} columns={columns} />
      </div>

      {/* Updated InvoiceDetailsModal with new features */}
      <BonLivrDetailsModal
        isOpen={isDetailsModalOpen}
        toggle={() => setIsDetailsModalOpen(false)}
        onUpdate={handleInvoiceUpdate}
        invoice={selectedInvoice}
        footerContent={
          selectedInvoice && (
            <div className="container-fluid">
              <div className="row mb-3">
                <div className="col-md-6">
                  <Label for="statusSelect">Statut de la Bon Livraison</Label>
                  <Input
                    type="select"
                    id="statusSelect"
                    value={invoiceStatus}
                    onChange={handleStatusChange}
                  >
                    {statusOptions
                      .filter((option) => option.value !== "all")
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </Input>
                </div>
                <div className="col-md-6">
                  <Label for="advancementInput">Prix d'Acompte (Dh)</Label>
                  <Input
                    type="number"
                    id="advancementInput"
                    value={advancementPrice}
                    onChange={handleAdvancementChange}
                    min="0"
                    max={selectedInvoice?.total || 0}
                    placeholder="Montant de l'acompte"
                  />
                  {selectedInvoice && (
                    <small className="text-muted">
                      Total: {selectedInvoice.total} Dh | Reste:{" "}
                      {selectedInvoice.total - advancementPrice} Dh
                    </small>
                  )}
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <button
                    className="btn btn-success w-100"
                    onClick={handleSendWhatsApp}
                    disabled={!selectedInvoice?.customerPhone}
                  >
                    <FiSend className="me-2" />
                    Envoyer via WhatsApp
                  </button>
                  {!selectedInvoice?.customerPhone && (
                    <small className="text-danger d-block mt-1">
                      Numéro de téléphone du client non disponible
                    </small>
                  )}
                </div>
                <div className="col-md-6">
                  <label
                    className="btn btn-primary w-100"
                    style={{ cursor: "pointer" }}
                  >
                    <FiUpload className="me-2" />
                    Télécharger PDF
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleUploadPDF}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )
        }
      />
    </>
  );
};

export default BonLivraisonTable;
