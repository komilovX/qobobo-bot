const Markup = require("telegraf/markup");
const WizardScene = require("telegraf/scenes/wizard");
const Composer = require("telegraf/composer");
const { match } = require("telegraf-i18n");
const Users = require("../models/user.model");
const { BasicCommandHandler } = require("../methods");
function keyboard(ctx) {
  const btn = Markup.callbackButton;
  const l = ctx.i18n;
  return [
    [
      btn(l.t("change-name"), l.t("change-name")),
      btn(l.t("change-contact-phone"), l.t("change-contact-phone")),
    ],
    [btn(l.t("select-language"), l.t("select-language"))],
  ];
}
module.exports = new WizardScene(
  "profil",
  async (ctx) => {
    ctx
      .reply(
        ctx.i18n.t("settings"),
        Markup.inlineKeyboard(keyboard(ctx)).resize().extra()
      )
      .then((v) => (ctx.session.message_id = v.message_id));
    ctx.wizard.next();
  },
  BasicCommandHandler()
    .command("start", async (ctx) => {
      await ctx.scene.leave();
      await global.routes.start(ctx, true);
      try {
        if (!ctx.session.time) await ctx.deleteMessage(ctx.session.message_id);
      } catch (e) {
        console.log(e);
      }
    })
    .action(match("back"), async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.scene.leave();
      return global.routes.start(ctx);
    })
    .action(match("select-language"), async (ctx) => {
      await ctx.answerCbQuery();
      let lang = ctx.i18n.locale();
      ctx.i18n.locale(lang == "uz" ? "ru" : "uz");
      await ctx.scene.leave();
      return global.routes.start(ctx);
    })
    .action(match("change-name"), async (ctx) => {
      await ctx.answerCbQuery();
      const btn = Markup.callbackButton;
      const l = ctx.i18n;
      const { first_name, last_name } = ctx.session;
      ctx
        .editMessageText(
          ctx.i18n.t("your-name", { name: first_name, last: last_name }),
          Markup.inlineKeyboard([
            [
              btn(l.t("edit-name"), l.t("edit-name")),
              btn(l.t("edit-last-name"), l.t("edit-last-name")),
            ],
            [btn(l.t("back"), l.t("back"))],
          ])
            .resize()
            .extra()
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      ctx.wizard.next();
    })
    .action(match("change-contact-phone"), async (ctx) => {
      await ctx.answerCbQuery();
      const btn = Markup.callbackButton;
      const l = ctx.i18n;
      const { phone } = ctx.session;
      ctx
        .editMessageText(
          ctx.i18n.t("settings-send-number", { phone }),
          Markup.inlineKeyboard([[btn(l.t("back"), l.t("back"))]])
            .resize()
            .extra()
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      ctx.scene.state.phone = true;
      ctx.wizard.next();
    }),
  BasicCommandHandler()
    .command("start", async (ctx) => {
      await ctx.scene.leave();
      await global.routes.start(ctx, true);
      if (!ctx.session.time) {
        await ctx.deleteMessage(ctx.session.message_id);
      }
    })
    .action(match("back"), async (ctx) => {
      await ctx.answerCbQuery();
      ctx
        .editMessageText(
          ctx.i18n.t("settings"),
          Markup.inlineKeyboard(keyboard(ctx)).resize().extra()
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      ctx.wizard.back();
    })
    .action(match("edit-name"), async (ctx) => {
      await ctx
        .editMessageText(
          ctx.i18n.t("enter-new-name"),
          Markup.inlineKeyboard([
            Markup.callbackButton(ctx.i18n.t("back"), ctx.i18n.t("back")),
          ])
            .resize()
            .extra()
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      await ctx.answerCbQuery();
      ctx.scene.state.state = "name";
      ctx.wizard.next();
    })
    .action(match("edit-last-name"), async (ctx) => {
      await ctx
        .editMessageText(
          ctx.i18n.t("enter-new-last-name"),
          Markup.inlineKeyboard(
            Markup.callbackButton(ctx.i18n.t("back"), ctx.i18n.t("back"))
          )
            .resize()
            .extra()
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      await ctx.answerCbQuery();
      ctx.scene.state.state = "last";
      ctx.wizard.next();
    })
    .hears(/\+998\s\d{2}\s\d{3}\s\d{2}\s\d{2}/g, async (ctx) => {
      ctx.session.phone = ctx.message.text;
      try {
        await Users.update(
          {
            phone: ctx.message.text,
          },
          {
            where: { chat_id: ctx.chat.id },
          }
        );
        await ctx.deleteMessage();
        await ctx.deleteMessage(ctx.session.message_id);
      } catch (e) {
        console.log(e);
      }
      ctx
        .reply(
          ctx.i18n.t("settings"),
          Markup.inlineKeyboard(keyboard(ctx)).resize().extra()
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      ctx.wizard.back();
    })
    .on("text", (ctx) => {
      ctx.deleteMessage();
    }),
  BasicCommandHandler()
    .command("start", async (ctx) => {
      await ctx.scene.leave();
      await global.routes.start(ctx, true);
      try {
        if (!ctx.session.time) await ctx.deleteMessage(ctx.session.message_id);
      } catch (e) {
        console.log(e);
      }
    })
    .action(match("back"), async (ctx) => {
      await ctx.answerCbQuery();
      const btn = Markup.callbackButton;
      const l = ctx.i18n;
      const { first_name, last_name } = ctx.session;
      await ctx
        .editMessageText(
          ctx.i18n.t("your-name", { name: first_name, last: last_name }),
          Markup.inlineKeyboard([
            [
              btn(l.t("edit-name"), l.t("edit-name")),
              btn(l.t("edit-last-name"), l.t("edit-last-name")),
            ],
            [btn(l.t("back"), l.t("back"))],
          ])
            .resize()
            .extra()
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      await ctx.answerCbQuery();
      ctx.wizard.back();
    })
    .on("text", async (ctx) => {
      let { state } = ctx.scene.state;
      try {
        if (state == "name") {
          ctx.session.first_name = ctx.message.text;
          await Users.update(
            {
              first_name: ctx.message.text,
            },
            {
              where: { chat_id: ctx.chat.id },
            }
          );
        } else {
          ctx.session.last_name = ctx.message.text;
          await Users.update(
            {
              last_name: ctx.message.text,
            },
            {
              where: { chat_id: ctx.chat.id },
            }
          );
        }
        try {
          if (!ctx.session.time)
            await ctx.deleteMessage(ctx.session.message_id);
        } catch (e) {
          console.log(e);
        }
      } catch (e) {
        console.log(e);
      }
      const btn = Markup.callbackButton;
      const l = ctx.i18n;
      const { first_name, last_name } = ctx.session;
      ctx
        .reply(
          ctx.i18n.t("your-name", { name: first_name, last: last_name }),
          Markup.inlineKeyboard([
            [
              btn(l.t("edit-name"), l.t("edit-name")),
              btn(l.t("edit-last-name"), l.t("edit-last-name")),
            ],
            [btn(l.t("back"), l.t("back"))],
          ])
            .resize()
            .extra()
        )
        .then((val) => (ctx.session.message_id = val.message_id));
      ctx.wizard.back();
    })
);
