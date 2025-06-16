import axios from 'axios';
import * as cheerio from 'cheerio';

import BaseNewsParserService from '../base/BaseNewsParser';

import { TitleKey } from '../../../services/LastNewsTitleStore';

import type CaptionPreparer from '../../caption-preparers/base/CaptionPreparer';

class NewsParserV extends BaseNewsParserService {
  private baseNewsUrl: string;
  private currentNewsUrl: string;

  protected captionPreparer: CaptionPreparer;

  constructor(
    captionPreparer: CaptionPreparer,
    { baseNewsUrl, currentNewsUrl }: { baseNewsUrl?: string; currentNewsUrl: string },
  ) {
    super();

    this.captionPreparer = captionPreparer;

    if (!baseNewsUrl) throw new Error('BASE_NEWS_URL_V is not defined in environment variables.');

    this.baseNewsUrl = baseNewsUrl;
    this.currentNewsUrl = currentNewsUrl;
  }

  public override async parseNews() {
    try {
      const lastSavedTitle = this.store.loadTitle({
        key: TitleKey.LAST_TITLE_V,
        category: 'news',
      });

      const latestNews = await this.getLatestNewsItem(lastSavedTitle);

      if (latestNews === null || latestNews.title === lastSavedTitle) {
        console.log('Новых новостей нет.');
        return null;
      }

      const { title, articleText, tags, image } = latestNews;

      this.store.saveTitle({ key: TitleKey.LAST_TITLE_V, category: 'news', title });

      const message = this.prepareCaption(title, articleText, tags);

      return { image, message };
    } catch (error: unknown) {
      const e = error as Error;
      console.error('Ошибка при парсинге новости', e.message);

      return null;
    }
  }

  protected override async getLatestNewsItem(lastSavedTitle: string) {
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
          return null;
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

  protected override async parseArticle(url: string) {
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

  protected override prepareCaption(
    title: string,
    normalizeArticleText: string,
    tags: string[],
  ): string {
    return this.captionPreparer.prepare(title, normalizeArticleText, tags);
  }
}

export default NewsParserV;
