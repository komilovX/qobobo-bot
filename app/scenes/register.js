const Markup=require('telegraf/markup')
const WizardScene=require('telegraf/scenes/wizard')
const Composer=require('telegraf/composer')

const { registerUser } = require('../methods')
module.exports=new WizardScene(
    'register',
    (ctx)=>{
      ctx.reply(ctx.i18n.t('enter-name'),{
        reply_markup:{
          remove_keyboard:true
        }
      })
      ctx.wizard.next();
    },
    (new Composer())
      .on('text', ctx => {
        let FI = ctx.message.text.replace(/\-|\_/,' ').split(' ')
        if(FI.length !== 2){
          return ctx.reply(ctx.i18n.t('enter-correct-name'))
        }
        ctx.session.first_name = FI[0]
        ctx.session.last_name = FI[1]

        ctx.replyWithHTML(ctx.i18n.t('send-number'), Markup.keyboard([
          Markup.contactRequestButton(ctx.i18n.t('my-number'))
        ]).resize().extra()).then(val => ctx.session.message_id = val.message_id)
        ctx.wizard.next();
      }),
    (new Composer())
      .on('contact',async ctx=>{
        let phone = ctx.message.contact.phone_number.replace(/\+/, '');
        ctx.session.phone=phone
        ctx.session.isregistred=true
        ctx.session.cart = []
        ctx.session.in_cart = 0
        await registerUser(ctx)
        ctx.deleteMessage(ctx.session.message_id)
        await ctx.scene.leave();
        return global.routes.start(ctx, true, true)
      })
      .on('text',ctx=>{
        ctx.replyWithHTML(ctx.i18n.t('send-number'),Markup.keyboard([
          Markup.contactRequestButton(ctx.i18n.t('my-number'))
        ]).resize().extra())
      }),
)
