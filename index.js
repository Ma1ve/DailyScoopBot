const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');

const TelegramBot = require('node-telegram-bot-api');

require('dotenv').config();

const statePath = path.resolve(__dirname, 'state.json');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const chatId = process.env.CHAT_ID;

sendNews().then(() => {
  console.log('exit');
  process.exit(0);
});

async function sendNews() {
  try {
    const newsList = await parseNews();

    if (!newsList || newsList.length === 0) return;

    const latestNews = newsList[0];

    let lastTitle = '';

    if (fs.existsSync(statePath)) {
      const stateData = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      lastTitle = stateData.lastTitle;
    }

    fs.writeFileSync(statePath, JSON.stringify({ lastTitle: latestNews.title }, null, 2), 'utf8');

    if (latestNews.title === lastTitle) {
      console.log('Новых новостей нет.');
      return;
    }

    lastTitle = latestNews.title;

    for (const news of newsList) {
      if (!news) continue;

      const message = prepareCaption(news.title, news.articleText);

      await bot.sendPhoto(chatId, news.image, {
        caption: message,
        parse_mode: 'HTML',
      });
    }
  } catch (error) {
    console.error('Ошибка при отправке новостей:', error.message);
    await bot.sendMessage(chatId, 'Произошла ошибка при получении новостей.');
  }
}

async function parseNews() {
  try {
    const response = await axios.get(process.env.NEWS_URL_MOSCOW);
    const $ = cheerio.load(response.data);

    const promises = $('.list.list-news.list-tags .list__item')
      .slice(0, 1)
      .map(async (_, el) => {
        const title = $(el).find('.list__title a').text().trim();
        const relativeUrl = $(el).find('.list__title a').attr('href');
        const img = $(el).find('img.list__pic').attr('data-src');

        if (title && img) {
          const articleText = await parseArticle(relativeUrl);
          console.log(articleText, 'articleText');
          return {
            title,
            image: img,
            articleText,
          };
        }
      })
      .get();

    const data = await Promise.all(promises);
    return data;
  } catch (error) {
    console.log(error);
    console.error('Ошибка при парсинге:', error.message);
    return [];
  }
}

async function parseArticle(relativeUrl) {
  const baseUrl = process.env.BASE_NEWS_URL;

  const fullUrl = baseUrl + relativeUrl;

  try {
    const response = await axios.get(fullUrl);
    const $ = cheerio.load(response.data);

    const articleText = $('.article__text').text().trim();

    const newArticleText = deleteTabInText(articleText);
    return newArticleText;
  } catch (err) {
    console.error('Ошибка при парсинге статьи:', err.message);
  }
}

function deleteTabInText(text) {
  console.log(text.length);

  const lines = text.split(/\r?\n/);
  let newText = '';
  let currentLength = 0;

  for (let el of lines) {
    const trimmed = el.trim();

    const lineToAdd = trimmed === '' ? '\n' : '\n' + trimmed;
    console.log(lineToAdd.length, 'lineToAdd.length');

    if (currentLength + lineToAdd.length > 1024) {
      break;
    }

    newText += lineToAdd;
    currentLength += lineToAdd.length;
  }

  return newText.trim();
}

function prepareCaption(title, articleText) {
  const MAX_LENGTH = 1024;
  const cleanedText = deleteTabInText(articleText);

  const header = `<b>${title}</b>\n\n`;
  const remainingLength = MAX_LENGTH - header.length;

  let trimmedText = '';
  let totalLength = 0;

  for (let paragraph of cleanedText.split('\n')) {
    const toAdd = paragraph === '' ? '\n' : '\n' + paragraph;
    const newLength = totalLength + toAdd.length;

    if (newLength > remainingLength) break;

    trimmedText += toAdd;
    totalLength = newLength;
  }

  return header + trimmedText.trim();
}
