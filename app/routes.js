const enter=scene=>ctx=>ctx.scene.enter(scene)

const Markup=require('telegraf/markup')
global.routes={
  start:async (ctx,regist=false, welcome=false) => {
    if (!ctx.session.language_code) {
      return routes.selectLanguage(ctx)
    }
    if (!ctx.session.isregistred) {
      return routes.register(ctx)
    }
    const btn = Markup.callbackButton
    const loc = ctx.i18n
    if (regist) {
      return ctx.reply( welcome ? ctx.i18n.t('greeting') : ctx.i18n.t('main-menu'),
        Markup.inlineKeyboard([
          [btn(loc.t('product'), loc.t('product')), btn(loc.t('brands'), loc.t('brands'))],
          [btn(loc.t('my-orders'), loc.t('my-orders'))],
          [btn(loc.t('about-us'),loc.t('about-us'))],
          [btn(loc.t('cabinet'),loc.t('cabinet'))]
        ]).resize().extra()
      )
    }
    return ctx.editMessageText(ctx.i18n.t('main-menu'),
      Markup.inlineKeyboard([
        [btn(loc.t('product'),loc.t('product')), btn(loc.t('brands'), loc.t('brands'))],
        [btn(loc.t('my-orders'),loc.t('my-orders'))],
        [btn(loc.t('about-us'),loc.t('about-us'))],
        [btn(loc.t('cabinet'),loc.t('cabinet'))]
      ]).resize().extra()
    )
  },
  selectLanguage:enter('select-language'),
  register: enter('register'),
  product: enter('product'),
  myOrders: enter('my-orders'),
  profil: enter('profil'),
  aboutUs: enter('about-us'),
  cart: enter('cart'),
  brands: enter('brands'),
  order: enter('order')
}
