const sequelize = require("../config/db");
const BonLivraison = require("./bonLivraison");
const BonLivraisonItem = require("./bonLivraisonItem");
const db = {
  sequelize: sequelize,
  User: require("./user"),
  Invoice: require("./invoice"),
  InvoiceItem: require("./invoiceItem"),
  Advancement: require("./Advancement"),
  Devis: require("./Devis"),
  DevisItem: require("./DevisItem"),
  BonLivraison: require("./bonLivraison"),
  BonLivraisonItem: require("./bonLivraisonItem"),
};

module.exports = db;
