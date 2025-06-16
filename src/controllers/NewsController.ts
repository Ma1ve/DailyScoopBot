import NewsParserG from '../news/news-parsers/implementations/NewsParserG';
import NewsParserSF from '../news/news-parsers/implementations/NewsParserSF';
import NewsParserV from '../news/news-parsers/implementations/NewsParserV';
import RephraseService from '../services/RephraseService';
import TelegramBotService from '../services/TelegramBotService';

class NewsController {
  private telegramBot: TelegramBotService;
  private parseNewsService: NewsParserV | NewsParserSF | NewsParserG;
  private rephraseService: RephraseService;

  constructor(
    TelegramBot: TelegramBotService,
    ParseNewsService: NewsParserV | NewsParserSF | NewsParserG,
    RephraseService: RephraseService,
  ) {
    this.telegramBot = TelegramBot;
    this.parseNewsService = ParseNewsService;
    this.rephraseService = RephraseService;
  }

  async sendNews() {
    try {
      const currNews = await this.parseNewsService.parseNews();

      /* 
        Если новость дублируется, currNews возвращает null -> ничего не отправляем, 
        ждем след 30 мин 
      */
      if (currNews === null) return;

      const captionMessage = await this.rephraseService.rephraseText(currNews.message);

      this.telegramBot.sendMessageToChannel(captionMessage, currNews.image);
    } catch (error: unknown) {
      const e = error as Error;
      console.error('Ошибка sendNews при отправке новостей:', e.message);

      this.telegramBot.sendErrorMessage();
    }
  }
}

export default NewsController;
