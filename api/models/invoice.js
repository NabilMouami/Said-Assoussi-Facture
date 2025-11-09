const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/db");
const InvoiceItem = require("./invoiceItem");
const Advancement = require("./Advancement");

class Invoice extends Model {
  calculateTotals() {
    const subTotal = this.items.reduce(
      (sum, item) => sum + parseFloat(item.totalPrice),
      0
    );

    const discount =
      this.discountType === "percentage"
        ? (subTotal * this.discountValue) / 100
        : this.discountValue;

    const total = Math.max(0, subTotal - discount);
    const advancementTotal = this.advancements.reduce(
      (sum, adv) => sum + parseFloat(adv.amount),
      0
    );
    const remaining = Math.max(0, total - advancementTotal);

    this.subTotal = subTotal;
    this.total = total;
    this.discountAmount = discount;
    this.advancement = advancementTotal;
    this.remainingAmount = remaining;
  }
}

Invoice.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    invoiceNumber: {
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
    // Payment fields
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
  },
  {
    sequelize,
    modelName: "Invoice",
    tableName: "invoices",
    timestamps: true,
  }
);

Invoice.hasMany(InvoiceItem, {
  foreignKey: "invoiceId",
  as: "items",
  onDelete: "CASCADE",
  hooks: true,
});

Invoice.hasMany(Advancement, {
  foreignKey: "invoiceId",
  as: "advancements",
  onDelete: "CASCADE",
  hooks: true,
});

InvoiceItem.belongsTo(Invoice, { foreignKey: "invoiceId", as: "invoice" });
Advancement.belongsTo(Invoice, { foreignKey: "invoiceId", as: "invoice" });

module.exports = Invoice;
