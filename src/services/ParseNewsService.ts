import axios from 'axios';
import * as cheerio from 'cheerio';

import LastNewsTitleStore from './LastNewsTitleStore';

interface News {
  title: string;
  image: string;
  articleText: string;
  tags: string[];
  articleURL: string;
}

class ParseNewsService {
  private baseNewsUrl: string;
  private currentNewsUrl: string;
  private telegramChannelName: string;
  private telegramNameGroup: string;
  private store: LastNewsTitleStore;

  constructor() {
    const baseNewsUrl = process.env.BASE_NEWS_URL;
    const currentNewsUrl = process.env.CURRENT_NEWS_URL;
    const telegramChannelName = process.env.TELEGRAM_CHANNEL;
    const telegramNameGroup = process.env.TELEGRAM_NAME_GROUP;

    if (!baseNewsUrl) throw new Error('BASE_NEWS_URL is not defined in environment variables.');
    if (!currentNewsUrl) throw new Error('CURRENT_NEWS_URL is not defined in environment variables.');
    if (!telegramChannelName) throw new Error('TELEGRAM_CHANNEL is not defined in environment variables.');
    if (!telegramNameGroup) throw new Error('NAME_TELEGRAM_GROUP is not defined in environment variables.');

    this.baseNewsUrl = baseNewsUrl;
    this.currentNewsUrl = currentNewsUrl;
    this.telegramChannelName = telegramChannelName;
    this.telegramNameGroup = telegramNameGroup;

    this.store = new LastNewsTitleStore();
  }

  public async parseNews() {
    try {
      const lastSavedTitle = this.store.loadTitle();
      const latestNews = await this.getLatestNewsItem(lastSavedTitle);

      console.log(latestNews, 'latestNews - ЧТО ВЫШЛО ИЗ getLatestNewsItem');
      console.log(lastSavedTitle, 'lastSavedTitle');

      if (latestNews === null || latestNews.title === lastSavedTitle) {
        console.log('Новых новостей нет.');
        return null;
      }

      const { title, articleText, tags, image } = latestNews as News;

      this.store.saveTitle(title);

      const message = this.prepareCaption(title, articleText, tags);

      return { image, message };
    } catch (error: unknown) {
      const e = error as Error;
      console.error('Ошибка при парсинге новости', e.message);

      return null;
    }
  }

