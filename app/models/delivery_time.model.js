const Sequelize = require("sequelize");
const sequelize = require("../../database");

module.exports = sequelize.define("delivery_time", {
  time: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  time_uz: {
    type: Sequelize.STRING,
    allowNull: false,
  },
});
