const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cron = require('node-cron');

const { rephraseText } = require('./rephraseText');

const TelegramBot = require('node-telegram-bot-api');

require('dotenv').config();

const statePath = path.resolve(__dirname, 'cache', 'state.json');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const chatId = process.env.CHAT_ID;

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] Ping received: ${req.method} ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.send('Bot is running!');
});

cron.schedule('0 5-21 * * *', async () => {
  console.log(new Date().toISOString());
  try {
    await sendNews().then(() => {
      console.log('exit');
    });
  } catch (err) {
    console.error('Ошибка в sendNews():', err);
  }
});

console.log('Cron запланирован. Ожидаем выполнения задач...');

async function sendNews() {
  try {
    const newsList = await parseNews();

    if (!newsList || !newsList[0] || newsList.length === 0) return;

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

      const message = prepareCaption(news.title, news.articleText, news.tags);

      const rephraseMessage = await rephraseText(message);

      console.log(rephraseMessage, 'rephraseMessage');

      await bot.sendPhoto(chatId, news.image, {
        caption: rephraseMessage,
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

        let tags = [];
        $(el)
          .find('.list__subtitle')
          .each((i, elem) => {
            const text = $(elem).find('.list__src').text().trim();
            if (text) {
              tags.push(text);
            }
          });

        let res = [];

        $('.list__subtitle').each((i, elem) => {
          const text = $(elem).find('.list__src').text().trim();
          if (text && !res.includes(text)) {
            res.push(text);
          }
        });

        if (img.endsWith('526/788/3.jpg')) {
          return;
        }

        if (title && img) {
          const articleText = await parseArticle(relativeUrl);

          https: return {
            title,
            image: img,
            articleText,
            tags,
          };
        }
      })
      .get();

    const data = await Promise.all(promises);
    return data;
  } catch (error) {
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
  const lines = text.split(/\r?\n/);
  let newText = '';
  let currentLength = 0;

  for (let el of lines) {
    const trimmed = el.trim();

    const lineToAdd = trimmed === '' ? '\n' : '\n' + trimmed;

    if (currentLength + lineToAdd.length > 1024) {
      break;
    }

    newText += lineToAdd;
    currentLength += lineToAdd.length;
  }

  return newText.trim();
}

function prepareCaption(title, articleText, tags) {
  const priorityTags = [
    { tag: 'происшествия', symbol: '❗️' },
    { tag: 'главные события', symbol: '📌' },
    { tag: 'экономика', symbol: '📊' },
    { tag: 'борьба с коррупцией в россии', symbol: '⚖️' },
    { tag: 'телефонное мошенничество', symbol: '📱' },
    { tag: 'политика', symbol: '📑' },
    { tag: 'авто', symbol: '🚙' },
    { tag: 'медицина', symbol: '🩺' },
    { tag: 'культура', symbol: '🎨' },
    { tag: 'спорт', symbol: '🏋️‍♂️' },
    { tag: 'прогноз погоды', symbol: '🌦️' },
    { tag: 'наука', symbol: '🔬' },
    { tag: 'hi-tech', symbol: '🚀' },
    { tag: 'общество', symbol: '👥' },
  ];

  const lowerTags = tags.map((t) => t.toLowerCase());
  let prefix = '';

  for (const { tag, symbol } of priorityTags) {
    if (lowerTags.includes(tag)) {
      prefix = symbol;
      break;
    }
  }

  const MAX_LENGTH = 1024;
  const cleanedText = deleteTabInText(articleText);

  const header = prefix ? `${prefix} <b>${escapeHtml(title)}</b>\n\n` : `<b>${escapeHtml(title)}</b>\n\n`;

  const paragraphs = cleanedText
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p !== '');

  const firstParagraph = paragraphs[0] || '';
  const secondParagraph = paragraphs[1] || '';
  const quotedBlock = `<blockquote>${escapeHtml(firstParagraph)}\n\n${escapeHtml(secondParagraph)}</blockquote>\n\n`;

  let trimmedText = '';
  let totalLength = quotedBlock.length;

  for (let i = 2; i < paragraphs.length; i++) {
    const p = paragraphs[i].trim();
    if (!p) continue;

    const startsWithQuote = /^[“"«'‘]/.test(p);
    const formatted = startsWithQuote ? `<i>${escapeHtml(p)}</i>\n\n` : `${escapeHtml(p)}\n\n`;

    const newLength = totalLength + formatted.length;
    if (header.length + newLength > MAX_LENGTH) break;

    trimmedText += formatted;
    totalLength = newLength;
  }

  const subscribeLink = `👉 <a href="https://t.me/${process.env.TELEGRAM_CHANNEL}>Подписаться</a>`;

  const formattedTags = tags.map((t) => `#${t.toLowerCase().replace(/\s+/g, '_')}`).join(' ');

  const suffix = `\n\n${subscribeLink}\n\n${formattedTags}`;
  const captionBody = (header + quotedBlock + trimmedText).trim();

  let finalCaption = captionBody;
  if (captionBody.length + suffix.length <= MAX_LENGTH) {
    finalCaption += suffix;
  } else if (captionBody.length + subscribeLink.length + 2 <= MAX_LENGTH) {
    finalCaption += `\n\n${subscribeLink}`;
  }

  return finalCaption.trim();
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
