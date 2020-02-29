const axios = require('axios');
const Markup = require('telegraf/markup')
const env = require('dotenv').config().parsed

const url = `https://profficosmetics.joinposter.com/api/clients.getPromotions?token=${env.PROFI_TOKEN}`


Number.prototype.format = function(n, x, s, c) {
  var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\D' : '$') + ')',
      num = this.toFixed(Math.max(0, ~~n));

  return (c ? num.replace('.', c) : num).replace(new RegExp(re, 'g'), '$&' + (s || ','));
};
async function getProducts(arr) {
  const product = []
  for (let i = 0; i < arr.params.conditions.length; i++) {
    let p = arr.params.conditions[i]
    let prod_url = `https://joinposter.com/api/menu.getProduct?token=${env.PROFI_TOKEN}&product_id=${p.id}`
    const {data:{response=null}} = await axios.get(prod_url)
    let cost = response.spots[0].price/100
    product.push({id:response.product_id,name:response.product_name,cost:cost*p.pcs,amount:p.pcs,promo_id:arr.promotion_id})
  }
  return product
}

function Formatter(num) {
  return Number(num).format(0,3,' ')
}

function replyMarkup(ctx, ctr, last) {
  const cart = ctx.session.in_cart
  let l = ctx.i18n
  let btn = Markup.callbackButton
  return [
    [btn('⬅️','⬅️'),btn(`${ctr+1}-${last}`,`${ctr+1}-${last}`),btn('➡️','➡️')],
    [btn(l.t('buy'), l.t('buy'))],
    [btn(l.t('back'),l.t('back')),btn(`${l.t('cart')} (${cart || 0})`,`${l.t('cart')} (${cart || 0})`)]
  ]
}
async function getPromotions(ctx) {
  ctx.session.bonus = []
  ctx.session.fixedSum = []
  ctx.session.percent = []
  const result = []
  const {data:{response=null}} = await axios.get(url)
  if(response){
    response.filter(p => {
      const dt = new Date().getTime()
      let date = new Date(p.date_start).getTime() <= dt && new Date(p.date_end).getTime() >= dt
        return date
    }).forEach(e => {
      let condition = (e.params.conditions[0].type > 0 && e.params.conditions_rule == 'and') || e.params.conditions.length == 1
      switch (e.params.result_type) {
        case '1':
          if (!result.includes('1')) {
            result.push('1')
          }
          ctx.session.bonus.push(e)
          break;
        case '2':
          if (condition) {
            if (!result.includes('2')) {
              result.push('2')
            }
            ctx.session.fixedSum.push(e)
          }
          break;
        case '3':
          if (condition) {
            if (!result.includes('3')) {
              result.push('3')
            }
            ctx.session.percent.push(e)
          }
          break;
      }
    });
    if (result.length == 0) {
      return null
    }
    else {
      return result
    }
  }
  else{
    return null
  }
}

function BonusCondition(params, coast, ctx) {
  switch (params.bonus_products_condition_type) {
    case '1':
      let sum = coast*((100-(+params.bonus_products_condition_value))/100)
      ctx.session.b_cost = sum
      return ctx.i18n.t('percent-promo',{percent:params.bonus_products_condition_value,coast:Number(sum).format(0,3, ' ')})
      break;
    case '2':
      let sm = coast - (+params.bonus_products_condition_value/100)
      ctx.session.b_cost = sm
      return ctx.i18n.t('sum-promo',{sum:Number(params.bonus_products_condition_value/100).format(0,3,' '),coast:Number(sm).format(0,3, ' ')})
      break;
    case '3':
      ctx.session.b_cost = params.bonus_products_condition_value/100
      return ctx.i18n.t('fixed-promo',{sum:Number(params.bonus_products_condition_value/100).format(0,3,' ')})
      break;
  }
}
async function getBonusPromo(ctx,arr, ctr, last) {
  if (arr.params.conditions[0].type == 0) {
    let id = arr.params.bonus_products[0].id
    let prod_url = `https://joinposter.com/api/menu.getProduct?token=${env.PROFI_TOKEN}&product_id=${id}`
    const {data:{response=null}} = await axios.get(prod_url)
    let l = ctx.i18n
    let btn = Markup.callbackButton
    let cost = response.spots[0].price/100
    const condition = BonusCondition(arr.params, cost, ctx)
    const description =
    `${l.t('bonus-product')}\n${l.t('product-name')}${response.product_name}\n${l.t('price')}: ${Number(cost).format(0,3,' ')} ${l.t('sum')}
${l.t('amount')}${arr.params.bonus_products_pcs}
\n${l.t('bonus-condition')}${l.t('sum-condition',{sum: Number(arr.params.conditions[0].sum/100).format(0,3,' ')})}
\n${l.t('promo')}\n${condition}`
    const markup = [
      [btn('⬅️','⬅️'),btn(`${ctr+1}-${last}`,`${ctr+1}-${last}`),btn('➡️','➡️')],
      [btn(l.t('back'),l.t('back'))]
    ]
    const photo = response.photo?`${env.url}${response.photo}`:env.no_image
    return {description, markup, photo}
  }
  else{
    const products = await getProducts(arr)
    ctx.session.bonus_products = products
    let id = arr.params.bonus_products[0].id
    let url = `https://joinposter.com/api/menu.getProduct?token=${env.PROFI_TOKEN}&product_id=${id}`
    const {data:{response=null}} = await axios.get(url)
    let cost = response.spots[0].price/100
    ctx.session.b_product = {id:response.product_id,name:response.product_name,amount:arr.params.bonus_products_pcs,promo_id:arr.promotion_id}
    let l = ctx.i18n
    let btn = Markup.callbackButton
    const condition = BonusCondition(arr.params, cost, ctx)
    const description =
    `${l.t('bonus-product')}\n${l.t('product-name')}${response.product_name}\n${l.t('price')}: ${Number(cost).format(0,3,' ')} ${l.t('sum')}
${l.t('amount')}${arr.params.bonus_products_pcs}
\n${l.t('bonus-condition')}${l.t('condition-and')}
${products.map((p, i) => `${i+1}) ${p.name}\n${l.t('amount')} ${p.amount}\n${l.t('price')}${Formatter(p.cost)} ${l.t('sum')};\n\n`).join(' ')}${l.t('promo')}\n${condition}`;

  let cart = ctx.session.in_cart
    const markup = [
      [btn('⬅️','⬅️'),btn(`${ctr+1}-${last}`,`${ctr+1}-${last}`),btn('➡️','➡️')],
      [btn(l.t('buy'), l.t('buy'))],
      [btn(l.t('back'),l.t('back')),btn(`${l.t('cart')} (${cart || 0})`,`${l.t('cart')} (${cart || 0})`)]
    ]
    const photo = response.photo?`${env.url}${response.photo}`:env.no_image
    return {description, markup, photo}
  }
}

