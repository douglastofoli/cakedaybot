import { Telegraf, Stage, session, WizardScene } from 'telegraf';
import LocalSession from 'telegraf-session-local';
import Calendar from 'telegraf-calendar-telegram';
import * as dotenv from 'dotenv';

dotenv.config();

declare const process: {
  env: {
    BOT_TOKEN: string;
  };
};

const { BOT_TOKEN } = process.env;
const bot = new Telegraf(BOT_TOKEN);

const calendar = new Calendar(bot);

bot.use(new LocalSession({ database: 'database.json' }).middleware());

calendar.setDateListener((context, date) => context.reply(date));

const addBirthday = new WizardScene(
  'ADD_BIRTHDAY',
  (ctx) => {
    ctx.reply('Quem vai fazer aniversário?');
    ctx.session.users = {};
    return ctx.wizard.next();
  },
  (ctx) => {
    // validation example
    if (ctx.message.text.length < 2) {
      ctx.reply('Esse usuário não é real');
      return;
    }
    ctx.session.users.username = ctx.message.text;
    ctx.reply('Qual é a data?', calendar.getCalendar());
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.session.users.birthday = ctx.message.text;
    ctx.reply('REGISTRADO');
    return ctx.scene.leave();
  }
);

const stage = new Stage([addBirthday], { default: 'ADD_BIRTHDAY' });

bot.use(session());
bot.use(stage.middleware());

bot.command('add', async (ctx) => {
  await ctx.scene.enter('ADD_BIRTHDAY');
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
