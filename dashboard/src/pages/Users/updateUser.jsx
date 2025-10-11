import React, { useState, useEffect, memo } from "react";
import { config_url } from "@/utils/config";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  Label,
  Input,
} from "reactstrap";

export const UpdateUserModal = ({ isOpen, toggle, user, onSave }) => {
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.firstName || "");
  const [email, setEmail] = useState(user?.email || "");

  useEffect(() => {
    setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
    setEmail(user?.email || "");
  }, [user]);

  const handleSubmit = async () => {
    try {
      const response = await fetch(`${config_url}/api/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) throw new Error("Failed to update user");

      const updatedCity = await response.json();
      onSave(updatedCity); // Update in the cities list
      toggle(); // Close modal
    } catch (err) {
      console.error("Update failed", err);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle}>
      <ModalHeader toggle={toggle}>Update User</ModalHeader>
      <ModalBody>
        <Form>
          <FormGroup>
            <Label for="cityName">FirstName</Label>
            <Input
              type="text"
              id="firstName"
              defaultValue={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First Name User"
            />
          </FormGroup>
          <FormGroup>
            <Label for="cityName">LastName</Label>
            <Input
              type="text"
              id="lastName"
              defaultValue={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last Name User"
            />
          </FormGroup>
          <FormGroup>
            <Label for="cityName">Email</Label>
            <Input
              type="email"
              id="email"
              defaultValue={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email User"
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button color="primary" onClick={handleSubmit}>
          Save
        </Button>
        <Button color="secondary" onClick={toggle}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
