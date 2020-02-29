const Markup = require('telegraf/markup')
const Extra = require('telegraf/extra')
const WizardScene = require('telegraf/scenes/wizard')
const Composer = require('telegraf/composer')
const {match} = require('telegraf-i18n')
const {showCheque} = require('../methods')
function BuildCartKeyboard(arr, ctx){
  const btn = Markup.callbackButton
  const loc = ctx.i18n
    return arr
    .map(p => [btn(`❌ ${p.name}`,`${p.id}`)])
    .concat([[btn(loc.t('checkout'),loc.t('checkout')), btn(loc.t('clear'),loc.t('clear'))]])
    .concat([[btn(loc.t('back'),loc.t('back'))]])
}
module.exports = new WizardScene(
  'cart',
  async ctx => {
    if(ctx.session.cart.length === 0){
      ctx.reply('your-cart-is-empty')
      ctx.scene.leave()
      return global.routes.product(ctx)
    }
    else{
      const message = await ctx.replyWithMarkdown(ctx.i18n.t('cart-help'))
      ctx.session.message_id = message.message_id
      ctx.replyWithMarkdown(showCheque(ctx.session.cart, ctx),Markup.inlineKeyboard(
        BuildCartKeyboard(ctx.session.cart, ctx)
      ).resize().extra()).then(v => ctx.session.cart_message = v.message_id)
      ctx.wizard.next()
    }
  },
  (new Composer())
  .command('start', async ctx => {
    await ctx.scene.leave()
    await global.routes.start(ctx, true)
    try {
      if (!ctx.session.time) {
        await ctx.deleteMessage()
        await ctx.deleteMessage(ctx.session.cart_message)
        await ctx.deleteMessage(ctx.session.message_id)
      }
    } catch (e) {
      console.log(e);
    }
  })
  .action(match('back'),async ctx => {
    await ctx.answerCbQuery()
    try {
      if (!ctx.session.time) {
        await ctx.deleteMessage()
        await ctx.deleteMessage(ctx.session.message_id)
      }
    } catch (e) {
      console.log(e);
    }
    await ctx.scene.leave()
    return global.routes.start(ctx, true)
  })
  .action(match('clear'), async ctx => {
    ctx.session.cart = []
    ctx.session.in_cart = 0
    await ctx.answerCbQuery(ctx.i18n.t('cart-cleared'))
    await ctx.scene.leave()
    ctx.scene.enter('product', {newMessage: true})
    if (!ctx.session.time) {
      await ctx.deleteMessage()
      await ctx.deleteMessage(ctx.session.message_id)
    }
  })
  .action(match('checkout'), async ctx => {
    await ctx.answerCbQuery()
    if (!ctx.session.time) {
      await ctx.deleteMessage()
      await ctx.deleteMessage(ctx.session.message_id)
    }
    await ctx.scene.leave()
    return global.routes.order(ctx)
  })
  .action(/.+/, async ctx => {
    let product = ctx.match[0]
    const index = ctx.session.cart.findIndex(p => p.id == product)
    if (index === -1) {
      return
    }
    ctx.session.in_cart -= ctx.session.cart[index].amount
    ctx.session.cart.splice(index,1)
    if (!!ctx.session.cart.length) {
      ctx.editMessageText(showCheque(ctx.session.cart, ctx),Extra.markdown().markup((m) =>
        m.inlineKeyboard(BuildCartKeyboard(ctx.session.cart,ctx))
      ))
    }
    else{
      await ctx.answerCbQuery(ctx.i18n.t('cart-cleared'))
      if (!ctx.session.time) {
        await ctx.deleteMessage()
        await ctx.deleteMessage(ctx.session.message_id)
      }
      await ctx.scene.leave()
      return ctx.scene.enter('product',{newMessage:true})
    }
  })


)
