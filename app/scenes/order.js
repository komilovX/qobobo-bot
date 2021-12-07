const axios = require("axios");
const NodeGeocoder = require("node-geocoder");
const geolib = require("geolib");
const Markup = require("telegraf/markup");
const Extra = require("telegraf/extra");
const WizardScene = require("telegraf/scenes/wizard");
const Composer = require("telegraf/composer");
const { match } = require("telegraf-i18n");
const env = require("dotenv").config().parsed;
const { showTotalCheque, getDeliveryTimes } = require("../methods");
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
const ADMIN_USERNAME = 804489357;
async function createIncomingOrder(ctx) {
  try {
    const {
      first_name,
      last_name,
      phone,
      address,
      order_type,
      delivery,
      latitude,
      longitude,
    } = ctx.session;
    const order = await Orders.create({
      chat_id: ctx.chat.id,
      clientName: `${first_name} ${last_name}`,
      clientPhone: phone,
      address,
      products: JSON.stringify(ctx.session.cart),
      delivery,
      orderType: order_type,
      system: "Telegram",
      date: new Date().toUTCString(),
      latitude,
      longitude,
    });
    ctx.session.cart = [];
    ctx.session.in_cart = 0;
    axios
      .post(`${env.url}/api/orders/new_order`, {
        key: "new_order",
        orderId: order.id,
      })
      .catch(() => {});
    ctx.telegram
      .sendMessage(ADMIN_USERNAME, `Новый заказ #${order.id}`)
      .catch(() => {});
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
      ctx.session.latitude = latitude;
      ctx.session.longitude = longitude;
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
      const l = ctx.i18n;
      ctx
        .replyWithMarkdown(
          ctx.i18n.t("choose-payment-method"),
          Markup.keyboard([
            [l.t("cash")],
            [l.t("payme")],
            [l.t("back"), l.t("menu")],
          ])
            .resize()
            .extra()
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      ctx.wizard.next();
    })
    .on("text", (ctx) => {
      ctx.session.address = ctx.message.text;
      const l = ctx.i18n;
      ctx
        .replyWithMarkdown(
          ctx.i18n.t("choose-payment-method"),
          Markup.keyboard([
            [l.t("cash")],
            [l.t("payme")],
            [l.t("back"), l.t("menu")],
          ])
            .resize()
            .extra()
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      ctx.wizard.next();
    }),
  BasicComandHandler()
    .hears(match("back"), async (ctx) => {
      ctx
        .replyWithMarkdown(
          ctx.i18n.t("enter-address"),
          Markup.keyboard([
            [Markup.locationRequestButton(ctx.i18n.t("my-location"))],
            [ctx.i18n.t("menu")],
          ])
            .resize()
            .extra()
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      ctx.wizard.back();
    })
    .hears(match("menu"), async (ctx) => {
      await ctx.scene.leave();
      global.routes.start(ctx);
    })
    .hears(match("cash"), async (ctx) => {
      ctx.session.order_type = "cash";
      const check = await showTotalCheque(ctx);
      const l = ctx.i18n;
      ctx
        .replyWithMarkdown(
          check,
          Markup.keyboard([[l.t("confirm")], [l.t("cancel")]])
            .resize()
            .extra()
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      ctx.wizard.next();
    })
    .hears(match("click"), async (ctx) => {
      ctx.session.order_type = "click";
      const check = await showTotalCheque(ctx);
      const l = ctx.i18n;
      ctx
        .replyWithMarkdown(
          check,
          Markup.keyboard([[l.t("confirm")], [l.t("cancel")]])
            .resize()
            .extra()
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      ctx.wizard.next();
    })
    .hears(match("payme"), async (ctx) => {
      ctx.session.order_type = "payme";
      const check = await showTotalCheque(ctx);
      const l = ctx.i18n;
      ctx
        .replyWithMarkdown(
          check,
          Markup.keyboard([[l.t("confirm")], [l.t("cancel")]])
            .resize()
            .extra()
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      ctx.wizard.next();
    }),
  BasicComandHandler()
    .hears(match("back"), async (ctx) => {
      const l = ctx.i18n;
      ctx
        .replyWithMarkdown(
          ctx.i18n.t("choose-payment-method"),
          Markup.keyboard([
            [l.t("cash")],
            [l.t("payme")],
            [l.t("back"), l.t("menu")],
          ])
            .resize()
            .extra()
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      ctx.wizard.back();
    })
    .hears(match("cancel"), async (ctx) => {
      const l = ctx.i18n;
      await ctx
        .replyWithMarkdown(
          ctx.i18n.t("choose-payment-method"),
          Markup.keyboard([
            [l.t("cash")],
            [l.t("payme")],
            [l.t("back"), l.t("menu")],
          ])
            .resize()
            .extra()
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      ctx.wizard.back();
    })
    .hears(match("confirm"), async (ctx) => {
      try {
        let order = await createIncomingOrder(ctx);
        await ctx.deleteMessage(ctx.session.message_id);
        if (ctx.session.order_type === "payme") {
          const paymentUrl = Buffer.from(
            `m=${env.payme_id};ac.order_id=${order.id};a=${
              ctx.session.total * 100
            }`
          ).toString("base64");

          ctx.reply(
            ctx.i18n.t("pay-for-order"),
            Markup.keyboard([
              [Markup.callbackButton(ctx.i18n.t("product"))],
              [Markup.callbackButton(ctx.i18n.t("my-orders"))],
              [Markup.callbackButton(ctx.i18n.t("cart"))],
              [Markup.callbackButton(ctx.i18n.t("cabinet"))],
            ])
              .resize()
              .extra()
          );
          await ctx.replyWithMarkdown(
            ctx.i18n.t("pay-with-payme", { price: ctx.session.total }),
            Markup.inlineKeyboard([
              Markup.urlButton(
                ctx.i18n.t("pay"),
                `https://checkout.paycom.uz/${paymentUrl}`
              ),
            ])
              .resize()
              .extra()
          );
        } else {
          await ctx.replyWithMarkdown(
            ctx.i18n.t("will-call-you", { id: order.dataValues.id })
          );
          await ctx.scene.leave();
          global.routes.start(ctx, true);
        }
        ctx.session.cart = [];
        ctx.session.in_cart = 0;
        (ctx.session.delivery = null),
          (ctx.session.address = null),
          (ctx.session.distance = null);
      } catch (e) {
        console.log(e);
      }
    })
);
