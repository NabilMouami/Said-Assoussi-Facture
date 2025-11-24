// models/bonLivraison.js
const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/db");
const BonLivraisonItem = require("./bonLivraisonItem");
const Advancement = require("./Advancement");

class BonLivraison extends Model {
  calculateTotals() {
    const currentStatus = this.status;

    const subTotal = this.items.reduce(
      (sum, item) => sum + parseFloat(item.totalPrice),
      0
    );

    const discount =
      this.discountType === "percentage"
        ? (subTotal * this.discountValue) / 100
        : this.discountValue;

    const total = Math.max(0, subTotal - discount);

    // Calculate advancements for delivery note
    const advancementTotal = this.advancements
      ? this.advancements.reduce((sum, adv) => sum + parseFloat(adv.amount), 0)
      : 0;

    const remaining = Math.max(0, total - advancementTotal);

    this.subTotal = subTotal;
    this.total = total;
    this.discountAmount = discount;
    this.advancement = advancementTotal;
    this.remainingAmount = remaining;
    this.status = currentStatus;
  }
}

BonLivraison.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    deliveryNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    customerName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Customer name is required",
        },
      },
    },
    customerPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    issueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    subTotal: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    // Discount fields
    discountType: {
      type: DataTypes.ENUM("fixed", "percentage"),
      defaultValue: "fixed",
    },
    discountValue: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    // Payment fields for delivery note
    paymentType: {
      type: DataTypes.ENUM(
        "espece",
        "cheque",
        "virement",
        "carte",
        "multiple",
        "non_paye"
      ),
      defaultValue: "non_paye",
    },
    advancement: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    remainingAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM(
        "brouillon", // Draft
        "envoyée", // Sent
        "payée", // Paid
        "partiellement_payée", // Partially paid
        "en_retard", // Overdue
        "annulée", // Cancelled
        "en_litige", // In dispute
        "en_attente", // Pending
        "acompte_reçu" // Deposit received
      ),
      defaultValue: "brouillon",
    },
    // Reference to the original invoice (optional)
    invoiceId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: "invoices",
        key: "id",
      },
    },
    preparedBy: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    deliveredBy: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    receiverName: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    receiverSignature: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "BonLivraison",
    tableName: "bon_livraisons",
    timestamps: true,
  }
);

// Associations
BonLivraison.hasMany(BonLivraisonItem, {
  foreignKey: "bonLivraisonId",
  as: "items",
  onDelete: "CASCADE",
  hooks: true,
});

BonLivraison.hasMany(Advancement, {
  foreignKey: "bonLivraisonId",
  as: "advancements",
  onDelete: "CASCADE",
  hooks: true,
});

BonLivraisonItem.belongsTo(BonLivraison, {
  foreignKey: "bonLivraisonId",
  as: "bonLivraison",
});

// Advancement association with BonLivraison
Advancement.belongsTo(BonLivraison, {
  foreignKey: "bonLivraisonId",
  as: "bonLivraison",
});

module.exports = BonLivraison;