// ===== fixed-sum methods =======

async function getFixedSumPromo(ctx, arr, ctr, last){
  const products = await getProducts(arr)
  ctx.session.promo_products = products
  let l = ctx.i18n
  let btn = Markup.callbackButton
  const dicount = arr.params.discount_value/100
  ctx.session.dicount = dicount
  const total = products.reduce((acc,prev) => (acc+(prev.cost-(dicount*prev.amount))),0)
  const description =
    `${l.t('bonus-condition')}${arr.params.conditions_rule=='or'?l.t('condition-or'):l.t('condition-and')}\n
${products.map((p, i) => `${i+1}) ${p.name}\n${l.t('amount')} ${p.amount}\n${l.t('price')}${Formatter(p.cost)} ${l.t('sum')};\n\n`).join('')}${l.t('promo-amount')}
${Formatter(dicount)} ${l.t('sum')}\n${l.t('total')}\n${Formatter(total)} ${l.t('sum')}`;
const cart = ctx.session.in_cart
const markup = [
  [btn('⬅️','⬅️'),btn(`${ctr+1}-${last}`,`${ctr+1}-${last}`),btn('➡️','➡️')],
  [btn(l.t('buy'), l.t('buy'))],
  [btn(l.t('back'),l.t('back')),btn(`${l.t('cart')} (${cart || 0})`,`${l.t('cart')} (${cart || 0})`)]
]

return {description, markup}
}

// ======= percentPromo ===========


async function getPercentPromo(ctx, arr, ctr, last) {
  const products = await getProducts(arr)
  ctx.session.promo_products = products
  let l = ctx.i18n
  let btn = Markup.callbackButton
  const dicount = arr.params.discount_value
  ctx.session.dicount = dicount
  const total = products.reduce((acc,prev) => (acc+(prev.cost*((100-dicount)/100))),0)
  const description =
    `${l.t('bonus-condition')}${arr.params.conditions_rule=='or'?l.t('condition-or'):l.t('condition-and')}\n
${products.map((p, i) => `${i+1}) ${p.name}\n${l.t('amount')} ${p.amount}\n${l.t('price')}${Formatter(p.cost)} ${l.t('sum')};\n\n`).join('')}${l.t('promo-amount')}
${Formatter(dicount)} %\n${l.t('total')}\n${Formatter(total)} ${l.t('sum')}`;
const cart = ctx.session.in_cart
const markup = [
  [btn('⬅️','⬅️'),btn(`${ctr+1}-${last}`,`${ctr+1}-${last}`),btn('➡️','➡️')],
  [btn(l.t('buy'), l.t('buy'))],
  [btn(l.t('back'),l.t('back')),btn(`${l.t('cart')} (${cart || 0})`,`${l.t('cart')} (${cart || 0})`)]
]

return {description, markup}
}


module.exports = {
  getPromotions,
  getBonusPromo,
  getFixedSumPromo,
  getPercentPromo,
  replyMarkup
}
