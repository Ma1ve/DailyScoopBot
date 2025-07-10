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
    try {
      if (!imageUrl) {
        // Отправляем только текст, если нет картинки
        await this.bot.sendMessage(this.chatId, captionMessage, {
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        });
      } else {
        // Отправляем фото с подписью
        await this.bot.sendPhoto(this.chatId, imageUrl, {
          caption: captionMessage,
          parse_mode: 'HTML',
        });
      }
    } catch (error: unknown) {
      const e = error as Error;
      console.error('Ошибка при отправке сообщения в Telegram:', e.message);
    }
  }

  public async sendErrorMessage() {
    await this.bot.sendMessage(this.chatId, 'Произошла ошибка при получении новостей.');
  }
}

export default TelegramBotService;
