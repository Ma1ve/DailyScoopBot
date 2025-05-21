import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

import LastNewsTitleStore from './LastNewsTitleStore';

interface News {
  title: string;
  image: string;
  articleText: string;
  tags: string[];
}

class ParseNewsService {
  private baseNewsUrl: string;
  private baseNewsWithTagMoscowUrl: string;
  private telegramChannelName: string;
  private store: LastNewsTitleStore;

  constructor() {
    const baseNewsUrl = process.env.BASE_NEWS_URL;
    const baseNewsWithTagMoscowUrl = process.env.NEWS_URL_MOSCOW;
    const telegramChannelName = process.env.TELEGRAM_CHANNEL;

    if (!baseNewsUrl) throw new Error('BASE_NEWS_URL is not defined in environment variables.');
    if (!baseNewsWithTagMoscowUrl) throw new Error('NEWS_URL_MOSCOW is not defined in environment variables.');
    if (!telegramChannelName) throw new Error('TELEGRAM_CHANNEL is not defined in environment variables.');

    this.baseNewsUrl = baseNewsUrl;
    this.baseNewsWithTagMoscowUrl = baseNewsWithTagMoscowUrl;
    this.telegramChannelName = telegramChannelName;

    this.store = new LastNewsTitleStore();
  }

  public async parseNews() {
    try {
      const newsList = await this.getFirstNews();

      if (!newsList || !newsList[0] || newsList.length === 0) return null;

      const latestNews = newsList[0];
      const newsImgAndMessage = this.prepareMessageText(latestNews);

      return newsImgAndMessage;
    } catch (error: unknown) {
      const e = error as Error;
      console.error('Ошибка при парсинге новости', e.message);

      return null;
    }
  }

  private async getFirstNews() {
    const response = await axios.get(this.baseNewsWithTagMoscowUrl);
    const $ = cheerio.load(response.data);

    const promises = $('.list.list-news.list-tags .list__item')
      .slice(0, 1)
      .map(async (_, el) => {
        const title = $(el).find('.list__title a').text().trim();
        const relativeUrlToCurrentNews = $(el).find('.list__title a').attr('href');
        const img = $(el).find('img.list__pic').attr('data-src');

        const tags: string[] = [];
        $(el)
          .find('.list__subtitle')
          .each((i, elem) => {
            const text = $(elem).find('.list__src').text().trim();
            if (text) {
              tags.push(text);
            }
          });

        const stubImgEndPath = '526/788/3.jpg';
        if (!img || img.endsWith(stubImgEndPath)) {
          console.log('Картинка не подгрузилась');
          return;
        }

        if (title && relativeUrlToCurrentNews) {
          const articleURL = this.baseNewsUrl + relativeUrlToCurrentNews;
          const articleText = await this.parseArticle(articleURL);

          https: return {
            title,
            image: img,
            articleText,
            tags,
          };
        }
      })
      .get();

    return await Promise.all(promises);
  }

  private async parseArticle(url: string): Promise<string> {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      const articleText = $('.article__text').text().trim();
      const normalizeArticleText = this.normalizeAndLimitText(articleText);

      return normalizeArticleText;
    } catch (error: unknown) {
      const e = error as Error;
      console.error('Ошибка при парсинге статьи:', e.message);

      return '';
    }
  }

  private normalizeAndLimitText(text: string) {
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

  prepareMessageText(currentNews: News) {
    const { title, image, articleText, tags } = currentNews;

    let lastTitle = this.store.loadTitle();

    if (title === lastTitle) {
      console.log('Новых новостей нет.');
      return null;
    }

    this.store.saveTitle(title);

    const message = this.prepareCaption(title, articleText, tags);

    return { image, message };
  }

  private prepareCaption(title: string, normalizeArticleText: string, tags: string[]) {
    const MAX_LENGTH = 1024;

    const prefixSymbol = this.prepareSymbolPrefix(tags);
    const header = `${prefixSymbol}<b>${this.escapeHtml(title)}</b>\n\n`;

    const paragraphs = normalizeArticleText
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p !== '');

    const firstParagraph = paragraphs[0] || '';
    const secondParagraph = paragraphs[1] || '';
    const quotedBlock = `<blockquote>${this.escapeHtml(firstParagraph)}\n\n${this.escapeHtml(
      secondParagraph,
    )}</blockquote>\n\n`;

    let trimmedText = '';
    let totalLength = quotedBlock.length;

    for (let i = 2; i < paragraphs.length; i++) {
      const p = paragraphs[i].trim();
      if (!p) continue;

      const startsWithQuote = /^[“"«'‘]/.test(p);
      const formatted = startsWithQuote ? `<i>${this.escapeHtml(p)}</i>\n\n` : `${this.escapeHtml(p)}\n\n`;

      const newLength = totalLength + formatted.length;
      if (header.length + newLength > MAX_LENGTH) break;

      trimmedText += formatted;
      totalLength = newLength;
    }

    const subscribeLink = `👉 <a href="https://t.me/${this.telegramChannelName}">Подписаться</a>`;

    const formattedTags = tags
      .map(
        (t) =>
          `#${t
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-zа-яё0-9_]/gi, '')}`,
      )
      .join(' ');

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

  private prepareSymbolPrefix(tags: string[]) {
    const priorityTags = [
      { tag: 'телефонное мошенничество', symbol: '📱' },
      { tag: 'происшествия', symbol: '❗️' },
      { tag: 'главные события', symbol: '📌' },
      { tag: 'экономика', symbol: '📊' },
      { tag: 'борьба с коррупцией в россии', symbol: '⚖️' },
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

    return prefix;
  }

  private escapeHtml(text: string) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

export default ParseNewsService;
