const {
  DB_NAME,
  DB_USER,
  DB_HOST,
  DB_PASSWORD,
  DB_DIALECT
}=require('dotenv').config().parsed
const Sequelize = require('sequelize')

const sequelize = new Sequelize(DB_NAME,DB_USER,DB_PASSWORD,{
  host:DB_HOST,
  dialect:DB_DIALECT,
})
module.exports=sequelize
