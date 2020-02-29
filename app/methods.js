const _ = require('lodash');
const Session = require('telegraf-session-mysql')
const env = require('dotenv').config().parsed
const Composer = require('telegraf/composer')
const Markup = require('telegraf/markup')
const {match} = require('telegraf-i18n')
const Op = require('sequelize').Op;

const Users = require('./models/user.model');
const Category = require('./models/category.model');
const Products = require('./models/product.model');
const Brands = require('./models/brand.model');
const Remainder = require('./models/remainder.model')
const redisSession = new Session({
    host:env.DB_HOST,
    user:env.DB_USER,
    password:'',
    database:env.DB_NAME
})


Number.prototype.format = function(n, x, s, c) {
  var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\D' : '$') + ')',
      num = this.toFixed(Math.max(0, ~~n));

  return (c ? num.replace('.', c) : num).replace(new RegExp(re, 'g'), '$&' + (s || ','));
};

function calculateDelivery(distance) {
  const metr = parseInt(+distance/1000)
  if (metr <= 7) {
    return 10000
  }
  else if (metr <= 10) {
    return 15000
  }
  else {
    let cost = ((metr-10)*1000) + 15000
    return cost
  }
}

async function checkLimit(id, num, ctx) {
  const product = await Remainder.findOne({where: {product_id: id}, raw: true})
  if (!!product) {
    if (product.residue >= num && product.residue != 0) {
      return {message: '', value: true}
    }
    else if(product.residue == 0){
      return {message: ctx.i18n.t('product-in-stoplist'), value: false}
    }
    else {
      return {message: ctx.i18n.t('product-cant-order',{num: product.residue}), value: false}
    }
  }
  else {
    return {message: ctx.i18n.t('product-in-stoplist'), value: false}
  }
}
function BasicStepHandler(handler){
  if(!handler){
    handler = new Composer()
  }
  handler
  .command('start', async ctx => {
    await ctx.scene.leave()
    await global.routes.start(ctx, true)
    try {
      if (!ctx.session.time) await ctx.deleteMessage(ctx.session.message_id)
    } catch (e) {
      console.log(e);
    }
  })
  .action(match('checkout'), async ctx => {
    if (ctx.session.cart.length === 0) {
      await ctx.answerCbQuery(ctx.i18n.t('your-cart-is-empty'),true)
    }
    else{
      await ctx.deleteMessage()
      await ctx.scene.leave()
      return global.routes.order(ctx)
    }
  })
  .action(/^🛒\s([A-Za-zА-Яа-я])+\s\(\d+\)/,async ctx => {
    if(ctx.session.cart.length === 0){
      await ctx.answerCbQuery(ctx.i18n.t('your-cart-is-empty'), true)
    }
    else{
      await ctx.answerCbQuery()
      await ctx.deleteMessage()
      await ctx.scene.leave()
      return global.routes.cart(ctx)
    }
  })
  return handler
}

async function registerUser(ctx) {
  try {
    const {language_code, first_name, last_name = null, phone} = ctx.session
    await Users.create({
      chat_id: ctx.chat.id,
      first_name,
      last_name,
      phone,
      lang: language_code,
      system: 'telegram',
    })
    return true
  } catch (e) {
    console.log(e)
    throw e
  }
}

async function getCategories(){
  const categories = await Category.findAll(
    {where:{
      hidden: {[Op.ne]: 1}
    }},
    {raw: true})
  return categories
}
async function getProducts(id){
  let products = await Products.findAll({where: { category_id: id }, raw: true})
  products = products.map(p => {
    p.photo = env.url+p.photo
    return p
  })
  return products
}
async function getBrands(id, offset){
  let brands = await Brands.findAll({offset: offset*10, limit: 10,order: [['name', 'ASC']], raw: true})
  return brands
}
async function getCategoriesByBrandId(id) {
  let category = await Products.findAll({where: { brand_id: id }, attributes: ['category_name', 'category_id'], raw: true})
  category = _.uniqBy( _.map(category, function(v) { return {name: v.category_name, id: v.category_id}}), 'name')
  return category
}
async function getProductsByBrandAndCategory(brand_id, category_id) {
  let products = await Products.findAll({where: { brand_id, category_id }, raw: true})
  products = products.map(p => {
    p.photo = env.url+p.photo
    return p
  })
  return products
}
function productCaption(ctx, product) {
  const options = {
    category: product.category_name,
    brand: product.brand,
    product: product.name,
    comment: product.comment,
    cost: new Intl.NumberFormat('ru-RU').format(product.price)
  }
  return ctx.i18n.t('product-caption', options)
}

