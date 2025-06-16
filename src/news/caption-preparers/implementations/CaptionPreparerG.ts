import { CategoryNewsG } from '../../news-parsers/implementations/NewsParserG';
import CaptionPreparer from '../base/CaptionPreparer';

class CaptionPreparerG extends CaptionPreparer {
  private tagEmojiMap;

  constructor() {
    super();

    this.tagEmojiMap = [
      { tag: CategoryNewsG.ARMY, symbols: ['🪖', '⚔️', '🛡️'] },
      { tag: CategoryNewsG.BUSINESS, symbols: ['📊', '🪙', '🏦'] },
      { tag: CategoryNewsG.POLITICS, symbols: ['🏛️', '🌏'] },
      { tag: CategoryNewsG.SCIENCE, symbols: ['🔬', '⚗️', '👨‍🔬'] },
      { tag: CategoryNewsG.TECH, symbols: ['👨‍💻', '🖥', '💻'] },
    ];
  }

  private cleanText(text: string): string {
    return text.replace(/<br\s*\/?>/gi, '\n\n');
  }

  public prepare(
    title: string,
    normalizeArticleText: string,
    tags: CategoryNewsG[],
    isExistImg: boolean,
  ) {
    const MAX_LENGTH = 1024;

    const subscribeLink = `⚡️<a href="https://t.me/${this.telegramChannelName}"><b>${this.telegramNameGroup}</b></a>`;

    const cleanedText = this.cleanText(normalizeArticleText);

    const paragraphs = cleanedText.split(/\n{2,}/);

    let trimmedText = '';
    let totalLength = 0;

    const prefixSymbol = this.prepareSymbolPrefix(tags, this.tagEmojiMap);

    const header = `<b>${prefixSymbol} ${title}</b>\n\n`;
    totalLength += header.length;

    const subscribeLength = `\n\n${subscribeLink}`.length;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      if (!paragraph) continue;

      const startsWithQuote = /^[“"«'‘]/.test(paragraph);

      let formatted: string;

      /* С вероятностью 35% показываем с blockquote */
      if (i === 1 && Math.random() < 0.35) {
        formatted = `<blockquote>${paragraph}</blockquote>\n\n`;
      } else {
        formatted = startsWithQuote ? `<i>${paragraph}</i>\n\n` : `${paragraph}\n\n`;
      }

      const newLength = totalLength + formatted.length + subscribeLength;
      if (newLength > MAX_LENGTH) break;

      trimmedText += formatted;
      totalLength += formatted.length;
    }

    // Собираем итоговый текст
    const finalText = `${header}${trimmedText}${subscribeLink}`;

    return finalText.trim();
  }
}

export default CaptionPreparerG;
