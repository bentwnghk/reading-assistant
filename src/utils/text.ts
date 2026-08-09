const MAX_TEXT_CHUNK_LENGTH = 2000; // 你可以根据需要调整这个值

export function splitText(
  text: string = "",
  maxLength: number = MAX_TEXT_CHUNK_LENGTH
): string[] {
  const paragraphs = text.split("\n");
  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + 1 <= maxLength) {
      // +1 是为了加上换行符
      currentChunk += (currentChunk.length > 0 ? "\n" : "") + paragraph;
    } else {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }
      currentChunk = paragraph;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

export function removeJsonMarkdown(text: string) {
  text = text.trim();
  if (text.startsWith("```json")) {
    text = text.slice(7);
  } else if (text.startsWith("json")) {
    text = text.slice(4);
  } else if (text.startsWith("```")) {
    text = text.slice(3);
  }
  if (text.endsWith("```")) {
    text = text.slice(0, -3);
  }
  return text.trim();
}

/**
 * Check if a text contains XML or HTML tags.
 * Consider various scenarios, including:
 * - Regular tags (such as <p>, <div>)
 * - Tags with attributes (such as <a href="...">)
 * - Self-closing tags (such as <img />, <br>)
 * - Closed tags (such as </p>)
 * - XML/HTML comments (such as <!-- ... -->)
 * - XML ​​processing instructions (such as <?xml ... ?>)
 * - CDATA sections (such as <![CDATA[ ... ]]> )
 * - DOCTYPE declarations (such as <!DOCTYPE html>)
 *
 * Note: This method is a fast detection based on pattern matching, not a complete parser.
 * It may misjudge some non-tag but similarly structured text as tags, but it is sufficient in most detection scenarios.
 * Strict validation requires a full parser.
 *
 * @param text The text to be detected
 * @returns Returns true if the text contains any structure that looks like an XML/HTML tag, otherwise returns false.
 */
export function containsXmlHtmlTags(text: string): boolean {
  // Check if the input is a string and is not empty
  if (typeof text !== "string" || text.length === 0) {
    return false;
  }

  // Build regular expressions to match various possible tag structures
  // This regular expression tries to cover common XML/HTML structures:
  // 1. <!--.*?--> : matches HTML/XML comments (non-greedy matching)
  // 2. <![CDATA[.*?]]> : matches CDATA sections (non-greedy matching)
  // 3. <!DOCTYPE[^>]*?> : matches DOCTYPE declarations (non-greedy matching)
  // 4. <\?.*?\?> : matches XML processing instructions (e.g. <?xml ... ?>) (non-greedy matching)
  // 5. <[!\/]?[a-zA-Z][^>]*?> : matches normal tags, tags with attributes, self-closing tags, closing tags, and <!ELEMENT>, etc.
  // < : matches '<'
  // [!\/]? : optional '!' (for <!ELEMENT>) or '/' (for closing tags)
  // [a-zA-Z] : tag names start with letters (XML/HTML standard)
  // [^>]*? : non-greedy matches any non-'>' character (remaining part of tag name, attributes, self-closing '/')
  // > : matches '>'
  //
  // Use the 'i' flag for case-insensitive matching (HTML tag names and attribute names are usually case-insensitive)
  // Use the 'test()' method, which only needs to find the first match to return true, which is more efficient
  const xmlHtmlTagRegex =
    /(<!--.*?-->|<!\[CDATA\[.*?]]>|<!DOCTYPE[^>]*?>|<\?.*?\?>|<[!\/]?[a-zA-Z][^>]*?>)/i;

  return xmlHtmlTagRegex.test(text);
}

export class ThinkTagStreamProcessor {
  private buffer: string = "";
  private hasSkippedThinkBlock: boolean = false;

  /**
   * Process the received text block.
   * @param chunk The received text block.
   * @param outputCallback The callback function called when there is non-thinking content to be output.
   */
  processChunk(
    chunk: string,
    contentOutput: (data: string) => void,
    thinkingOutput?: (data: string) => void
  ): void {
    // If the think block has been skipped, all new data is output directly
    if (this.hasSkippedThinkBlock) {
      contentOutput(chunk);
      return;
    }

    // Otherwise, while still looking for or processing a think block, add the new block to the buffer
    this.buffer += chunk;

    const startTag = this.buffer.startsWith("<think>");
    const endTagIndex = this.buffer.indexOf("</think>");

    if (startTag) {
      if (endTagIndex !== -1) {
        const contentAfterThink = this.buffer.substring(
          endTagIndex + "</think>".length
        );

        // Output the content after </think>
        if (contentAfterThink.length > 0) {
          contentOutput(contentAfterThink);
        }

        this.hasSkippedThinkBlock = true;
        this.buffer = "";
      } else {
        if (thinkingOutput) thinkingOutput(chunk);
      }
    } else {
      this.hasSkippedThinkBlock = true;
      contentOutput(chunk);
    }
  }
  end(): void {
    this.buffer = "";
    this.hasSkippedThinkBlock = false;
  }
}

