const Markup = require('telegraf/markup')
const WizardScene = require('telegraf/scenes/wizard')
const Composer = require('telegraf/composer')
const Extra = require('telegraf/extra');
const {match} = require('telegraf-i18n')

module.exports = new WizardScene(
  'about-us',
  async ctx => {
    await ctx.answerCbQuery()
    ctx.session.time?await ctx.answerCbQuery():await ctx.deleteMessage()
    const url = Markup.urlButton
    const l = ctx.i18n
    const caption = "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum"
    ctx.replyWithPhoto({
      url:'https://profficosmetics.joinposter.com/upload/pos_cdb_109942/Screenshot_2.png'
    },
      Extra
      .load({caption})
      .markdown()
      .markup(
        Markup.inlineKeyboard([
          [url('Telegram','https://t.me/proficosm'),url('Instagram','https://www.instagram.com/')],
          [Markup.callbackButton(l.t('back'),l.t('back'))]
        ])
      )
    ).then(v => ctx.session.message_id = v.message_id)
    ctx.wizard.next()
  },
  (new Composer())
  .command('start', async ctx => {
    await ctx.scene.leave()
    await global.routes.start(ctx, true)
    if (!ctx.session.time) {
      await ctx.deleteMessage(ctx.session.message_id)
    }
  })
  .action(match('back'), async ctx => {
    await ctx.answerCbQuery()
    await ctx.deleteMessage()
    await ctx.scene.leave()
    return global.routes.start(ctx,true)
  })
)
