import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { config_url } from "@/utils/config";
import Table from "@/components/shared/table/Table";

import PageHeader from "@/components/shared/pageHeader/PageHeader";
import ServicesListHeader from "@/components/servicesList/ServicesListHeader";

import { FiEdit, FiTrash2 } from "react-icons/fi";

import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { UpdateUserModal } from "./updateUser";
import axios from "axios";
const MySwal = withReactContent(Swal);
const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await axios.get(`${config_url}/api/users`, {
          withCredentials: true,
        });
        const data = response.data;
        setUsers(data);
      } catch (error) {
        console.error("Error fetching users:", error);
        setUsers([]);
      }
    };

    fetchCities();
  }, []);
  const toggleModal = () => setIsModalOpen(!isModalOpen);

  const handleSaveCity = (updatedCity) => {
    setCities((prev) =>
      prev.map((c) => (c.id === updatedCity.id ? updatedCity : c))
    );
  };
  const handleDeleteUser = async (cityId, cityName) => {
    const result = await MySwal.fire({
      title: (
        <p>
          Delete <strong>{cityName}</strong>?
        </p>
      ),
      text: "Are you sure you want to delete this User?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        const response = await axios.delete(
          `${config_url}/api/users/${cityId}`,
          {
            withCredentials: true,
          }
        );

        // For axios, successful responses are in the 2xx range
        // The actual response data is in response.data
        setUsers((prevCities) =>
          prevCities.filter((city) => city.id !== cityId)
        );

        MySwal.fire({
          title: <p>Deleted!</p>,
          text: `${cityName} has been deleted.`,
          icon: "success",
        });
      } catch (error) {
        MySwal.fire({
          title: <p>Error</p>,
          text: "Failed to delete the User.",
          icon: "error",
        });
      }
    }
  };

  const columns = [
    {
      accessorKey: "id",
      header: () => "ID",
      cell: (info) => <span>{info.getValue()}</span>,
    },
    {
      accessorKey: "firstName",
      header: () => "First Name",
      cell: (info) => {
        const cityName = info.getValue(); // this is a string
        return <span className="text-truncate-1-line">{cityName}</span>;
      },
    },
    {
      accessorKey: "lastName",
      header: () => "Last Name",
      cell: (info) => {
        const cityName = info.getValue(); // this is a string
        return <span className="text-truncate-1-line">{cityName}</span>;
      },
    },
    {
      accessorKey: "email",
      header: () => "Email",
      cell: (info) => <span>{info.getValue()}</span>,
    },

    {
      accessorKey: "actions",
      header: () => "Actions",
      cell: ({ row }) => {
        const { id, firstName } = row.original;
        return (
          <div className="hstack d-flex gap-2 justify-content-center">
            <div
              className="avatar-text avatar-md mr-8"
              style={{ cursor: "pointer", color: "blue" }}
            >
              <Link to={`/users/update/${id}`}>
                <FiEdit />
              </Link>
            </div>
            <div className="avatar-text avatar-md mr-8">
              <FiTrash2
                className="avatar-text avatar-md mr-8"
                style={{ cursor: "pointer", color: "red" }}
                onClick={() => handleDeleteUser(id, firstName)}
              />
            </div>

            {/* <Dropdown
                dropdownItems={actions}
                serviceId={row?.original?.id}
                triggerClassName="avatar-md"
                triggerPosition={"0,21"}
                triggerIcon={<FiMoreHorizontal />}
              /> */}
          </div>
        );
      },

      meta: {
        headerClassName: "text-center",
      },
    },
  ];
  return (
    <>
      <PageHeader>
        <ServicesListHeader />
      </PageHeader>
      <div className="main-content">
        <div className="row">
          <Table data={users} columns={columns} />
        </div>
      </div>
      <UpdateUserModal
        isOpen={isModalOpen}
        toggle={toggleModal}
        user={selectedCity}
        onSave={handleSaveCity}
      />
    </>
  );
};

export default UsersList;
