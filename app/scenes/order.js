const axios = require("axios");
const NodeGeocoder = require("node-geocoder");
const geolib = require("geolib");
const Markup = require("telegraf/markup");
const Extra = require("telegraf/extra");
const WizardScene = require("telegraf/scenes/wizard");
const Composer = require("telegraf/composer");
const { match } = require("telegraf-i18n");
const env = require("dotenv").config().parsed;
const { showTotalCheque } = require("../methods");
const Orders = require("../models/orders.model");
function geoCoder() {
  const options = {
    provider: "yandex",
    httpAdapter: "https",
    apiKey: "929b3d35-abac-41ec-92b4-b3375c431ffb",
    formatter: null,
  };
  const geocoder = NodeGeocoder(options);
  return geocoder;
}
async function createIncomingOrder(ctx) {
  try {
    const { first_name, phone, address, order_type, delivery } = ctx.session;
    const order = await Orders.create({
      chat_id: ctx.chat.id,
      clientName: first_name,
      clientPhone: phone,
      address,
      products: JSON.stringify(ctx.session.cart),
      delivery,
      orderType: order_type,
      system: "Telegram",
      date: new Date().toUTCString(),
    });
    ctx.session.cart = [];
    ctx.session.in_cart = 0;
    return order;
  } catch (error) {
    throw error;
  }
}

