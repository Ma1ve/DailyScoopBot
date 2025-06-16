import LastNewsTitleStore from '../../../services/LastNewsTitleStore';

interface News {
  title: string;
  image: string;
  articleText: string;
  tags: string[] | null;
  articleURL: string;
}

abstract class BaseNewsParser {
  protected readonly telegramChannelName: string;
  protected readonly telegramNameGroup: string;
  protected readonly store: LastNewsTitleStore;

  constructor() {
    const telegramChannelName = process.env.TELEGRAM_CHANNEL;
    const telegramNameGroup = process.env.TELEGRAM_NAME_GROUP;

    if (!telegramChannelName)
      throw new Error('TELEGRAM_CHANNEL is not defined in environment variables.');
    if (!telegramNameGroup)
      throw new Error('TELEGRAM_NAME_GROUP is not defined in environment variables.');

    this.telegramChannelName = telegramChannelName;
    this.telegramNameGroup = telegramNameGroup;

    this.store = new LastNewsTitleStore();
  }

  protected abstract parseNews(): Promise<{
    image: string;
    message: string;
  } | null>;

  protected abstract getLatestNewsItem(lastSavedTitle: string): Promise<News | null>;

  protected abstract parseArticle(
    url: string,
  ): Promise<string | { articleText: string; articleTitle: string; imageUrl?: string }>;

  protected normalizeAndLimitText(text: string) {
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

  protected abstract prepareCaption(
    title: string,
    normalizeArticleText: string,
    tags: string[],
    isExistImg?: boolean,
  ): string;
}

export default BaseNewsParser;
