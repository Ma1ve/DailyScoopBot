import axios from 'axios';
import * as cheerio from 'cheerio';

import BaseNewsParserService from '../base/BaseNewsParser';

import { TitleKey } from '../../../services/LastNewsTitleStore';

import type CaptionPreparer from '../../caption-preparers/base/CaptionPreparer';

export enum CategoryNewsG {
  POLITICS = 'politics',
  SOCIAL = 'social',
  ARMY = 'army',
  BUSINESS = 'business',
  SCIENCE = 'science',
  TECH = 'tech',
}

class NewsParserG extends BaseNewsParserService {
  private baseNewsUrl: string;
  private currentNewsUrl: string;
  private category: CategoryNewsG;
  protected captionPreparer: CaptionPreparer;

  constructor(
    captionPreparer: CaptionPreparer,
    { baseNewsUrl, currentNewsUrl }: { baseNewsUrl?: string; currentNewsUrl: string },
  ) {
    super();

    this.captionPreparer = captionPreparer;

    if (!baseNewsUrl) throw new Error('BASE_NEWS_URL_G is not defined in environment variables.');

    this.baseNewsUrl = baseNewsUrl;
    this.currentNewsUrl = currentNewsUrl;
    this.category = this.getCategoryByPathNews(currentNewsUrl) as CategoryNewsG;
  }

  private getCategoryByPathNews(currentNewsUrl: string) {
    const arrayPathCurrentNews = currentNewsUrl.split('/');
    const category = arrayPathCurrentNews[arrayPathCurrentNews.length - 3];

    return category;
  }

  public override async parseNews() {
    try {
      const lastSavedTitle = this.store.loadTitle({
        key: TitleKey.LAST_TITLE_G,
        category: this.category,
      });

      const latestNews = await this.getLatestNewsItem();

      if (latestNews === null || latestNews.title === lastSavedTitle) {
        console.log('Новых новостей нет.');
        return null;
      }

      const { title, articleText, image } = latestNews;

      this.store.saveTitle({ key: TitleKey.LAST_TITLE_G, category: this.category, title: title });

      const message = this.prepareCaption(title, articleText, [this.category], !!image);

      return { image, message };
    } catch (error: unknown) {
      const e = error as Error;
      console.error('Ошибка при парсинге новости', e.message);

      return null;
    }
  }

  protected override async getLatestNewsItem() {
    const response = await axios.get(this.currentNewsUrl);
    const $ = cheerio.load(response.data);

    const firstNewsItem = $('#_id_article_listing').find('a').first();

    const href = firstNewsItem.attr('href');
    const fullLink = `${this.baseNewsUrl}${href}`;

    const { articleTitle, articleText, imageUrl } = await this.parseArticle(fullLink);

    if (!articleTitle || !articleText) return null;

    return {
      title: articleTitle,
      image: imageUrl,
      articleText: articleText,
      tags: [],
      articleURL: '',
    };
  }

  protected override async parseArticle(
    url: string,
  ): Promise<{ articleTitle: string; articleText: string; imageUrl: string }> {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      const articleTitle = $('h1').text().trim();
      const articleText = $('[itemprop="articleBody"]').text().trim();
      const imageUrl =
        $('img.item-image').attr('data-hq') || $('img.item-image-hq').attr('src') || '';

      return { articleTitle, articleText, imageUrl };
    } catch (error: unknown) {
      const e = error as Error;
      console.error('Ошибка при парсинге статьи:', e.message);

      return { articleTitle: '', articleText: '', imageUrl: '' };
    }
  }

  protected override prepareCaption(
    title: string,
    normalizeArticleText: string,
    tags: CategoryNewsG[],
    isExistImg: boolean,
  ): string {
    return this.captionPreparer.prepare(title, normalizeArticleText, tags, isExistImg);
  }
}

export default NewsParserG;
