const blockBoundaryPattern =
  /<\/?(?:address|article|aside|blockquote|br|dd|div|dl|dt|figcaption|figure|footer|h[1-6]|header|hr|important|li|main|nav|note|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul|warning)\b[^>]*>/gi;

const entityValues: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"'
};

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|apos|gt|lt|nbsp|quot);/gi, (entity, name: string) => {
    if (name.startsWith("#x") || name.startsWith("#X")) {
      const codePoint = Number.parseInt(name.slice(2), 16);
      return Number.isInteger(codePoint) && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    }
    if (name.startsWith("#")) {
      const codePoint = Number.parseInt(name.slice(1), 10);
      return Number.isInteger(codePoint) && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    }
    return entityValues[name.toLowerCase()] ?? entity;
  });
}

/**
 * Produces readable, non-markup text for the lightweight SSR reference and
 * document metadata. The full interactive reference still owns rich Markdown
 * rendering; this path deliberately adds no Markdown/HTML runtime to the
 * initial browser bundle.
 */
export function apiDescriptionPlainText(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(blockBoundaryPattern, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\[([^\]]+)]\([^\s)]+(?:\s+[^)]*)?\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/~~([^~]+)~~/g, "$1")
  )
    .replace(/[\t ]+/g, " ")
    .replace(/\s+([,.;:!?。，；：！？])/g, "$1")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function apiDescriptionParagraphs(value: string) {
  return apiDescriptionPlainText(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, " ").trim())
    .filter(Boolean);
}
