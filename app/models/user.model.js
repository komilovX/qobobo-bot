const Sequelize = require('sequelize')
const sequelize = require('../../database')

const Users = sequelize.define('users', {
  chat_id: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  first_name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  last_name: Sequelize.STRING,
  phone: Sequelize.STRING,
  lang: Sequelize.STRING(10),
  system: Sequelize.STRING(20),
  orders: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  }
})
module.exports = Users