  private async getLatestNewsItem(lastSavedTitle: string) {
    const response = await axios.get(this.currentNewsUrl);
    const $ = cheerio.load(response.data);

    const lengthFirstTenBlocks = 10;
    const stubImgEndPath = '526/788/3.jpg';

    let firstValidNews = null;
    let importantNews = null;

    const newsItems = $('.list.list-news .list__item');

    for (let i = 0; i < lengthFirstTenBlocks; i++) {
      const el = newsItems[i];

      const title = $(el).find('.list__title a').text().trim();
      const relativeUrlToCurrentNews = $(el).find('.list__title a').attr('href');
      const img = $(el).find('img.list__pic').attr('data-src');

      if (!img || img.endsWith(stubImgEndPath)) continue;

      const tags: string[] = [];
      $(el)
        .find('.list__subtitle')
        .each((i, elem) => {
          const text = $(elem).find('.list__src').text().trim();
          if (text) {
            tags.push(text);
          }
        });

      const newsItem = {
        title,
        image: img,
        articleURL: this.baseNewsUrl + relativeUrlToCurrentNews,
        tags,
      };

      console.log(newsItem, 'newsItem СОЗДАННЫЙ БЛОК НОВОСТЕЙ');

      // Первый запуск скрипта (lastTitle не сохранился): возвращаем самую первую валидную новость
      if (lastSavedTitle === '') {
        console.log('lastSavedTitle = "" ');

        const articleText = await this.parseArticle(newsItem.articleURL);

        if (!articleText) {
          return null;
        }

        return {
          ...newsItem,
          articleText,
        };
      }

      // Храним первую валидную новость как запасной вариант
      if (!firstValidNews) {
        firstValidNews = newsItem;
      }

      // Проверяем на тег "главные события"
      if (tags.includes('Главные события') && !importantNews) {
        console.log(newsItem, ' = главные события');

        importantNews = newsItem;

        if (importantNews.title === lastSavedTitle) {
          return firstValidNews;
        }
      }

      // Если дошли до сохранённого заголовка — прекратить обход
      if (title === lastSavedTitle) {
        break;
      }
    }

    if (!importantNews && !firstValidNews) {
      console.log('У всех 10 элементов не прогрузились картинки');
      return null;
    }

    if (importantNews) {
      // Если нашли главную новость — отдаем её
      const articleText = await this.parseArticle(importantNews.articleURL);

      if (!articleText) {
        return null;
      }

      return {
        ...importantNews,
        articleText,
      };
    }

    // Иначе — отдаем первую валидную
    if (firstValidNews) {
      const articleText = await this.parseArticle(firstValidNews.articleURL);

      if (!articleText) {
        return null;
      }

      console.log({ ...firstValidNews, articleText }, 'firstValidNews');

      return {
        ...firstValidNews,
        articleText,
      };
    }

    return null;
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

  private prepareCaption(title: string, normalizeArticleText: string, tags: string[]) {
    const MAX_LENGTH = 1024;

    const prefixSymbol = this.prepareSymbolPrefix(tags);
    const escapedTitle = this.escapeHtml(title);

    const titleMarkup =
      Math.random() < 0.25 ? `<span class="tg-spoiler">${escapedTitle}</span>` : `<b>${escapedTitle}</b>`;

    const header = `${prefixSymbol} ${titleMarkup}\n\n`;

    const paragraphs = normalizeArticleText
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p !== '');

    const firstParagraph = paragraphs[0] || '';
    const secondParagraph = paragraphs[1] || '';

    const escapedFirst = this.escapeHtml(firstParagraph);
    const escapedSecond = this.escapeHtml(secondParagraph);
    const content = `${escapedFirst}\n\n${escapedSecond}`;

    let quotedBlock = Math.random() < 0.35 ? `${content}\n\n` : `<blockquote>${content}</blockquote>\n\n`;

    let trimmedText = '';
    let totalLength = quotedBlock.length;

    for (let i = 2; i < paragraphs.length; i++) {
      const p = paragraphs[i].trim();
      if (!p) continue;

      const startsWithQuote = /^[“"«'‘]/.test(p);
      const formatted = startsWithQuote ? `©️<i>${this.escapeHtml(p)}</i>\n\n` : `${this.escapeHtml(p)}\n\n`;

      const newLength = totalLength + formatted.length;
      if (header.length + newLength > MAX_LENGTH) break;

      trimmedText += formatted;
      totalLength = newLength;
    }

    if (trimmedText.length === 0) {
      quotedBlock = `${content}\n\n`;
    }

    const subscribeLink = `⚡️<a href="https://t.me/${this.telegramChannelName}"><b>Подписаться на ${this.telegramNameGroup}</b></a>`;

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
      { tag: 'главные события', symbols: ['❗️', '‼️', '❗️📣'] },
      { tag: 'спецоперация россии', symbols: ['🪖'] },
      { tag: 'телефонное мошенничество', symbols: ['📵'] },
      { tag: 'экономика', symbols: ['📊'] },
      { tag: 'борьба с коррупцией в россии', symbols: ['⚖️'] },
      { tag: 'политика', symbols: ['🏛️', '🌏'] },
      { tag: 'авто', symbols: ['🚗'] },
      { tag: 'медицина', symbols: ['🩺', '🏥'] },
      { tag: 'культура', symbols: ['🎭'] },
      { tag: 'спорт', symbols: ['🏅'] },
      { tag: 'прогноз погоды', symbols: ['🌦️'] },
      { tag: 'наука', symbols: ['🔬', '⚗️', '🚀'] },
      { tag: 'hi-tech', symbols: ['🤖', '🚀'] },
      { tag: 'атаки украинских дронов и ракет', symbols: ['⚠️'] },
      { tag: 'ситуация на украине', symbols: ['⚠️'] },
      { tag: 'происшествия', symbols: ['🚨', '🔴'] },
    ];

    const lowerTags = tags.map((t) => t.toLowerCase());
    let prefix = '';

    for (const { tag, symbols } of priorityTags) {
      if (!lowerTags.includes(tag)) continue;

      if (symbols.length > 0) {
        prefix = this.getRandomItem(symbols);
        break;
      }
    }

    return prefix;
  }

  private getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private escapeHtml(text: string) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

export default ParseNewsService;
