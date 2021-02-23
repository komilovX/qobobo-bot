const Sequelize = require("sequelize");
const sequelize = require("../../database");

module.exports = sequelize.define("delivery", {
  price: {
    type: Sequelize.INTEGER,
    defaultValue: 10000,
  },
  limit: {
    type: Sequelize.INTEGER,
    defaultValue: 100000,
  },
});
