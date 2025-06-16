abstract class CaptionPreparer {
  protected readonly telegramChannelName: string;
  protected readonly telegramNameGroup: string;

  static readonly MAX_LENGTH = 1024;

  constructor() {
    const telegramChannelName = process.env.TELEGRAM_CHANNEL;
    const telegramNameGroup = process.env.TELEGRAM_NAME_GROUP;

    if (!telegramChannelName)
      throw new Error('TELEGRAM_CHANNEL is not defined in environment variables.');
    if (!telegramNameGroup)
      throw new Error('NAME_TELEGRAM_GROUP is not defined in environment variables.');

    this.telegramChannelName = telegramChannelName;
    this.telegramNameGroup = telegramNameGroup;
  }

  public abstract prepare(
    title: string,
    normalizeArticleText: string,
    tags?: string[],
    isExistImg?: boolean,
  ): string;

  protected escapeHtml(text: string) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  protected prepareSymbolPrefix<T extends string>(
    tags: T[],
    tagEmojiMap: { tag: T; symbols: string[] }[],
  ) {
    const lowerTags = tags.map((t) => t.toLowerCase());
    let prefix = '';

    for (const { tag, symbols } of tagEmojiMap) {
      if (!lowerTags.includes(tag)) continue;

      if (symbols.length > 0) {
        prefix = this.getRandomItem(symbols);
        break;
      }
    }

    return prefix;
  }

  private getRandomItem(array: string[]): string {
    return array[Math.floor(Math.random() * array.length)];
  }
}

export default CaptionPreparer;
