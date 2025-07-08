import cron from 'node-cron';

import NewsController from '../controllers/NewsController';

import TelegramBotService from '../services/TelegramBotService';
import RephraseService from '../services/RephraseService';

import { getClosestParserToNow } from '../utils/getClosestParserToNow';

import CaptionPreparerFactory, { NEWS } from '../news/caption-preparers/CaptionPreparerFactory';

import NewsParserG from '../news/news-parsers/implementations/NewsParserG';
import NewsParserSF from '../news/news-parsers/implementations/NewsParserSF';
import NewsParserV from '../news/news-parsers/implementations/NewsParserV';

export const startNewsCron = () => {
  //! PARSER G NEWS
  /* SCIENCE */
  const parserScienceNewsG = new NewsParserG(CaptionPreparerFactory.getPreparer(NEWS.NEWS_G), {
    baseNewsUrl: process.env.BASE_NEWS_URL_G,
    currentNewsUrl: `${process.env.BASE_NEWS_URL_G}/science/news/`,
  });

  /* BUSINESS */
  const parserBusinessNewsG = new NewsParserG(CaptionPreparerFactory.getPreparer(NEWS.NEWS_G), {
    baseNewsUrl: process.env.BASE_NEWS_URL_G,
    currentNewsUrl: `${process.env.BASE_NEWS_URL_G}/business/news/`,
  });

  /* ARMY */
  const parserArmyNewsG = new NewsParserG(CaptionPreparerFactory.getPreparer(NEWS.NEWS_G), {
    baseNewsUrl: process.env.BASE_NEWS_URL_G,
    currentNewsUrl: `${process.env.BASE_NEWS_URL_G}/army/news/`,
  });

  /* SOCIAL */
  const parserSocialNewsG = new NewsParserG(CaptionPreparerFactory.getPreparer(NEWS.NEWS_G), {
    baseNewsUrl: process.env.BASE_NEWS_URL_G,
    currentNewsUrl: `${process.env.BASE_NEWS_URL_G}/social/news/`,
  });

  /* POLITICS */
  const parserPoliticsNewsG = new NewsParserG(CaptionPreparerFactory.getPreparer(NEWS.NEWS_G), {
    baseNewsUrl: process.env.BASE_NEWS_URL_G,
    currentNewsUrl: `${process.env.BASE_NEWS_URL_G}/politics/news/`,
  });

  /* TECH */
  const parserTechNewsG = new NewsParserG(CaptionPreparerFactory.getPreparer(NEWS.NEWS_G), {
    baseNewsUrl: process.env.BASE_NEWS_URL_G,
    currentNewsUrl: `${process.env.BASE_NEWS_URL_G}/tech/news/`,
  });

  //! PARSER SF NEWS
  /* PARSER SF CRIMINAL NEWS */
  const parserCriminalNewsSF = new NewsParserSF(CaptionPreparerFactory.getPreparer(NEWS.NEWS_SF), {
    baseNewsUrl: process.env.BASE_NEWS_URL_SF,
    currentNewsUrl: `${process.env.BASE_NEWS_URL_SF}/criminal/`,
  });

  //! PARSER V NEWS
  /* PARSER ALL MAIN NEWS */
  const parserNewsV = new NewsParserV(CaptionPreparerFactory.getPreparer(NEWS.NEWS_V), {
    baseNewsUrl: process.env.BASE_NEWS_URL_V,
    currentNewsUrl: `${process.env.BASE_NEWS_URL_V}/news`,
  });

  const telegramBot = new TelegramBotService();
  const rephraseService = new RephraseService('deepseek/deepseek-r1-0528:free');

  const scheduleParsers = [
    { parser: parserArmyNewsG, times: ['08:00'] },
    { parser: parserCriminalNewsSF, times: ['15:00'] },
    { parser: parserNewsV, times: ['22:30'] },

    { parser: parserTechNewsG, times: ['08:30', '10:30', '12:30', '14:30', '16:30', '18:30', '23:30'] },
    { parser: parserPoliticsNewsG, times: ['11:00', '13:00', '15:30', '17:30', '19:30', '20:30'] },
    { parser: parserBusinessNewsG, times: ['09:30', '11:30', '13:30', '16:00', '18:00', '20:00'] },
    { parser: parserScienceNewsG, times: ['10:00', '12:00', '14:00', '17:00', '19:00', '21:30'] },
    { parser: parserSocialNewsG, times: ['09:00', '21:00', '22:00', '23:00'] },
  ];

  cron.schedule('*/30 5-20 * * *', async () => {
    try {
      const now = new Date();

      const currentParser = getClosestParserToNow(scheduleParsers, now);

      if (!currentParser) {
        console.log(`Парсер не найден для текущего времени`);
        return;
      }

      const newsController = new NewsController(telegramBot, currentParser.parser, rephraseService);
      await newsController.sendNews();

      console.log(`Новость отправлена: ${new Date().toISOString()}`);
    } catch (err) {
      console.error('Ошибка в sendNews():', err);
    }
  });
};
