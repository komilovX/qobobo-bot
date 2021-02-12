const Orders = require("./models/orders.model");
const Op = require("sequelize").Op;
const enter = (scene) => (ctx) => ctx.scene.enter(scene);

const Markup = require("telegraf/markup");
global.routes = {
  start: async (ctx, regist = false, welcome = false) => {
    if (!ctx.session.language_code) {
      return routes.selectLanguage(ctx);
    }
    if (!ctx.session.isregistred) {
      return routes.register(ctx);
    }
    const btn = Markup.callbackButton;
    const loc = ctx.i18n;
    if (regist) {
      return ctx.reply(
        welcome ? ctx.i18n.t("greeting") : ctx.i18n.t("main-menu"),
        Markup.keyboard([
          [btn(loc.t("product"))],
          [btn(loc.t("my-orders"))],
          [btn(loc.t("cabinet"))],
        ])
          .resize()
          .extra()
      );
    }
    return ctx.reply(
      ctx.i18n.t("main-menu"),
      Markup.keyboard([
        [btn(loc.t("product"))],
        [btn(loc.t("my-orders"))],
        [btn(loc.t("cabinet"))],
      ])
        .resize()
        .extra()
    );
  },
  myOrders: async (ctx) => {
    const before = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
    const orders = await Orders.findAll({
      raw: true,
      where: { chat_id: ctx.chat.id, date: { [Op.gte]: before } },
    });
    if (orders.length > 0) {
      ctx.session.my_orders = orders;
      ctx.scene.enter("my-orders");
    } else {
      await ctx.reply(ctx.i18n.t("no-order"));
    }
  },
  selectLanguage: enter("select-language"),
  register: enter("register"),
  product: enter("product"),
  profil: enter("profil"),
  aboutUs: enter("about-us"),
  cart: enter("cart"),
  order: enter("order"),
};
