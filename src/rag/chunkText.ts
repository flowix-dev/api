export function chunkText(text: string, chunkSize = 1200): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= chunkSize) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (paragraph.length > chunkSize) {
      const sentences = paragraph.match(/[^.!?]+[.!?]*\s*/g) ?? [paragraph];
      let buffer = "";
      for (const sentence of sentences) {
        if ((buffer + sentence).length > chunkSize) {
          if (buffer.trim()) {
            chunks.push(buffer.trim());
          }
          buffer = sentence;
        } else {
          buffer += sentence;
        }
      }
      if (buffer.trim()) {
        chunks.push(buffer.trim());
      }
    } else {
      current = paragraph;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.filter((chunk) => chunk.length > 0);
}
