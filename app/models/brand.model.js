const Sequelize = require('sequelize');
const sequelize = require('../../database');

const Brands = sequelize.define('brands', {
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  photo: {
    type: Sequelize.STRING,
    allowNull: false
  }
})

module.exports = Brands
