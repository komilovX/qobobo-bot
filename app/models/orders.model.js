const Sequelize = require("sequelize");
const sequelize = require("../../database");

const Orders = sequelize.define("orders", {
  date: {
    type: Sequelize.DATE,
    allowNull: false,
  },
  chat_id: {
    type: Sequelize.INTEGER,
  },
  clientName: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  clientPhone: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  orderType: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  delivery: {
    type: Sequelize.FLOAT,
  },
  delivery_time: {
    type: Sequelize.STRING,
  },
  total: {
    type: Sequelize.FLOAT,
    defaultValue: 0,
  },
  system: Sequelize.STRING,
  address: Sequelize.STRING,
  products: Sequelize.STRING,
  status: {
    type: Sequelize.STRING,
    defaultValue: "new",
  },
  latitude: Sequelize.FLOAT,
  longitude: Sequelize.FLOAT,
});
module.exports = Orders;
