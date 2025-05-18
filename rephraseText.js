const axios = require('axios');

async function rephraseText(inputText) {
  const promptTemplate = process.env.MODEL_PROMPT?.replaceAll('\\n', '\n') || '';
  const prompt = `${promptTemplate}\n\n${inputText}`;

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'deepseek/deepseek-r1-zero:free',
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    },
  );

  const rawContent = response.data.choices?.[0]?.message?.content;

  if (!rawContent) throw new Error('Пустой ответ от модели или неверный формат.');

  const cleaned = rawContent.replace(/^\\boxed{([\s\S]*)}$/, '$1');
  return cleaned;
}

module.exports = { rephraseText };
