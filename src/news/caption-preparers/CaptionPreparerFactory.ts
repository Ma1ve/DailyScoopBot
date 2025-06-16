import CaptionPreparerG from './implementations/CaptionPreparerG';
import CaptionPreparerFS from './implementations/CaptionPreparerSF';
import CaptionPreparerV from './implementations/CaptionPreparerV';

export enum NEWS {
  NEWS_V = 'NEWS_V',
  NEWS_SF = 'NEWS_SF',
  NEWS_G = 'NEWS_G',
}

export default class CaptionPreparerFactory {
  static getPreparer(nameNews: NEWS) {
    switch (nameNews) {
      case NEWS.NEWS_V:
        return new CaptionPreparerV();
      case NEWS.NEWS_SF:
        return new CaptionPreparerFS();
      case NEWS.NEWS_G:
        return new CaptionPreparerG();
      default:
        throw new Error('Обработчика для данных новостей нету');
    }
  }
}
