import React, { useState, useEffect } from "react";
import axios from "axios";
import DevisDetailsModal from "./DevisDetailsModal";

import Table from "@/components/shared/table/Table";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { format, subDays } from "date-fns";
import {
  FiEdit,
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

// Devis status options (updated for devis)
const statusOptions = [
  { value: "all", label: "Tous les statuts" },
  { value: "brouillon", label: "Brouillon" },
  { value: "envoyé", label: "Envoyé au client" },
  { value: "en_attente", label: "En Attente de réponse" },
  { value: "accepté", label: "Accepté par le client" },
  { value: "refusé", label: "Refusé" },
  { value: "expiré", label: "Expiré" },
  { value: "transformé_facture", label: "Transformé en Facture" },
];

const DevisTable = () => {
  const [devisList, setDevisList] = useState([]);
  const [filteredDevis, setFilteredDevis] = useState([]);
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
  const [selectedDevis, setSelectedDevis] = useState(null);

  useEffect(() => {
    const fetchDevis = async () => {
      try {
        const response = await axios.get(`${config_url}/api/devis`);
        const data = response.data;
        const formattedData = data.map((devis) => ({
          id: devis.id,
          devisNumber: devis.devisNumber,
          customerName: devis.customerName,
          total: devis.total,
          status: devis.status,
          customerPhone: devis.customerPhone,
          createdAt: devis.createdAt, // keep as ISO
          validityDate: devis.validityDate,
          convertedToInvoice: devis.convertedToInvoice,
        }));

        setDevisList(formattedData);
        setFilteredDevis(formattedData);
      } catch (error) {
        console.error("Error fetching devis:", error);
        setDevisList([]);
        setFilteredDevis([]);
      }
    };
    fetchDevis();
  }, []);

  // Filter devis based on selected status and date range
  useEffect(() => {
    let result = [...devisList];

    // Filter by status
    if (selectedStatus !== "all") {
      result = result.filter((devis) => devis.status === selectedStatus);
    }

    // Filter by date range
    if (dateRange[0].startDate && dateRange[0].endDate) {
      const start = new Date(dateRange[0].startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(dateRange[0].endDate);
      end.setHours(23, 59, 59, 999);

      result = result.filter((devis) => {
        const devisDate = new Date(devis.createdAt);
        return devisDate >= start && devisDate <= end;
      });
    }

    setFilteredDevis(result);
  }, [selectedStatus, dateRange, devisList]);

  const handleDateRangeChange = (ranges) => {
    setDateRange([ranges.selection]);
    setShowDatePicker(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      brouillon: "bg-secondary text-white",
      envoyé: "bg-primary text-white",
      en_attente: "bg-warning text-dark",
      accepté: "bg-success text-white",
      refusé: "bg-danger text-white",
      expiré: "bg-dark text-white",
      transformé_facture: "bg-info text-white",
    };
    return colors[status] || "bg-secondary text-white";
  };

  const getStatusText = (status) => {
    const texts = {
      brouillon: "Brouillon",
      envoyé: "Envoyé",
      en_attente: "En Attente",
      accepté: "Accepté",
      refusé: "Refusé",
      expiré: "Expiré",
      transformé_facture: "Transformé en Facture",
    };
    return texts[status] || status;
  };

  const handleDeleteDevis = async (devisId) => {
    const result = await MySwal.fire({
      title: (
        <p>
          Supprimer <strong>Ce Devis</strong>?
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
      try {
        const response = await axios.delete(
          `${config_url}/api/devis/${devisId}`,
          {
            withCredentials: true,
          }
        );

        if (response.status === 200 || response.status === 204) {
          setDevisList((prev) => prev.filter((devis) => devis.id !== devisId));
          MySwal.fire({
            title: <p>Supprimé!</p>,
            text: `Ce devis a été supprimé.`,
            icon: "success",
          });
        } else {
          throw new Error("Unexpected response status");
        }
      } catch (error) {
        console.error("Delete error:", error);

        let errorMessage = "Échec de la suppression du devis";
        if (error.response) {
          if (error.response.status === 404) {
            errorMessage = "Devis non trouvé";
          } else if (error.response.status === 409) {
            errorMessage = "Le devis a des enregistrements associés";
          } else {
            errorMessage = error.response.data?.message || errorMessage;
          }
        }

        MySwal.fire({
          title: <p>Erreur</p>,
          text: errorMessage,
          icon: "error",
        });
      }
    }
  };

  const handleViewDevis = (devisId) => {
    const devis = devisList.find((devis) => devis.id === devisId);
    if (devis) {
      axios
        .get(`${config_url}/api/devis/${devisId}`, {
          withCredentials: true,
        })
        .then((response) => {
          const devisData = response.data;
          setSelectedDevis(devisData);
          setIsDetailsModalOpen(true);
        })
        .catch((error) => {
          console.error("Error fetching devis details:", error);
          MySwal.fire({
            title: <p>Erreur</p>,
            text: "Échec du chargement des détails du devis",
            icon: "error",
          });
        });
    }
  };

  const handleUpdateDevis = (updatedDevis) => {
    // Update the devis in the list
    setDevisList((prev) =>
      prev.map((devis) =>
        devis.id === updatedDevis.id ? { ...devis, ...updatedDevis } : devis
      )
    );
  };

  // Send devis via WhatsApp
  const handleSendWhatsApp = async () => {
    if (!selectedDevis) return;

    try {
      // Generate WhatsApp message for devis
      const message = `Bonjour ${selectedDevis.customerName},\n\nVotre devis ${
        selectedDevis.devisNumber
      } d'un montant estimé de ${
        selectedDevis.total
      }Dh est disponible.\n\nCe devis est valable jusqu'au ${
        selectedDevis.validityDate
          ? new Date(selectedDevis.validityDate).toLocaleDateString("fr-FR")
          : "30 jours"
      }.\n\nMerci de votre confiance!`;
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${selectedDevis.customerPhone}?text=${encodedMessage}`;

      // Open WhatsApp in new tab
      window.open(whatsappUrl, "_blank");

      MySwal.fire({
        title: <p>Succès</p>,
        text: "Devis envoyé via WhatsApp!",
        icon: "success",
      });
    } catch (error) {
      console.error("Error sending devis:", error);
      MySwal.fire({
        title: <p>Erreur</p>,
        text: "Erreur lors de l'envoi du devis",
        icon: "error",
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
      accessorKey: "devisNumber",
      header: () => "N° Devis",
      cell: ({ getValue }) => <span className="font-mono">{getValue()}</span>,
    },
    {
      accessorKey: "customerName",
      header: () => "Client",
      cell: ({ getValue }) => <span>{getValue()}</span>,
    },
    {
      accessorKey: "total",
      header: () => "Total Estimé",
      cell: ({ getValue }) => <span>{getValue()} Dh</span>,
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
      accessorKey: "createdAt",
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
            onClick={() => handleViewDevis(row.original.id)}
          >
            <FiEye
              style={{
                color: "white",
              }}
            />{" "}
          </div>

          <div
            className="avatar-text avatar-md mr-8"
            style={{
              cursor: "pointer",
              backgroundColor: "red",
              borderRadius: "50%",
              padding: "8px",
            }}
            onClick={() => handleDeleteDevis(row.original.id)}
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
          <Link to="/devis/create">
            <button className="btn btn-sm btn-success">
              <FiPlusCircle className="me-2" />
              Créer Nouveau Devis
            </button>
          </Link>
        </div>
      </div>
      <div className="mt-4">
        <Table data={filteredDevis} columns={columns} />
      </div>

      {/* DevisDetailsModal */}
      <DevisDetailsModal
        isOpen={isDetailsModalOpen}
        toggle={() => setIsDetailsModalOpen(false)}
        devis={selectedDevis}
        onUpdate={handleUpdateDevis}
      />
    </>
  );
};

export default DevisTable;
