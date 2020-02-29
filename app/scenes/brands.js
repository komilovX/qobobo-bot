const Markup = require('telegraf/markup')
const Extra = require('telegraf/extra')
const WizardScene = require('telegraf/scenes/wizard')
const Composer = require('telegraf/composer')
const {match} = require('telegraf-i18n')
const {
  BasicStepHandler,
  getProductsByBrandAndCategory,
  checkLimit,
  productCaption,
  inlineKeyboard,
  ArrayConcat,
  getBrands,
  getCategoriesByBrandId
} = require('../methods');

module.exports = new WizardScene(
  'brands',
  async ctx => {
    ctx.session.offset = 0
    const brands = await getBrands(ctx, 0)
    ctx.session.brands = brands
    if (!brands) {
      await ctx.answerCbQuery(ctx.i18n.t('no-data'), true)
    }
    else{
      const { command } = ctx.scene.state
      if (command) {
        ctx.reply(ctx.i18n.t('choose-brand'), Markup.inlineKeyboard(
          ArrayConcat(brands, ctx, 'brand')
        ).resize().extra()).then(v => ctx.session.message_id = v.message_id)
        ctx.wizard.next()
      }
      else{
        await ctx.answerCbQuery()
        ctx.editMessageText(ctx.i18n.t('choose-brand'),Markup.inlineKeyboard(
          ArrayConcat(brands, ctx, 'brand')
        ,{ columns: 2 }).resize().extra()).then(v => ctx.session.message_id = v.message_id)
        ctx.wizard.next()
      }
    }
  },
  BasicStepHandler()
  .action(match('back'), async ctx => {
    await ctx.answerCbQuery()
    await ctx.scene.leave()
    ctx.session.brands = null
    return global.routes.start(ctx)
  })
  .action('➡️', async ctx => {
    const brands = await getBrands(ctx, ++ctx.session.offset)
    ctx.session.brands = brands
    if (brands.length > 0) {
      await ctx.editMessageText(ctx.i18n.t('choose-brand'),Markup.inlineKeyboard(
        ArrayConcat(brands, ctx, 'brand')
      ).resize().extra()).then(v => ctx.session.message_id = v.message_id)
      await ctx.answerCbQuery()
    }
    else {
      await ctx.answerCbQuery()
    }
  })
  .action('⬅️', async ctx => {
    if (ctx.session.offset > 0) {
      const brands = await getBrands(ctx, --ctx.session.offset)
      ctx.session.brands = brands
      await ctx.editMessageText(ctx.i18n.t('choose-brand'),Markup.inlineKeyboard(
        ArrayConcat(brands, ctx, 'brand')
      ).resize().extra()).then(v => ctx.session.message_id = v.message_id)
      await ctx.answerCbQuery()
    }
    else {
      await ctx.answerCbQuery()
    }
  })
  .action(/.+/, async ctx => {
    if (ctx.session.brands.map(v => v.id).includes(+ctx.match[0])) {
      let categories = await getCategoriesByBrandId(+ctx.match[0])
      if (categories.length > 0) {
        ctx.session.brandCategory = categories
        ctx.session.brand_id = +ctx.match[0]
        await ctx.editMessageText(ctx.i18n.t('choose-type-product'), Markup.inlineKeyboard(
          ArrayConcat(categories, ctx)
        ,{ columns: 2 }).resize().extra()).then(v => ctx.session.message_id = v.message_id)
        await ctx.answerCbQuery()
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
  (new Composer())
  .command('start', async ctx => {
    await ctx.scene.leave()
    await global.routes.start(ctx, true)
    try {
      if (!ctx.session.time) await ctx.deleteMessage(ctx.session.message_id)
    } catch (e) {
      console.log(e);
    }
  })
  .action(match('back'), async ctx => {
    await ctx.answerCbQuery()
    ctx.editMessageText(ctx.i18n.t('choose-brand'), Markup.inlineKeyboard(
      ArrayConcat(ctx.session.brands, ctx, 'brand')
    ,{ columns: 2 }).resize().extra()).then(v => ctx.session.message_id = v.message_id)
    ctx.session.brandCategory = null
    ctx.wizard.back()
  })
  .action(/.+/, async ctx => {
    ctx.session.time ? await ctx.answerCbQuery() : await ctx.deleteMessage()
    const brand_id = +ctx.session.brand_id
    const category_id = +ctx.match[0]
    const products = await getProductsByBrandAndCategory(brand_id, category_id)
    ctx.session.brandProducts = products
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
  })
  .on('text', async ctx => {
    await ctx.deleteMessage()
  }),
  BasicStepHandler()
  .action(match('back'), async ctx => {
    await ctx.answerCbQuery()
    if (!ctx.session.time) await ctx.deleteMessage()
    ctx.reply(ctx.i18n.t('choose-type-product'), Markup.inlineKeyboard(
      ArrayConcat(ctx.session.brandCategory, ctx)
    ,{ columns: 2 }).resize().extra()).then(v => ctx.session.message_id = v.message_id)
    ctx.session.brandProducts = null
    ctx.wizard.back()
  })
  .action(match('➡️'), async ctx => {
    if (ctx.session.nth+1 >= ctx.session.brandProducts.length) {
      await ctx.answerCbQuery()
    }
    else{
      ctx.session.nth +=1
      ctx.session.counter = 1
      let {brandProducts, nth, counter} = ctx.session
      await ctx.editMessageMedia(
        {
          media:brandProducts[nth].photo,
          type:'photo',
          caption: productCaption(ctx, brandProducts[nth])
        },Markup.inlineKeyboard(
          inlineKeyboard(ctx, nth, brandProducts.length, counter)
        ).resize().extra()
      )
      await ctx.answerCbQuery()
    }
  })
  .action(match('⬅️'), async ctx => {
    if (ctx.session.nth <= 0 || ctx.session.brandProducts.length == 1) {
      await ctx.answerCbQuery()
    }
    else{
      ctx.session.nth -= 1
      ctx.session.counter = 1
      let {brandProducts, nth, counter} = ctx.session
      await ctx.editMessageMedia(
        {
          media:brandProducts[nth].photo,
          type:'photo',
          parse_mode: 'Markdown',
          caption: productCaption(ctx, brandProducts[nth]),
        },Markup.inlineKeyboard(
          inlineKeyboard(ctx, nth, brandProducts.length, counter)
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
    let {brandProducts, nth, counter} = ctx.session
    await ctx.answerCbQuery()
    await ctx.editMessageReplyMarkup({
      inline_keyboard:inlineKeyboard(ctx, nth, brandProducts.length, counter)
    })
  })
  .action('-', async ctx => {
    if (ctx.session.counter <= 1) {
      await ctx.answerCbQuery()
    }
    else{
      ctx.session.counter -= 1
      let {brandProducts, nth, counter} = ctx.session
      await ctx.answerCbQuery()
      await ctx.editMessageReplyMarkup({
        inline_keyboard:inlineKeyboard(ctx, nth, brandProducts.length, counter)
      })
    }
  })
  .action(match('add-to-cart'), async ctx => {
    let {brandProducts, nth, counter} = ctx.session
    const {id, price, name, category_name} = brandProducts[nth]
    const index = ctx.session.cart.findIndex(p => p.id == id)
    const {message, value} = await checkLimit(id, counter, ctx)
    if (value) {
      if (index !== -1) {
        ctx.session.cart[index].amount += counter
      }
      else{
        ctx.session.cart.push({id, name, category: category_name, price, amount: counter})
      }
      ctx.session.counter = 1
      ctx.session.in_cart += counter
      await ctx.editMessageReplyMarkup({
        inline_keyboard: inlineKeyboard(ctx, nth, brandProducts.length, 1)
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

