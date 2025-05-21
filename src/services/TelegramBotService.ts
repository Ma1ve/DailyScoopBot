import TelegramBot from 'node-telegram-bot-api';

class TelegramBotService {
  private bot: TelegramBot;
  private chatId: string;

  constructor() {
    const token = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.CHAT_ID;

    if (!token) throw new Error('TELEGRAM_TOKEN is not defined in environment variables.');
    if (!chatId) throw new Error('CHAT_ID is not defined in environment variables.');

    this.bot = new TelegramBot(token, { polling: true });
    this.chatId = chatId;
  }

  public async sendMessageToChannel(captionMessage: string, imageUrl: string) {
    await this.bot.sendPhoto(this.chatId, imageUrl, {
      caption: captionMessage,
      parse_mode: 'HTML',
    });
  }

  public async sendErrorMessage() {
    await this.bot.sendMessage(this.chatId, 'Произошла ошибка при получении новостей.');
  }
}

export default TelegramBotService;