export interface SkimExcerpts {
  firstParagraph?: string;
  subheadings: string[];
  topicSentences: string[];
  lastParagraph?: string;
}

const SKIM_HEADING_RE = /^\s*#{1,6}\s+(.+?)\s*#*\s*$/;

/**
 * Extract the first sentence of a paragraph. Handles ASCII and CJK terminal
 * punctuation. Falls back to the first line if no terminal punctuation exists.
 */
function firstSentence(paragraph: string): string {
  const trimmed = paragraph.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^.+?[.!?。！？](?=\s|$)/);
  if (match) return match[0].trim();
  return trimmed.split(/\n/)[0].trim();
}

/**
 * Derive the text features a reader should SKIM before predicting, per standard
 * reading-strategy guidance (UNC Learning Center; Lumen Learning). The sequence
 * a good reader samples is: title (passed separately as `docTitle`), first
 * paragraph, subheadings, the first sentence of each body paragraph, and the
 * last paragraph. This mirrors that set so the prediction step is grounded in
 * actual skimming rather than the title alone.
 */
export function extractSkimExcerpts(text: string): SkimExcerpts {
  const result: SkimExcerpts = { subheadings: [], topicSentences: [] };
  if (!text || typeof text !== "string") return result;

  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const bodyParagraphs: string[] = [];

  for (const block of blocks) {
    const headingMatch = block.match(SKIM_HEADING_RE);
    if (headingMatch) {
      result.subheadings.push(headingMatch[1].trim());
      continue;
    }
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    // A standalone short line reads as a heading. Only "." / "。" are treated
    // as paragraph-terminating — "?" / "!" (and their CJK forms) are common in
    // titles and section headings ("Where Do Penguins Live?", "Watch Out!"),
    // so a short line ending with them should still be classified as a heading
    // rather than falling through into bodyParagraphs and getting selected as
    // the first/last paragraph for skimming.
    if (
      lines.length === 1 &&
      lines[0].length > 0 &&
      lines[0].length <= 60 &&
      !/[.。]$/.test(lines[0])
    ) {
      result.subheadings.push(lines[0]);
      continue;
    }
    bodyParagraphs.push(block);
  }

  if (bodyParagraphs.length > 0) {
    // When the text uses [N]-style numbered paragraphs, anchor the first/last
    // excerpts to those markers: first = the paragraph beginning with [1],
    // last = the paragraph beginning with the largest [N]. Paragraphs without
    // terminal punctuation are ignored as candidates so stray fragments or
    // heading-like lines can't be selected.
    const NUMBERED_RE = /^\s*\[(\d+)\]/;
    const TERMINAL_PUNCT_RE = /[.!?。！？]$/;
    const numberedCandidates: { num: number; text: string }[] = [];
    for (const p of bodyParagraphs) {
      const m = p.match(NUMBERED_RE);
      if (m && TERMINAL_PUNCT_RE.test(p.trim())) {
        const num = parseInt(m[1], 10);
        if (Number.isFinite(num)) numberedCandidates.push({ num, text: p });
      }
    }

    if (numberedCandidates.length > 0) {
      const first = numberedCandidates.find((c) => c.num === 1);
      if (first) result.firstParagraph = first.text;
      const last = numberedCandidates.reduce((acc, c) => (c.num > acc.num ? c : acc));
      if (last && last.text !== result.firstParagraph) result.lastParagraph = last.text;
    } else {
      const punctuated = bodyParagraphs.filter((p) => TERMINAL_PUNCT_RE.test(p.trim()));
      if (punctuated.length > 0) {
        result.firstParagraph = punctuated[0];
        if (punctuated.length > 1) {
          result.lastParagraph = punctuated[punctuated.length - 1];
        }
      }
    }

    result.topicSentences = bodyParagraphs
      .map(firstSentence)
      .filter((s) => s.length > 0)
      .slice(0, 8);
  }

  return result;
}

export function sanitizeSentenceAnalysis(
  analysis: string,
  sentence: string
): string {
  const trimmed = analysis.trim();
  if (!trimmed) return trimmed;

  const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
  const normalizedSentence = normalize(sentence);

  const boldRegex = /\*\*([^*]+)\*\*/g;
  let match: RegExpExecArray | null;
  while ((match = boldRegex.exec(trimmed)) !== null) {
    if (normalize(match[1]) === normalizedSentence) {
      return trimmed.slice(match.index).trim();
    }
  }

  const firstBold = trimmed.search(/\*\*/);
  const firstHeading = trimmed.search(/^##\s/m);
  let cutIndex = -1;
  if (firstBold >= 0 && firstHeading >= 0) {
    cutIndex = Math.min(firstBold, firstHeading);
  } else if (firstBold >= 0) {
    cutIndex = firstBold;
  } else if (firstHeading >= 0) {
    cutIndex = firstHeading;
  }
  if (cutIndex > 0) {
    return trimmed.slice(cutIndex).trim();
  }

  return trimmed;
}
