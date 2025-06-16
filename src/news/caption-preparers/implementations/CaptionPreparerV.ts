import CaptionPreparer from '../base/CaptionPreparer';

class CaptionPreparerV extends CaptionPreparer {
  private tagEmojiMap;

  constructor() {
    super();

    this.tagEmojiMap = [
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
      { tag: 'атаки украинских дронов и ракет', symbols: ['💥'] },
      { tag: 'ситуация на украине', symbols: ['💥'] },
      { tag: 'происшествия', symbols: ['🚨'] },
    ];
  }

  public prepare(title: string, normalizeArticleText: string, tags: string[]) {
    const prefixSymbol = this.prepareSymbolPrefix(tags, this.tagEmojiMap);
    const escapedTitle = this.escapeHtml(title);

    const isSpoilerCategory = tags.includes('главные события') || tags.includes('происшествия');

    const titleMarkup =
      Math.random() < 0.25 && isSpoilerCategory
        ? `<span class="tg-spoiler"><b>${escapedTitle}</b></span>`
        : `<b>${escapedTitle}</b>`;

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

    let quotedBlock =
      Math.random() < 0.35 ? `${content}\n\n` : `<blockquote>${content}</blockquote>\n\n`;

    let trimmedText = '';
    let totalLength = quotedBlock.length;

    for (let i = 2; i < paragraphs.length; i++) {
      const p = paragraphs[i].trim();
      if (!p) continue;

      const startsWithQuote = /^[“"«'‘]/.test(p);
      const formatted = startsWithQuote
        ? `️<i>${this.escapeHtml(p)}</i>\n\n`
        : `${this.escapeHtml(p)}\n\n`;

      const newLength = totalLength + formatted.length;

      if (header.length + newLength > CaptionPreparer.MAX_LENGTH) break;

      trimmedText += formatted;
      totalLength = newLength;
    }

    if (trimmedText.length === 0) {
      quotedBlock = `${content}\n\n`;
    }

    const subscribeLink = `⚡️<a href="https://t.me/${this.telegramChannelName}"><b>${this.telegramNameGroup}</b></a>`;
    const captionBody = (header + quotedBlock + trimmedText).trim();

    let finalCaption = captionBody;

    if (captionBody.length + subscribeLink.length + 2 <= CaptionPreparer.MAX_LENGTH) {
      finalCaption += `\n\n${subscribeLink}`;
    }

    return finalCaption.trim();
  }
}

export default CaptionPreparerV;