function BasicComandHandler(handler) {
  if (!handler) {
    handler = new Composer();
  }
  handler.command("start", async (ctx) => {
    await ctx.scene.leave();
    await global.routes.start(ctx, true);
    if (!ctx.session.time) {
      await ctx.deleteMessage(ctx.session.message_id);
    }
  });
  return handler;
}
module.exports = new WizardScene(
  "order",
  async (ctx) => {
    ctx
      .reply(
        ctx.i18n.t("enter-address"),
        Markup.keyboard([
          [Markup.locationRequestButton(ctx.i18n.t("my-location"))],
          [ctx.i18n.t("menu")],
        ])
          .resize()
          .extra()
      )
      .then((val) => (ctx.session.message_id = val.message_id));
    ctx.wizard.next();
  },
  BasicComandHandler()
    .hears(match("menu"), async (ctx) => {
      await ctx.scene.leave();
      global.routes.start(ctx, true);
      try {
        await ctx.deleteMessage();
        await ctx.deleteMessage(ctx.session.message_id);
      } catch (error) {
        console.log(error);
        throw error;
      }
    })
    .on("location", async (ctx) => {
      const { latitude, longitude } = ctx.message.location;
      const distance = geolib.getDistance(
        { latitude, longitude },
        { latitude: 41.317104, longitude: 69.283132 }
      );
      ctx.session.distance = distance;
      geoCoder().reverse({ lat: latitude, lon: longitude }, (err, res) => {
        if (err) throw err;
        const location = res.find((l) => !!l.streetName && !!l.streetNumber);
        if (location) {
          ctx.session.address = location.formattedAddress;
        } else {
          const street = res[0];
          ctx.session.address = street.formattedAddress;
        }
      });
      const btn = Markup.callbackButton;
      const l = ctx.i18n;
      if (!ctx.session.time) await ctx.deleteMessage(ctx.session.message_id);
      ctx
        .replyWithMarkdown(
          ctx.i18n.t("choose-payment-method"),
          Markup.inlineKeyboard([
            [btn(l.t("cash"), l.t("cash"))],
            [btn(l.t("payme"), l.t("payme")), btn(l.t("click"), l.t("click"))],
            [btn(l.t("back"), l.t("back")), btn(l.t("menu"), l.t("menu"))],
          ])
            .resize()
            .extra()
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      ctx.wizard.next();
    }),
  BasicComandHandler()
    .action(match("back"), async (ctx) => {
      if (!ctx.session.time) {
        await ctx.deleteMessage(ctx.session.message_id);
      }
      await ctx.answerCbQuery();
      ctx
        .reply(
          ctx.i18n.t("enter-address"),
          Markup.keyboard([
            [Markup.locationRequestButton(ctx.i18n.t("my-location"))],
            [ctx.i18n.t("menu")],
          ])
            .oneTime()
            .resize()
            .extra()
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      ctx.wizard.back();
    })
    .action(match("menu"), async (ctx) => {
      await ctx.scene.leave();
      return ctx.scene.enter("product");
    })
    .action(match("cash"), async (ctx) => {
      ctx.session.order_type = ctx.i18n.t("cash");
      const check = showTotalCheque(ctx);
      const btn = Markup.callbackButton;
      const l = ctx.i18n;
      ctx
        .editMessageText(
          check,
          Extra.markdown().markup(
            Markup.inlineKeyboard([
              [btn(l.t("confirm"), l.t("confirm"))],
              [btn(l.t("cancel"), l.t("cancel"))],
            ])
          )
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      await ctx.answerCbQuery();
      ctx.wizard.next();
    })
    .action(match("click"), async (ctx) => {
      ctx.session.order_type = ctx.i18n.t("click");
      const check = await showTotalCheque(ctx);
      const btn = Markup.callbackButton;
      const l = ctx.i18n;
      ctx
        .editMessageText(
          check,
          Extra.markdown().markup(
            Markup.inlineKeyboard([
              [btn(l.t("confirm"), l.t("confirm"))],
              [btn(l.t("cancel"), l.t("cancel"))],
            ])
          )
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      await ctx.answerCbQuery();
      ctx.wizard.next();
    })
    .action(match("payme"), async (ctx) => {
      ctx.session.order_type = ctx.i18n.t("payme");
      const check = await showTotalCheque(ctx);
      const btn = Markup.callbackButton;
      const l = ctx.i18n;
      ctx
        .editMessageText(
          check,
          Extra.markdown().markup(
            Markup.inlineKeyboard([
              [btn(l.t("confirm"), l.t("confirm"))],
              [btn(l.t("cancel"), l.t("cancel"))],
            ])
          )
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      await ctx.answerCbQuery();
      ctx.wizard.next();
    }),
  BasicComandHandler()
    .action(match("back"), async (ctx) => {
      await ctx.deleteMessage();
      const btn = Markup.callbackButton;
      const l = ctx.i18n;
      ctx
        .replyWithMarkdown(
          ctx.i18n.t("choose-payment-method"),
          Markup.inlineKeyboard([
            [btn(l.t("cash"), l.t("cash"))],
            [btn(l.t("payme"), l.t("payme")), btn(l.t("click"), l.t("click"))],
            [btn(l.t("back"), l.t("back")), btn(l.t("menu"), l.t("menu"))],
          ])
            .resize()
            .extra()
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      ctx.wizard.back();
    })
    .action(match("cancel"), async (ctx) => {
      const btn = Markup.callbackButton;
      const l = ctx.i18n;
      await ctx
        .editMessageText(
          ctx.i18n.t("choose-payment-method"),
          Extra.markdown().markup(
            Markup.inlineKeyboard([
              [btn(l.t("cash"), l.t("cash"))],
              [
                btn(l.t("payme"), l.t("payme")),
                btn(l.t("click"), l.t("click")),
              ],
              [btn(l.t("back"), l.t("back")), btn(l.t("menu"), l.t("menu"))],
            ])
          )
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      await ctx.answerCbQuery();
      ctx.wizard.back();
    })
    .action(match("confirm"), async (ctx) => {
      try {
        let order = await createIncomingOrder(ctx);
        await ctx.deleteMessage(ctx.session.message_id);
        await ctx.replyWithMarkdown(
          ctx.i18n.t("will-call-you", { id: order.dataValues.id })
        );
        ctx.session.cart = [];
        ctx.session.in_cart = 0;
        (ctx.session.delivery = null),
          (ctx.session.address = null),
          (ctx.session.distance = null);
        await ctx.scene.leave();
        return global.routes.start(ctx, true);
      } catch (e) {
        console.log(e);
      }
    })
);
