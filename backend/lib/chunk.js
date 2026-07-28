// Splits text into overlapping chunks of ~`size` characters, snapping chunk
// boundaries to sentence/word breaks so words are never cut in half.
export function chunkText(text, size = 1000, overlap = 200) {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);

    // If this isn't the final chunk, snap `end` back to a clean boundary.
    if (end < clean.length) {
      const window = clean.slice(start, end);

      // Prefer the last sentence break. Matching ". " (period + space) rather
      // than "." avoids splitting decimals like "1.67 million".
      const lastSentence = Math.max(
        window.lastIndexOf(". "),
        window.lastIndexOf("! "),
        window.lastIndexOf("? ")
      );

      if (lastSentence > size * 0.5) {
        end = start + lastSentence + 1;        // include the punctuation
      } else {
        const lastSpace = window.lastIndexOf(" "); // fall back to a word boundary
        if (lastSpace > size * 0.5) end = start + lastSpace;
      }
    }

    chunks.push(clean.slice(start, end).trim());

    // Step forward, keeping `overlap` chars of context, snapped to a word start.
    let next = end - overlap;
    if (next > start) {
      const space = clean.indexOf(" ", next);
      if (space !== -1 && space < end) next = space + 1;
    } else {
      next = end;                               // guard against infinite loops
    }
    start = next;
  }

  return chunks.filter(Boolean);
}