function ArrayConcat(arr, ctx, type){
  const btn = Markup.callbackButton
  const loc = ctx.i18n
  let cart = ctx.session.in_cart
  const head = [btn(`${loc.t('cart')} (${cart || 0})`,`${loc.t('cart')} (${cart || 0})`), btn(loc.t('checkout'),loc.t('checkout'))]
  const category = arr.map(x => btn(x.name,x.id))

  if(type=='category'){
    const category = arr.map(x => btn(x.name, x.id))
    return [...head, ...category, btn(loc.t('back'),loc.t('back'))]
  }
  else if(type == 'brand') {
    const arrows = [btn('⬅️', '⬅️'), btn('➡️', '➡️')]
    let catalog = _.chunk(category, 2)
    return [head, ...catalog, arrows, [ btn(loc.t('back'), loc.t('back'))]]
  }
  return [...category,btn(loc.t('back'),loc.t('back'))]
}

function inlineKeyboard(ctx, nth, length, counter){
  const btn = Markup.callbackButton
  const loc = ctx.i18n
  let cart = ctx.session.in_cart
  return [
    [btn('⬅️','⬅️'),btn(`${nth+1}-${length}`,`${nth}-${length}`),btn('➡️','➡️')],
    [btn('-','-'),btn(`${counter}`,`${counter}`),btn('+','+')],
    [btn(loc.t('add-to-cart'),loc.t('add-to-cart'))],
    [btn(loc.t('back'),loc.t('back')),btn(`${loc.t('cart')} (${cart || 0})`,`${loc.t('cart')} (${cart || 0})`)]
  ]
}

function showCheque(cart, ctx){
  const loc = ctx.i18n.locale()
  const sums = []
  const products = []
  cart.forEach(p => {
    let total = p.amount*(+p.price)
    sums.push(total)
      products.push(`*${p.name}:*\n*${p.amount} x ${Number(p.price).format(0,3,' ')}* = *${total.format(0,3,' ')}* ${loc == 'uz' ? "so'm" : "сум"}\n\n`)
  })
  const total = sums.reduce((acc,cur) => acc+cur)
  ctx.session.total = total
  return `*${ctx.i18n.t('cart')}*:\n\n${products.join('')}\n*${ctx.i18n.t('total')}*: ${total.format(0,3,' ')} ${loc == 'uz' ? "so'm" : "сум"}`
}

function showTotalCheque(ctx){
  const loc = ctx.i18n.locale()
  const sums = []
  const items = ctx.session.cart.map(p => {
    let total = p.amount*p.price
    sums.push(total)
    return `${p.name}:\n${p.amount} x ${Number(p.price).format(0,3,' ')} = ${total.format(0,3,' ')} ${loc=='uz'?"so'm":"сум"}\n\n`
  })
  let delivery = calculateDelivery(ctx.session.distance)
  ctx.session.delivery = delivery
  const total = sums.reduce((acc,cur) => acc+cur) + delivery

  const joinItems = items.join('')
  let deliveryText = ctx.i18n.t('delivery-cost',{cost: `${Number(delivery).format(0,3,' ')}`})
  const {phone, address, order_type} = ctx.session
  return `${ctx.i18n.t('total-check',{phone, address, order_type})}\n\n${joinItems}${deliveryText}\n\n${ctx.i18n.t('total')}: ${total.format(0,3,' ')} ${loc=='uz'?"so'm":"сум"}`
}

module.exports = {
  BasicStepHandler,
  redisSession,
  registerUser,
  getCategories,
  getProducts,
  getBrands,
  getProductsByBrandAndCategory,
  getCategoriesByBrandId,
  checkLimit,
  productCaption,
  ArrayConcat,
  showCheque,
  inlineKeyboard,
  showTotalCheque,
}
