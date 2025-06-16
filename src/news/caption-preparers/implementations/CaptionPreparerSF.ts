import CaptionPreparer from '../base/CaptionPreparer';

class CaptionPreparerSF extends CaptionPreparer {
  private tagEmojiMap;

  constructor() {
    super();

    this.tagEmojiMap = [{ tag: 'criminal', symbols: ['❗️', '‼️'] }];
  }

  public prepare(title: string, normalizeArticleText: string, tags: string[]) {
    const subscribeLink = `⚡️<a href="https://t.me/${this.telegramChannelName}"><b>${this.telegramNameGroup}</b></a>`;

    const prefixSymbol = this.prepareSymbolPrefix(tags, this.tagEmojiMap);

    return `<b>${prefixSymbol} ${title}</b>\n\n${normalizeArticleText}\n\n${subscribeLink}`;
  }
}

export default CaptionPreparerSF;
