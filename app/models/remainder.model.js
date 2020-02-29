const Sequelize = require('sequelize')
const sequelize = require('../../database');

const Remainder = sequelize.define('remainder', {
  product_id: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  product_name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  category_name: {
    type: Sequelize.STRING
  },
  category_id: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  residue: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  },
  limit: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  }
})

module.exports = Remainder
