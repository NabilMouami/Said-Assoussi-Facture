const sequelize = require("../config/db");

const db = {
  sequelize: sequelize,
  User: require("./user"),
  Invoice: require("./invoice"),
  InvoiceItem: require("./invoiceItem"),
  Advancement: require("./Advancement"),
  Devis: require("./Devis"),
  DevisItem: require("./DevisItem"),
};

module.exports = db;
