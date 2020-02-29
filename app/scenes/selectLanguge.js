const Markup=require('telegraf/markup')
const WizardScene=require('telegraf/scenes/wizard')
const Composer=require('telegraf/composer')

module.exports=new WizardScene(
    'select-language',
    (ctx)=>{
      ctx.reply(
        'Здравствуйте! Давайте для начала выберем язык обслуживания!\n\nKeling, avvaliga xizmat ko’rsatish tilini tanlab olaylik.',
        Markup.keyboard([
          '🇷🇺 Русский',
          '🇺🇿 O\'zbekcha'
        ]).resize().extra()
      )
      ctx.wizard.next()
    },
    new Composer()
    .hears('🇺🇿 O\'zbekcha', async ctx => {
      ctx.i18n.locale('uz')
      ctx.session.language_code='uz'
      await ctx.scene.leave()
      global.routes.start(ctx, false)
    })
    .hears('🇷🇺 Русский', async ctx => {
      ctx.i18n.locale('ru')
      ctx.session.language_code='ru'
      await ctx.scene.leave()
      global.routes.start(ctx, false)
    })
)
