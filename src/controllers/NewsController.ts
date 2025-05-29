import { checkHtmlTagBalance } from '../checkHtmlTagBalance';
import ParseNewsService from '../services/ParseNewsService';
import RephraseService from '../services/RephraseService';
import TelegramBotService from '../services/TelegramBotService';

class NewsController {
  private telegramBot: TelegramBotService;
  private parseNewsService: ParseNewsService;
  private rephraseService: RephraseService;

  constructor(TelegramBot: TelegramBotService, ParseNewsService: ParseNewsService, RephraseService: RephraseService) {
    this.telegramBot = TelegramBot;
    this.parseNewsService = ParseNewsService;
    this.rephraseService = RephraseService;
  }

  async sendNews() {
    try {
      const currNews = await this.parseNewsService.parseNews();

      console.log(currNews, 'currNews');

      if (currNews === null) return;
      const captionMessage = await this.rephraseService.rephraseText(currNews.message);

      console.log(captionMessage, 'captionMessage');

      const tagErrors = checkHtmlTagBalance(captionMessage);

      if (tagErrors.length > 0) {
        console.warn('Ошибки в HTML-тегах:\n', tagErrors.join('\n'));
      } else {
        console.log('Все теги корректны.');
      }

      console.log(captionMessage.length, 'captionMessage.length captionMessage.length captionMessage.length');

      this.telegramBot.sendMessageToChannel(captionMessage, currNews.image);
    } catch (error: unknown) {
      const e = error as Error;
      console.error('Ошибка sendNews при отправке новостей:', e.message);

      this.telegramBot.sendErrorMessage();
    }
  }
}

export default NewsController;
