import NewsParserG from '../news/news-parsers/implementations/NewsParserG';
import NewsParserSF from '../news/news-parsers/implementations/NewsParserSF';
import NewsParserV from '../news/news-parsers/implementations/NewsParserV';

type NewsParserItem = {
  parser: NewsParserG | NewsParserSF | NewsParserV;
  times: string[];
};

export function getClosestParserToNow(parsers: NewsParserItem[], now: Date) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let selectedParser: NewsParserItem | null = null;
  let maxMatchedTime: number | null = null;

  let minFutureTime: number | null = null;
  let minFutureParser: NewsParserItem | null = null;

  for (const item of parsers) {
    for (const time of item.times) {
      const [h, m] = time.split(':').map(Number);
      const timeMinutes = h * 60 + m;

      if (timeMinutes <= nowMinutes) {
        if (maxMatchedTime === null || timeMinutes > maxMatchedTime) {
          maxMatchedTime = timeMinutes;
          selectedParser = item;
        }
      } else {
        if (minFutureTime === null || timeMinutes < minFutureTime) {
          minFutureTime = timeMinutes;
          minFutureParser = item;
        }
      }
    }
  }

  if (selectedParser !== null) {
    return selectedParser;
  }

  return minFutureParser;
}
