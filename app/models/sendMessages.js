const Sequelize = require("sequelize");
const sequelize = require("../../database");

const SendMessages = sequelize.define(
  "send_messages",
  {
    date: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    title_ru: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    message: {
      type: Sequelize.STRING(900),
      allowNull: false,
    },
    message_ru: {
      type: Sequelize.STRING(900),
      allowNull: false,
    },
    photo: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    status: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    createdAt: false,
    updatedAt: false,
  }
);

module.exports = SendMessages;
