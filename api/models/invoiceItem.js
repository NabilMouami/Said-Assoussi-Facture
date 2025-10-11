// models/invoiceItem.js
const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/db");

class InvoiceItem extends Model {}

InvoiceItem.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    articleName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 1,
    },
    v1: {
      // Longueur
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 1,
    },
    v2: {
      // Largeur
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 1,
    },
    v3: {
      // Hauteur
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 1,
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "InvoiceItem",
    tableName: "invoice_items",
    timestamps: true,
  }
);

module.exports = InvoiceItem;
