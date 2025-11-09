const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/db");
const DevisItem = require("./DevisItem");

class Devis extends Model {
  calculateTotals() {
    if (this.items && this.items.length > 0) {
      this.subTotal = this.items.reduce(
        (sum, item) => sum + parseFloat(item.totalPrice || 0),
        0
      );

      // Calculate discount
      let discountAmount = 0;
      if (this.discountType === "percentage") {
        discountAmount = (this.subTotal * this.discountValue) / 100;
      } else {
        discountAmount = this.discountValue;
      }

      // Apply discount
      const amountAfterDiscount = this.subTotal - discountAmount;

      this.total = amountAfterDiscount;

      // Store discount amount for easy access
      this.discountAmount = discountAmount;
    }
  }
}

Devis.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    devisNumber: {
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
    validityDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
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
    // Devis specific fields
    status: {
      type: DataTypes.ENUM(
        "brouillon", // Draft
        "envoyé", // Sent to client
        "en_attente", // Pending client response
        "accepté", // Accepted by client
        "refusé", // Refused by client
        "expiré", // Expired
        "transformé_facture" // Converted to invoice
      ),
      defaultValue: "brouillon",
    },
    // Conversion tracking
    convertedToInvoice: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    convertedInvoiceId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    pdfPath: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    pdfUploadedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Devis",
    tableName: "devis",
    timestamps: true,
  }
);

Devis.hasMany(DevisItem, {
  foreignKey: "devisId",
  as: "items",
  onDelete: "CASCADE",
  hooks: true,
});

DevisItem.belongsTo(Devis, { foreignKey: "devisId", as: "devis" });

module.exports = Devis;
