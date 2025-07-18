import { DateTime } from 'luxon';

import NewsParserG from '../news/news-parsers/implementations/NewsParserG';
import NewsParserSF from '../news/news-parsers/implementations/NewsParserSF';
import NewsParserV from '../news/news-parsers/implementations/NewsParserV';

type NewsParserItem = {
  parser: NewsParserG | NewsParserSF | NewsParserV;
  times: string[];
};

export function getClosestParserToNow(parsers: NewsParserItem[]) {
  const moscowNow = DateTime.now().setZone('Europe/Moscow');
  const nowMinutes = moscowNow.hour * 60 + moscowNow.minute;

  // const BLOCKED_TIMES = ['09:30', '13:00', '21:00'];
  // Проверяем, не попадает ли текущее время в заблокированный диапазон ±2 минуты
  // for (const time of BLOCKED_TIMES) {
  //   const [h, m] = time.split(':').map(Number);
  //   const blockedMinutes = h * 60 + m;

  //   if (Math.abs(nowMinutes - blockedMinutes) <= 2) {
  //     return null;
  //   }
  // }

  let selectedParser: NewsParserItem | null = null;
  let closestTimeDiff = Number.MAX_SAFE_INTEGER;

  let futureParser: NewsParserItem | null = null;
  let minFutureTimeDiff = Number.MAX_SAFE_INTEGER;

  for (const item of parsers) {
    for (const time of item.times) {
      const [h, m] = time.split(':').map(Number);
      const timeMinutes = h * 60 + m;

      const diff = nowMinutes - timeMinutes;

      if (diff >= 0 && diff < closestTimeDiff) {
        // Прошедшее время, но самое близкое
        closestTimeDiff = diff;
        selectedParser = item;
      }

      if (diff < 0 && Math.abs(diff) < minFutureTimeDiff) {
        // Будущее время, ближайшее вперёд
        minFutureTimeDiff = Math.abs(diff);
        futureParser = item;
      }
    }
  }

  return selectedParser ?? futureParser;
}
