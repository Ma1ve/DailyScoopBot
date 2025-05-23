import cron from 'node-cron';
import NewsController from '../controllers/NewsController';
import TelegramBotService from '../services/TelegramBotService';
import ParseNewsService from '../services/ParseNewsService';
import RephraseService from '../services/RephraseService';

export const startNewsCron = () => {
  const telegramBot = new TelegramBotService();
  const parseNewsService = new ParseNewsService();
  const rephraseService = new RephraseService('deepseek/deepseek-r1-zero:free');

  const newsController = new NewsController(telegramBot, parseNewsService, rephraseService);

  cron.schedule('*/30 5-20 * * *', async () => {
    try {
      await newsController.sendNews();

      console.log(`Новость отправлена: ${new Date().toISOString()}`);
    } catch (err) {
      console.error('Ошибка в sendNews():', err);
    }
  });
};
