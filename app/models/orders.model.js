const Sequelize = require('sequelize');
const sequelize = require('../../database');

const Orders = sequelize.define('orders', {
  date: {
    type: Sequelize.DATE,
    allowNull: false
  },
  chat_id: {
    type: Sequelize.INTEGER
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  phone: {
    type: Sequelize.STRING,
    allowNull: false
  },
  order_type: {
    type: Sequelize.STRING,
    allowNull: false
  },
  delivery: {
    type: Sequelize.FLOAT,
  },
  total: {
    type: Sequelize.FLOAT,
    defaultValue: 0
  },
  system: Sequelize.STRING,
  address: Sequelize.STRING,
  products: Sequelize.STRING,
  status: {
    type: Sequelize.INTEGER,
    defaultValue: 1
  }
})
module.exports = Orders
