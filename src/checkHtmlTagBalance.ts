export function checkHtmlTagBalance(text: string): string[] {
  const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  const stack: string[] = [];
  const errors: string[] = [];

  const allowedTags = new Set(['b', 'strong', 'i', 'em', 'u', 's', 'code', 'pre', 'blockquote', 'a']);

  let match;
  while ((match = tagRegex.exec(text)) !== null) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    const isClosing = fullTag.startsWith('</');

    if (!allowedTags.has(tagName)) {
      errors.push(`Недопустимый тег: <${isClosing ? '/' : ''}${tagName}>`);
      continue;
    }

    if (!isClosing) {
      // Открывающий тег
      stack.push(tagName);
    } else {
      // Закрывающий тег
      const last = stack.pop();
      if (last !== tagName) {
        errors.push(`Несоответствие тегов: ожидался </${last}>, а найден </${tagName}>`);
      }
    }
  }

  // Остались незакрытые теги
  while (stack.length > 0) {
    const unclosed = stack.pop();
    errors.push(`Тег <${unclosed}> не закрыт`);
  }

  return errors;
}
