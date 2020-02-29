const Markup = require('telegraf/markup')
const WizardScene = require('telegraf/scenes/wizard')
const Composer = require('telegraf/composer')
const Extra = require('telegraf/extra');
const {match} = require('telegraf-i18n')

function buildKeyboard(arr, ctx, ctr) {
  const inln = Markup.callbackButton
  const loc = ctx.i18n
  const obj = arr[ctr]
  const products =
  JSON.parse(arr[ctr].products)
  .map(p => `${loc.t('product-name')} ${p.name}\n${loc.t('price')} ${p.price} ${loc.t('sum')}\n${loc.t('amount')} ${p.amount}\n\n`)
  .join('')
  const description = `${products}${loc.t('payment-type',{type:obj.payment_type=='card'?'💳':'💵'})}\n${loc.t('date',{date:new Date().toLocaleDateString('ru-RU')})}`
  const markup =  [
    [inln('⬅️','⬅️'),inln(`${ctr+1}-${arr.length}`,`${ctr+1}-${arr.length}`),inln('➡️','➡️')],
    [inln(loc.t('back'),loc.t('back'))]
  ]
  return{ description, markup}
}

module.exports = new WizardScene(
  'my-orders',
  async ctx => {
    await ctx.answerCbQuery()
    ctx.session.count = 0
    const {description, markup} = buildKeyboard(ctx.session.my_orders, ctx, 0)
    ctx.editMessageText(description, Extra.markdown().markup(
      Markup.inlineKeyboard(
        markup
      )
    )).then(v => ctx.session.message_id = v.message_id)
    ctx.wizard.next()
  },
  (new Composer())
  .command('start', async ctx => {
    ctx.session.my_orders = null
    await ctx.scene.leave()
    await global.routes.start(ctx, true)
    if (!ctx.session.time) {
      await ctx.deleteMessage(ctx.session.message_id)
    }
  })
  .action(match('back'), async ctx => {
    ctx.session.my_orders = null
    await ctx.answerCbQuery()
    await ctx.scene.leave()
    return global.routes.start(ctx)
  })
  .action('⬅️', async ctx => {
    if (ctx.session.count+1 > 1) {
      ctx.session.count -=1
      await ctx.answerCbQuery()
      const {description, markup} = buildKeyboard(ctx.session.my_orders, ctx, ctx.session.count)
      await ctx.editMessageText(description,
        Extra
        .markdown()
        .markup(
          Markup.inlineKeyboard(
            markup
          )
        )
      )
    }
    else{
      await ctx.answerCbQuery()
    }
  })
  .action('➡️', async ctx => {
    if (ctx.session.count+1 < ctx.session.my_orders.length) {
      ctx.session.count +=1
      await ctx.answerCbQuery()
      const {description, markup} = buildKeyboard(ctx.session.my_orders, ctx, ctx.session.count)
      await ctx.editMessageText(description,
        Extra
        .markdown()
        .markup(
          Markup.inlineKeyboard(
            markup
          )
        )
      )
    }
    else{
      await ctx.answerCbQuery()
    }
  })
  .action(/^\d/, async ctx => {
    await ctx.answerCbQuery()
  })
  .on('text', async ctx => {
    await ctx.deleteMessage()
  }),
)
