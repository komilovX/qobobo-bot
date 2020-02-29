const axios = require('axios')
const {TOKEN} = require('dotenv').config().parsed
const Telegraf=require('telegraf')
const TelegrafI18n=require('telegraf-i18n')
const Stage=require('telegraf/stage')
const scenes=require('./scenes')
const path=require('path')
const {match}=TelegrafI18n
const Orders = require('./models/orders.model');
const Op = require('sequelize').Op;
require('./routes')
require('./models/user.model')
const {
  redisSession,
  getCategories
} = require('./methods')

;(async function resetBot() {
  await axios.get(`https://api.telegram.org/bot${TOKEN}/getUpdates?offset=-1`).then(x => x).catch(x => console.log(x))
}());

const bot=new Telegraf(TOKEN)
global.i18n=new TelegrafI18n({
  useSession:true,
  directory:path.resolve(__dirname,'locales'),
  defaultLanguage:'unset'
})
const stage = new Stage(Object.keys(scenes).map(x=>scenes[x]))

bot.use((ctx, next) => {
  if(ctx.chat && ctx.chat.type !== 'private') {
    return;
  }
  return next(ctx);
})
bot.use(redisSession.middleware())
bot.use(i18n.middleware())
bot.use(stage.middleware())
bot.use(async (ctx, next) => {
  if (ctx.update.callback_query) {
    const time = new Date().getTime() - ctx.update.callback_query.message.date*1000 > 48*60*60*1000
    ctx.session.time = time
  }
  next()
})
bot.start(global.routes.start)
bot.action(match('product'),global.routes.product)
bot.action(match('brands'),global.routes.brands)
bot.action(match('my-orders'), async ctx => {
  const before = new Date().getTime() - 30*24*60*60*1000
  const orders = await Orders.findAll({ raw: true, where: { chat_id: ctx.chat.id, date: { [Op.gte]: before }} })
  if (orders.length>0) {
    ctx.session.my_orders = orders
    ctx.scene.enter('my-orders')
  }
  else {
    await ctx.answerCbQuery(ctx.i18n.t('no-order'),true)
  }
})
bot.action(match('cabinet'), global.routes.profil)
bot.action(match('about-us'), global.routes.aboutUs)

bot.on('text', async ctx => {
  await ctx.deleteMessage()
})

bot.startPolling()
