const Sequelize = require('sequelize');
const sequelize = require('../../database');

const Category = sequelize.define('category', {
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  photo: Sequelize.STRING,
  parent_category: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  },
  hidden: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  }
})

module.exports = Category
