// models/bonLivraisonItem.js
const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/db");

class BonLivraisonItem extends Model {}

BonLivraisonItem.init(
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
    deliveredQuantity: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: "Quantity actually delivered",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Delivery-specific notes for this item",
    },
  },
  {
    sequelize,
    modelName: "BonLivraisonItem",
    tableName: "bon_livraison_items",
    timestamps: true,
  }
);

module.exports = BonLivraisonItem;
