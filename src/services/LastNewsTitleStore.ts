import fs from 'fs';
import path from 'path';

class LastNewsTitleStore {
  private stateTitlePath: string;

  constructor() {
    this.stateTitlePath = path.resolve(__dirname, '..', '..', 'cache', 'state.json');
  }

  loadTitle() {
    if (fs.existsSync(this.stateTitlePath)) {
      const stateData = JSON.parse(fs.readFileSync(this.stateTitlePath, 'utf-8'));
      return stateData.lastTitle;
    }
    return '';
  }

  saveTitle(title: string) {
    fs.writeFileSync(this.stateTitlePath, JSON.stringify({ lastTitle: title }, null, 2), 'utf8');
  }
}

export default LastNewsTitleStore;
