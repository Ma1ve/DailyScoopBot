import axios from 'axios';

class RephraseService {
  private prompt: string;
  private openrouterToken: string;
  private model: string;

  constructor(model: string) {
    const prompt = process.env.MODEL_PROMPT;
    const openrouterToken = process.env.OPENROUTER_TOKEN;
    const envModel = process.env.LLM_MODEL;

    if (!prompt) throw new Error('MODEL_PROMPT is not defined in environment variables.');
    if (!openrouterToken)
      throw new Error('OPENROUTER_TOKEN is not defined in environment variables.');

    const finalModel = model || envModel;
    if (!finalModel) {
      throw new Error('LLM model is not provided.');
    }

    this.prompt = prompt.replaceAll('\\n', '\n');
    this.openrouterToken = openrouterToken;
    this.model = finalModel;
  }

  public async rephraseText(inputText: string): Promise<string> {
    const promptInputText = this.buildPrompt(inputText);
    const content = await this.fetchLLMResponse(promptInputText);

    return this.cleanResponse(content);
  }

  private buildPrompt(inputText: string): string {
    return `${this.prompt}\n\n${inputText}`;
  }

  private async fetchLLMResponse(prompt: string): Promise<string> {
    try {
      const { data } = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: {
            Authorization: `Bearer ${this.openrouterToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('Пустой ответ от модели или неверный формат.');
      }

      return content;
    } catch (error: unknown) {
      const e = error as Error;

      throw new Error(`Ошибка при запросе к LLM: ${e.message}`);
    }
  }

  private cleanResponse(text: string): string {
    let result = text;
    result = this.stripWrappers(result);
    return result;
  }

  private stripWrappers(text: string): string {
    let result = text;

    // Убираем обертку \boxed{...}
    result = result.replace(/^\\boxed{([\s\S]*)}\s*$/, '$1');

    console.log(result, 'result BEFORE REF');

    // Убираем Markdown-блоки ```html ... ```
    result = result
      .replace(/^\s*```(?:html)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    // Убираем просто "html" в начале, если есть
    result = result.replace(/^html\s*/i, '').trim();

    console.log(result, 'result AFTER REF');

    return result;
  }
}

export default RephraseService;
