const axios = require("axios");
const { TOKEN } = require("dotenv").config().parsed;
const Telegraf = require("telegraf");
const TelegrafI18n = require("telegraf-i18n");
const Stage = require("telegraf/stage");
const scenes = require("./scenes");
const path = require("path");
const { match } = TelegrafI18n;

require("./routes");
require("./models/user.model");
const { redisSession, getCategories } = require("./methods");

(async function resetBot() {
  await axios
    .get(`https://api.telegram.org/bot${TOKEN}/getUpdates?offset=-1`)
    .then((x) => x)
    .catch((x) => console.log(x));
})();

const bot = new Telegraf(TOKEN);
global.i18n = new TelegrafI18n({
  useSession: true,
  directory: path.resolve(__dirname, "locales"),
  defaultLanguage: "unset",
});
const stage = new Stage(Object.keys(scenes).map((x) => scenes[x]));

bot.catch((err, ctx) => {
  console.log(`Oops, encountered an error for ${ctx.updateType} `, err);
});

bot.use((ctx, next) => {
  if (ctx.chat && ctx.chat.type !== "private") {
    return;
  }
  return next(ctx);
});
bot.use(redisSession.middleware());
bot.use(i18n.middleware());
bot.use(stage.middleware());
bot.use(async (ctx, next) => {
  if (ctx.update.callback_query) {
    const time =
      new Date().getTime() - ctx.update.callback_query.message.date * 1000 >
      48 * 60 * 60 * 1000;
    ctx.session.time = time;
  }
  next();
});
bot.start(global.routes.start);
bot.hears(match("product"), global.routes.product);
bot.hears(match("my-orders"), global.routes.myOrders);
bot.hears(match("cabinet"), global.routes.profil);
bot.hears(match("about-us"), global.routes.aboutUs);

bot.on("text", async (ctx) => {
  await ctx.deleteMessage();
});

bot.startPolling();
