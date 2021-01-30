import { Telegraf, session, Scenes } from 'telegraf';
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

const property = 'data';

const localSession = new LocalSession({
  // Database name/path, where sessions will be located (default: 'sessions.json')
  database: 'database.json',
  // Name of session property object in Telegraf Context (default: 'session')
  property: 'session',
  // Type of lowdb storage (default: 'storageFileSync')
  storage: LocalSession.storageFileAsync,
  // Format of storage/database (default: JSON.stringify / JSON.parse)
  format: {
    serialize: (obj) => JSON.stringify(obj, null, 2), // null & 2 for pretty-formatted JSON
    deserialize: (str) => JSON.parse(str)
  },
  // We will use `messages` array in our database to store user messages using exported lowdb instance from LocalSession via Telegraf Context
  state: { users: [] }
});

localSession.DB.then((DB) => {
  // Database now initialized, so now you can retrieve anything you want from it
  console.log('Current LocalSession DB:', DB.value());
  // console.log(DB.get('sessions').getById('1:1').value())
});

bot.use(localSession.middleware(property));

calendar.setDateListener((ctx, date) => {
  ctx.session.users.birthday = date;
});

const addBirthday = new Scenes.WizardScene(
  'ADD_BIRTHDAY',
  (ctx) => {
    ctx.reply('Quem vai fazer aniversário?');
    return ctx.wizard.next();
  },
  (ctx) => {
    // validation example
    if (ctx.message.text.length < 2) {
      ctx.reply('Esse usuário não é real');
      return;
    }

    ctx[property + 'DB'].get('users').push([ctx.message.text]).write();

    ctx.reply('Qual o dia? yyyy-mm-dd');

    return ctx.wizard.next();
  },
  (ctx) => {
    ctx[property + 'DB'].get('users').push([ctx.message.text]).write();
    ctx.reply('Adicionado!');
    return ctx.scene.leave();
  }
);

const listBirthday = new Scenes.WizardScene('LIST_BIRTHDAY', (ctx) => {
  ctx.reply(ctx[property + 'DB'].get('users'));
  return ctx.scene.leave();
});

const stage = new Scenes.Stage([addBirthday, listBirthday]);

bot.use(session());
bot.use(stage.middleware());

bot.command('/add', (ctx) => ctx.scene.enter('ADD_BIRTHDAY'));

bot.command('/listcakeday', (ctx) => {
  ctx.scene.enter('LIST_BIRTHDAY');
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
