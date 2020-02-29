const Markup = require('telegraf/markup')
const WizardScene = require('telegraf/scenes/wizard')
const {match} = require('telegraf-i18n')
const {
  BasicStepHandler,
  getCategories,
  getProducts,
  productCaption,
  checkLimit,
  ArrayConcat,
  inlineKeyboard
} = require('../methods')

module.exports = new WizardScene(
  'product',
  async ctx => {
    let category = await getCategories()
    ctx.session.catalog = category
    const parents = category.filter(p => p.parent_category == 0)
    ctx.session.parents = parents
    const {status, newMessage} = ctx.scene.state
    if (newMessage) {
      ctx.reply(status ? status : ctx.i18n.t('choose-category'), Markup.inlineKeyboard(
        ArrayConcat(parents, ctx, 'category')
      ,{ columns: 2 }).extra()).then(v => ctx.session.message_id == v.message_id)
      ctx.wizard.next()
    }
    else{
      await ctx.answerCbQuery()
      ctx.editMessageText(status ? status : ctx.i18n.t('choose-category'), Markup.inlineKeyboard(
        ArrayConcat(parents, ctx, 'category')
      ,{ columns: 2 }).extra()).then(v => ctx.session.message_id = v.message_id)
      ctx.wizard.next()
    }
  },
  BasicStepHandler()
  .action(match('back'), async ctx => {
    ctx.session.parents = null
    ctx.session.catalog = null
    await ctx.answerCbQuery()
    await ctx.scene.leave()
    return global.routes.start(ctx)
  })
  .action(/.+/,async ctx => {
    if(ctx.session.parents.map(x => x.id).includes(+ctx.match[0])){
      const {id} = ctx.session.catalog.find(c => c.id == ctx.match[0])
      const brends = ctx.session.catalog.filter(p => p.parent_category == id)
      if (brends.length == 0) {
        const products = await getProducts(id)
        if (products.length > 0) {
          await ctx.answerCbQuery()
          if (!ctx.session.time) await ctx.deleteMessage()
          ctx.session.products = products
          ctx.session.counter = 1
          ctx.session.nth = 0
          const product = products[0]
          ctx.replyWithPhoto(product.photo,{
            caption: productCaption(ctx,  product),
            reply_markup:Markup.inlineKeyboard(
              inlineKeyboard(ctx, 0, products.length, 1)
            )
          }).then(v => ctx.session.message_id = v.message_id)
          ctx.scene.state.no_brand = true
          ctx.wizard.selectStep(3)
        }
        else {
          await ctx.answerCbQuery(ctx.i18n.t('no-data'), true)
        }
      }else{
        await ctx.answerCbQuery()
        ctx.session.brends = brends
        ctx.editMessageText(ctx.i18n.t('choose-type-product'),Markup.inlineKeyboard(
          ArrayConcat(brends,ctx)
        ,{ columns: 2 }).extra()).then(v => ctx.session.message_id = v.message_id)
        ctx.wizard.next()
      }
    }
  })
  // .on('text', async ctx => {
  //   await ctx.deleteMessage()
  // }),
  ,
  BasicStepHandler()
    .action(match('back'), async ctx => {
      await ctx.answerCbQuery()
      ctx.editMessageText(ctx.i18n.t('choose-category'),Markup.inlineKeyboard(
        ArrayConcat(ctx.session.parents,ctx,'category')
      ,{ columns: 2 }).extra())
      ctx.wizard.back()
    })
    .action(/.+/, async ctx => {
      if(ctx.session.brends.map(x => x.id).includes(+ctx.match[0])){
        const products = await getProducts(+ctx.match[0])
        if (products.length > 0) {
          await ctx.answerCbQuery()
          if (!ctx.session.time) await ctx.deleteMessage()
          ctx.session.products = products
          ctx.session.counter = 1
          ctx.session.nth = 0
          const product = products[0]
          ctx.replyWithPhoto(product.photo,{
            caption: productCaption(ctx, product),
            reply_markup:Markup.inlineKeyboard(
              inlineKeyboard(ctx, 0, products.length, 1)
            )
          }).then(v => ctx.session.message_id = v.message_id)
          ctx.wizard.next()
        }
        else {
          await ctx.answerCbQuery(ctx.i18n.t('no-data'), true)
        }
      }
    })
    .on('text', async ctx => {
      await ctx.deleteMessage()
    }),
    BasicStepHandler()
      .action(match('back'), async ctx => {
        const {no_brand} = ctx.scene.state
        ctx.session.products = null
        if (no_brand) {
          await ctx.answerCbQuery()
          if (!ctx.session.time) await ctx.deleteMessage()
          ctx.reply(ctx.i18n.t('choose-category'),Markup.inlineKeyboard(
            ArrayConcat(ctx.session.parents, ctx, 'category')
          ,{ columns: 2 }).extra()).then(v => ctx.session.message_id = v.message_id)
          ctx.wizard.selectStep(1)
        }
        else{
          await ctx.answerCbQuery()
          if (!ctx.session.time) await ctx.deleteMessage()
          ctx.reply(ctx.i18n.t('choose-type-product'),Markup.inlineKeyboard(
            ArrayConcat(ctx.session.brends,ctx)
          ,{ columns: 2 }).extra()).then(v => ctx.session.message_id = v.message_id)
          ctx.wizard.back()
        }
      })
      .action(match('➡️'), async ctx => {
        if (ctx.session.nth+1 >= ctx.session.products.length) {
          await ctx.answerCbQuery()
        }else{
          ctx.session.nth +=1
          ctx.session.counter = 1
          let {products, nth, counter} = ctx.session
          await ctx.editMessageMedia(
            {
              media:products[nth].photo,
              type:'photo',
              caption: productCaption(ctx, products[nth])
            },Markup.inlineKeyboard(
              inlineKeyboard(ctx, nth, products.length, counter)
            ).resize().extra()
          )
          await ctx.answerCbQuery()
        }
      })
      .action(match('⬅️'), async ctx => {
        if (ctx.session.nth <= 0 || ctx.session.products.length == 1) {
          await ctx.answerCbQuery()
        }else{
          ctx.session.nth -= 1
          ctx.session.counter = 1
          let {products, nth, counter} = ctx.session
          await ctx.editMessageMedia(
            {
              media:products[nth].photo,
              type:'photo',
              parse_mode: 'Markdown',
              caption: productCaption(ctx, products[nth]),
            },Markup.inlineKeyboard(
              inlineKeyboard(ctx, nth, products.length, counter)
            ).resize().extra()
          )
          await ctx.answerCbQuery()
        }
      })
      .action(/^\d/, async ctx => {
        await ctx.answerCbQuery()
      })
      .action('+', async ctx => {
        ctx.session.counter +=1
        let {products, nth, counter} = ctx.session
        await ctx.answerCbQuery()
        await ctx.editMessageReplyMarkup({
          inline_keyboard:inlineKeyboard(ctx, nth, products.length, counter)
        })
      })
      .action('-', async ctx => {
        if (ctx.session.counter <= 1) {
          await ctx.answerCbQuery()
        }
        else{
          ctx.session.counter -= 1
          let {products, nth, counter} = ctx.session
          await ctx.answerCbQuery()
          await ctx.editMessageReplyMarkup({
            inline_keyboard:inlineKeyboard(ctx, nth, products.length, counter)
          })
        }
      })
      .action(match('add-to-cart'), async ctx => {
        let {products, nth, counter} = ctx.session
        const {id, price, name, category_name} = products[nth]
        const {message, value} = await checkLimit(id, counter, ctx)
        if (value) {
          const index = ctx.session.cart.findIndex(p => p.id == id)
          if (index !== -1) {
            ctx.session.cart[index].amount += counter
          }
          else{
            ctx.session.cart.push({id, name, category: category_name, price, amount: counter})
          }
          ctx.session.counter = 1
          ctx.session.in_cart += counter
          await ctx.editMessageReplyMarkup({
            inline_keyboard: inlineKeyboard(ctx, nth, products.length, 1)
          })
          await ctx.answerCbQuery(ctx.i18n.t('lets-continue'),true)
        }
        else {
          await ctx.answerCbQuery(message,true)
        }
      })
      .on('text', ctx => {
        ctx.deleteMessage()
      }),
)
