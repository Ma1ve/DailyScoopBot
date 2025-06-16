import fs from 'fs';
import path from 'path';

export enum TitleKey {
  LAST_TITLE_V = 'lastTitleV',
  LAST_TITLE_SF = 'lastTitleSF',
  LAST_TITLE_G = 'lastTitleG',
}

export enum UrlIndexKey {
  INDEX_G = 'indexG',
  INDEX_SF = 'indexSF',
  INDEX_V = 'indexV',
}

class LastNewsTitleStore {
  private stateTitlePath: string;

  constructor() {
    this.stateTitlePath = path.resolve(__dirname, '..', '..', 'cache', 'state.json');
  }

  private loadState(): Record<string, any> {
    if (fs.existsSync(this.stateTitlePath)) {
      try {
        const fileContent = fs.readFileSync(this.stateTitlePath, 'utf-8');
        return JSON.parse(fileContent);
      } catch (error) {
        console.error('Ошибка чтения state.json:', error);
      }
    }
    return {};
  }

  private saveState(state: Record<string, any>) {
    try {
      fs.writeFileSync(this.stateTitlePath, JSON.stringify(state, null, 2), 'utf8');
    } catch (error) {
      console.error('Ошибка записи в state.json:', error);
    }
  }

  public loadTitle({ key, category }: { key: TitleKey; category: string }): string {
    const state = this.loadState();
    return state[key]?.[category] || '';
  }

  public saveTitle({
    key,
    category,
    title,
  }: {
    key: TitleKey;
    category: string;
    title: string;
  }): void {
    const state = this.loadState();

    if (typeof state[key] !== 'object' || state[key] === null) {
      state[key] = {};
    }

    state[key][category] = title;
    this.saveState(state);
  }
}

export default LastNewsTitleStore;
