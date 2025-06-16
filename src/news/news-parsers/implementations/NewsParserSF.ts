import axios from 'axios';
import * as cheerio from 'cheerio';

import BaseNewsParserService from '../base/BaseNewsParser';

import { TitleKey } from '../../../services/LastNewsTitleStore';

import type CaptionPreparer from '../../caption-preparers/base/CaptionPreparer';

class NewsParserSF extends BaseNewsParserService {
  private baseNewsUrl: string;
  private currentNewsUrl: string;

  protected captionPreparer: CaptionPreparer;

  constructor(
    captionPreparer: CaptionPreparer,
    { baseNewsUrl, currentNewsUrl }: { baseNewsUrl?: string; currentNewsUrl: string },
  ) {
    super();

    this.captionPreparer = captionPreparer;

    if (!baseNewsUrl) throw new Error('BASE_NEWS_URL_SF is not defined in environment variables.');

    this.baseNewsUrl = baseNewsUrl;
    this.currentNewsUrl = currentNewsUrl;
  }

  public override async parseNews() {
    try {
      const lastSavedTitle = this.store.loadTitle({
        key: TitleKey.LAST_TITLE_SF,
        category: 'criminal',
      });

      const latestNews = await this.getLatestNewsItem();

      if (latestNews === null || latestNews.title === lastSavedTitle) {
        console.log('Новых новостей нет.');
        return null;
      }

      const { title, articleText } = latestNews;

      this.store.saveTitle({ key: TitleKey.LAST_TITLE_SF, category: 'criminal', title: title });

      const message = this.prepareCaption(title, articleText, ['criminal']);

      return { image: '', message };
    } catch (error: unknown) {
      const e = error as Error;
      console.error('Ошибка при парсинге новости', e.message);

      return null;
    }
  }

  protected override async getLatestNewsItem() {
    const response = await axios.get(this.currentNewsUrl);
    const $ = cheerio.load(response.data);

    const firstNewsItem = $('[data-qa="lb-block"]').first();

    const href = firstNewsItem.find('a').attr('href');
    const fullLink = `${this.baseNewsUrl}${href}`;

    const { articleTitle, articleText } = await this.parseArticle(fullLink);
    if (!articleTitle || !articleText) return null;

    return {
      title: articleTitle,
      image: '',
      articleText: articleText,
      tags: [],
      articleURL: '',
    };
  }

  protected override async parseArticle(
    url: string,
  ): Promise<{ articleTitle: string; articleText: string }> {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      const articleTitle = $('h1').text().trim();
      const articleText = $('.lead').text().trim();

      return { articleTitle, articleText };
    } catch (error: unknown) {
      const e = error as Error;
      console.error('Ошибка при парсинге статьи:', e.message);

      return { articleTitle: '', articleText: '' };
    }
  }

  protected override prepareCaption(
    title: string,
    normalizeArticleText: string,
    tags: ['criminal'],
  ): string {
    return this.captionPreparer.prepare(title, normalizeArticleText, tags);
  }
}

export default NewsParserSF;
