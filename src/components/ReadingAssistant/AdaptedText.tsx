"use client";
import dynamic from "next/dynamic";
import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo, Suspense } from "react";
import { useTranslation, Trans } from "react-i18next";
import i18next from "i18next";
import {
  BookOpen,
  LoaderCircle,
  ArrowDown,
  Plus,
  Volume2,
  Loader2,
  Brain,
  FileDown,
  BarChart3,
  Pencil,
  Check,
  X,
  Square,
  Wand2,
  ChevronDown,
  FileText,
  FileEdit,
  FileMinus,
} from "lucide-react";
import TextDifficultyAnalyzer from "./TextDifficultyAnalyzer";
import { formatDateTime } from "@/utils/formatDate";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  convertInchesToTwip,
  PageOrientation,
} from "docx";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { generateText } from "ai";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import GuideDialog from "@/components/Internal/GuideDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReadingStore, getAbortController, removeAbortController } from "@/store/reading";
import { useSettingStore } from "@/store/setting";
import { useGlobalStore } from "@/store/global";
import { generateSignature } from "@/utils/signature";
import { completePath } from "@/utils/url";
import { parseError } from "@/utils/error";
import { sanitizeSentenceAnalysis } from "@/utils/text";
import { splitSentences } from "@/utils/sentences";
import { readAlong, stopReadAlong, stopSpeaking, unlockAudio, isAudioUnlocked } from "@/utils/tts";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import useModelProvider from "@/hooks/useAiProvider";
import { analyzeSentencePrompt } from "@/constants/readingPrompts";
import { logActivity } from "@/utils/activityLogger";

const MagicDown = dynamic(() => import("@/components/MagicDown"));
import ParagraphWithNav from "./ParagraphWithNav";

// ─── helpers ────────────────────────────────────────────────────────────────

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// How long a single-click action (read-along jump / sentence-analysis dialog)
// is deferred on desktop so a double-click can cancel it and let the browser
// finish selecting the word natively. Keep below the typical OS double-click
// threshold (~500ms); 300ms covers most inter-click intervals.
const CLICK_ACTION_DELAY_MS = 300;

function getContextAround(
  text: string,
  target: string,
  charRange: number
): string {
  const index = text.indexOf(target);
  if (index === -1) return target;

  const start = Math.max(0, index - charRange);
  const end = Math.min(text.length, index + target.length + charRange);

  let context = text.slice(start, end);
  if (start > 0) context = "..." + context;
  if (end < text.length) context = context + "...";

  return context;
}

function highlightTextAndSentences(
  text: string,
  words: string[],
  analyzedSentences: Record<string, SentenceAnalysis>,
  glossaryMap: Map<string, GlossaryEntry>
): { html: string; sentenceList: string[] } {
  // First pass: split the full text into sentences and wrap each in a span
  // with a stable data-ra-idx so read-along can highlight the active sentence.
  const sentenceList = splitSentences(text);
  let result = text;
  if (sentenceList.length > 0) {
    // Replace longest sentences first to avoid partial-match collisions.
    const sorted = [...sentenceList].sort((a, b) => b.length - a.length);
    for (const sentence of sorted) {
      const originalIdx = sentenceList.indexOf(sentence);
      // Make the pattern whitespace-flexible: splitSentences normalizes
      // whitespace to single spaces, but the original text may contain
      // newlines or multiple consecutive spaces. Replacing literal spaces
      // with \s+ ensures the normalized sentence still matches the original.
      const flexible = escapeRegExp(sentence).replace(/ +/g, "\\s+");
      const pattern = new RegExp(`(${flexible})`, "g");
      result = result.replace(
        pattern,
        `<span class="ra-sentence" data-ra-idx="${originalIdx}">$1</span>`
      );
    }
  }

  const analyzedKeys = Object.keys(analyzedSentences);
  if (analyzedKeys.length > 0) {
    const sortedSentences = analyzedKeys
      .map((key) => analyzedSentences[key].sentence)
      .filter((s) => s.length > 10)
      .sort((a, b) => b.length - a.length);

    for (const sentence of sortedSentences) {
      const flexible = escapeRegExp(sentence).replace(/ +/g, "\\s+");
      const pattern = new RegExp(`(${flexible})`, "g");
      result = result.replace(
        pattern,
        `<span class="analyzed-sentence border-b-2 border-blue-500 dark:border-blue-400 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950" data-analyzed="1">$1</span>`
      );
    }
  }

  if (words.length > 0) {
    const sortedWords = [...words].sort((a, b) => b.length - a.length);
    const escapedWords = sortedWords.map(escapeRegExp);
    const wordPattern = new RegExp(`(${escapedWords.join("|")})`, "gi");

    result = result.replace(/<[^>]+>|([^<]+)/g, (match, textContent) => {
      if (textContent) {
        return textContent.replace(
          wordPattern,
          (matchedWord: string) => {
            const entry = glossaryMap.get(matchedWord.toLowerCase());
            if (entry) {
              return `<mark class="bg-yellow-200 dark:bg-yellow-400 px-0.5 rounded cursor-pointer" data-glossary-word="${matchedWord}">${matchedWord}<sup class="glossary-indicator inline-flex items-center justify-center min-w-[14px] h-[14px] text-[8px] leading-none rounded-full bg-amber-500/80 dark:bg-amber-600/80 text-white font-bold cursor-pointer select-none ml-0.5 align-super" aria-hidden="true"></sup></mark>`;
            }
            return `<mark class="bg-yellow-200 dark:bg-yellow-400 px-0.5 rounded">${matchedWord}</mark>`;
          }
        );
      }
      return match;
    });
  }

  return { html: result, sentenceList };
}

function createDocxWithHighlights(
  text: string,
  words: string[],
  analyzedSentences: Record<string, SentenceAnalysis>
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = text.split(/\n/);

  const analyzedSet = new Set(
    Object.values(analyzedSentences).map((s) => s.sentence)
  );
  const wordSet = new Set(words.map((w) => w.toLowerCase()));

  for (const line of lines) {
    if (!line.trim()) {
      paragraphs.push(new Paragraph({ children: [] }));
      continue;
    }

    const segments: { text: string; isHighlighted: boolean; isUnderlined: boolean }[] = [];
    let remaining = line;

    while (remaining.length > 0) {
      let earliestMatch: { index: number; length: number; type: "word" | "sentence" } | null = null;

      for (const sentence of analyzedSet) {
        const idx = remaining.indexOf(sentence);
        if (idx !== -1 && (!earliestMatch || idx < earliestMatch.index)) {
          earliestMatch = { index: idx, length: sentence.length, type: "sentence" };
        }
      }

      for (const word of wordSet) {
        const regex = new RegExp(`^${escapeRegExp(word)}$`, "i");
        for (let i = 0; i <= remaining.length - word.length; i++) {
          const substr = remaining.slice(i, i + word.length);
          const prevChar = i > 0 ? remaining[i - 1] : " ";
          const nextChar = i + word.length < remaining.length ? remaining[i + word.length] : " ";
          const isWordBoundary = !/\w/.test(prevChar) && !/\w/.test(nextChar);
          
          if (isWordBoundary && regex.test(substr)) {
            if (!earliestMatch || i < earliestMatch.index) {
              earliestMatch = { index: i, length: word.length, type: "word" };
            }
            break;
          }
        }
      }

      if (earliestMatch) {
        if (earliestMatch.index > 0) {
          segments.push({
            text: remaining.slice(0, earliestMatch.index),
            isHighlighted: false,
            isUnderlined: false,
          });
        }
        const matchedText = remaining.slice(
          earliestMatch.index,
          earliestMatch.index + earliestMatch.length
        );
        segments.push({
          text: matchedText,
          isHighlighted: earliestMatch.type === "word",
          isUnderlined: earliestMatch.type === "sentence",
        });
        remaining = remaining.slice(earliestMatch.index + earliestMatch.length);
      } else {
        segments.push({ text: remaining, isHighlighted: false, isUnderlined: false });
        break;
      }
    }

    const children = segments.map((seg) => {
      let textRunProps: ConstructorParameters<typeof TextRun>[0] = {
        text: seg.text,
      };
      if (seg.isHighlighted) {
        textRunProps = { ...textRunProps, highlight: "yellow" };
      }
      if (seg.isUnderlined) {
        textRunProps = { ...textRunProps, underline: { type: "single" }, color: "0000FF" };
      }
      return new TextRun(textRunProps);
    });

    paragraphs.push(new Paragraph({ children }));
  }

  return paragraphs;
}

/**
 * Converts the AI-generated markdown analysis string into an array of rich
 * docx Paragraphs, preserving:
 *   - ## headings  → HeadingLevel.HEADING_2
 *   - **bold** spans inline (including "- **label**: rest" bullet lines)
 *   - "- " bullet lines → bulleted paragraph
 *   - blank lines → spacer paragraphs
 *   - plain prose → plain paragraphs
 */
function parseAnalysisMarkdown(markdown: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  /** Split a line into TextRun segments, converting **...** to bold runs. */
  function parseInline(text: string): TextRun[] {
    const runs: TextRun[] = [];
    // Regex splits on **...**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    for (const part of parts) {
      if (part.startsWith("**") && part.endsWith("**")) {
        runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
      } else if (part) {
        runs.push(new TextRun({ text: part }));
      }
    }
    return runs.length > 0 ? runs : [new TextRun({ text: "" })];
  }

  for (const rawLine of markdown.split(/\n/)) {
    const line = rawLine.trimEnd();

    // ## Section heading
    if (/^#{1,3}\s/.test(line)) {
      const headingText = line.replace(/^#{1,3}\s+/, "");
      paragraphs.push(
        new Paragraph({
          children: parseInline(headingText),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 160, after: 60 },
        })
      );
      continue;
    }

    // Bullet line: "- ..." (with or without leading bold label)
    if (/^-\s/.test(line)) {
      const bulletContent = line.replace(/^-\s+/, "");
      paragraphs.push(
        new Paragraph({
          children: parseInline(bulletContent),
          bullet: { level: 0 },
          spacing: { before: 40, after: 40 },
        })
      );
      continue;
    }

    // Blank line → spacer
    if (!line.trim()) {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
      continue;
    }

    // Plain prose (including the opening **sentence** bold line)
    paragraphs.push(
      new Paragraph({
        children: parseInline(line),
        spacing: { before: 60, after: 60 },
      })
    );
  }

  return paragraphs;
}

/**
 * The sentence-analysis AI prompt (see `analyzeSentencePrompt`) mandates the
 * response begin with a bolded line `**<sentence>**`. When exporting to Word,
 * that line would duplicate the numbered heading-3 sentence paragraph rendered
 * just above it, so strip the leading bold-sentence line (and a single blank
 * line immediately following it) before parsing the rest of the markdown.
 * If the first non-blank line does not match, the markdown is returned as-is.
 */
function stripLeadingSentenceLine(markdown: string, sentence: string): string {
  const lines = markdown.split(/\n/);
  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;
  if (i >= lines.length) return markdown;
  if (lines[i].trim() === `**${sentence.trim()}**`) {
    lines.splice(i, 1);
    if (i < lines.length && !lines[i].trim()) lines.splice(i, 1);
  }
  return lines.join("\n");
}

// ─── component ──────────────────────────────────────────────────────────────

function AdaptedText() {
  const { t } = useTranslation();

  // store
  const {
    docTitle: storedDocTitle,
    extractedText,
    adaptedText,
    simplifiedText,
    studentAge,
    highlightedWords,
    analyzedSentences,
    glossary,
    includeGlossary,
    includeSentenceAnalysis,
    addHighlightedWord,
    removeHighlightedWord,
    removeSentenceAnalysis,
    setSentenceAnalysis,
    getSentenceAnalysis,
    setIncludeGlossary,
    setIncludeSentenceAnalysis,
    setExtractedText,
    clearDerivedData,
    readAlongIndex,
    readAlongPlaying,
    setReadAlong,
  } = useReadingStore();

  const { setTutorChatSelectedText } = useGlobalStore();

  const {
    ttsVoice,
    ttsPlaybackRate,
    mode,
    openaicompatibleApiKey,
    accessPassword,
    openaicompatibleApiProxy,
    sentenceAnalysisModel,
  } = useSettingStore();

  const { activeGenerations, adaptText, simplifyText, suggestVocabulary } = useReadingAssistant();
  const { createModelProvider } = useModelProvider();
  const { setGenerating } = useReadingStore();

// tab state
  const [activeTab, setActiveTab] = useState<string>("original");
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [suggestCount, setSuggestCount] = useState(20);

  const isAdapting = !!activeGenerations["adapted-text"];
  const isSimplifying = !!activeGenerations["simplified-text"];
  const isSuggesting = !!activeGenerations["vocabulary-suggest"];
  const isAnalysisLoading = !!activeGenerations["sentence-analysis"];

  // ── interactive-text state ──
  const containerRef = useRef<HTMLDivElement | null>(null);
  const adaptedContainerRef = useRef<HTMLDivElement | null>(null);
  const simplifiedContainerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tabsRef = useRef<HTMLDivElement | null>(null);

  const paragraphCounts = useMemo(
    () => ({
      original: extractedText ? extractedText.split(/\n\s*\n/).filter((p) => p.trim()).length : 0,
      adapted: adaptedText ? adaptedText.split(/\n\s*\n/).filter((p) => p.trim()).length : 0,
      simplified: simplifiedText ? simplifiedText.split(/\n\s*\n/).filter((p) => p.trim()).length : 0,
    }),
    [extractedText, adaptedText, simplifiedText]
  );

  const handleNavigateToParagraph = useCallback(
    (targetTab: "original" | "adapted" | "simplified", paragraphIndex: number) => {
      setActiveTab(targetTab);

      setTimeout(() => {
        const containerMap = {
          original: containerRef,
          adapted: adaptedContainerRef,
          simplified: simplifiedContainerRef,
        };
        const container = containerMap[targetTab].current;
        if (!container) return;

        const targetElement = container.querySelector(
          `[data-paragraph-index="${paragraphIndex}"]`
        );
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
          targetElement.classList.add("ring-2", "ring-primary", "ring-offset-2", "rounded");
          setTimeout(() => {
            targetElement.classList.remove("ring-2", "ring-primary", "ring-offset-2", "rounded");
          }, 10000);
        }
      }, 100);
    },
    []
  );

  const scrollToTabTop = useCallback(() => {
    requestAnimationFrame(() => {
      tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const [selection, setSelection] = useState<{
    text: string;
    x: number;
    y: number;
    above: boolean;
  } | null>(null);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const [activeSentence, setActiveSentence] = useState<string | null>(null);
  const [vocabListOpen, setVocabListOpen] = useState(false);
  const [analyzedSentencesOpen, setAnalyzedSentencesOpen] = useState(false);
  const isTouchDeviceRef = useRef(false);
  const sentenceListRef = useRef<string[]>([]);
  const popupRef = useRef<HTMLDivElement>(null);
  const glossaryPopoverRef = useRef<HTMLDivElement>(null);
  const clickActionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [glossaryPopover, setGlossaryPopover] = useState<{
    entry: GlossaryEntry;
    x: number;
    y: number;
    above: boolean;
  } | null>(null);

  // Clamp the popup horizontally so it never overflows the viewport edges.
  // useLayoutEffect runs after DOM mutation but before paint, so the user never
  // sees the pre-clamp position. We replace the translateX(-50%) centering with a
  // direct pixel value and keep only the vertical translateY for the above/below flip.
  useLayoutEffect(() => {
    const el = popupRef.current;
    if (!el || !selection) return;
    const popupWidth = el.offsetWidth;
    const MARGIN = 8;
    const desiredLeft = selection.x - popupWidth / 2;
    const left = Math.max(MARGIN, Math.min(window.innerWidth - popupWidth - MARGIN, desiredLeft));
    el.style.left = `${left}px`;
    el.style.transform = selection.above ? "translateY(-100%)" : "none";
  }, [selection]);

  useLayoutEffect(() => {
    const el = glossaryPopoverRef.current;
    if (!el || !glossaryPopover) return;
    const popoverWidth = el.offsetWidth;
    const MARGIN = 8;
    const desiredLeft = glossaryPopover.x - popoverWidth / 2;
    const left = Math.max(MARGIN, Math.min(window.innerWidth - popoverWidth - MARGIN, desiredLeft));
    el.style.left = `${left}px`;
    el.style.transform = glossaryPopover.above ? "translateY(-100%)" : "none";
  }, [glossaryPopover]);

  // ── handlers ──

  const handleStartEdit = useCallback(() => {
    setEditText(extractedText);
    setIsEditing(true);
  }, [extractedText]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditText("");
  }, []);

  const handleSaveEdit = useCallback(() => {
    const hasChanges = editText !== extractedText;
    const hasDerivedData = adaptedText || simplifiedText || highlightedWords.length > 0 || Object.keys(analyzedSentences).length > 0 || glossary.length > 0;
    
    if (hasChanges && hasDerivedData) {
      setShowClearConfirm(true);
    } else if (hasChanges) {
      setExtractedText(editText);
      setIsEditing(false);
      setEditText("");
    } else {
      setIsEditing(false);
      setEditText("");
    }
  }, [editText, extractedText, adaptedText, simplifiedText, highlightedWords, analyzedSentences, glossary, setExtractedText]);

  const confirmClearAndSave = useCallback(() => {
    setExtractedText(editText);
    clearDerivedData();
    setIsEditing(false);
    setEditText("");
    setShowClearConfirm(false);
  }, [editText, setExtractedText, clearDerivedData]);

  const handleSuggestVocabulary = useCallback(async () => {
    await suggestVocabulary(suggestCount);
  }, [suggestVocabulary, suggestCount]);

  const handleSelectionChange = useCallback(() => {
    const selectionObj = window.getSelection();
    const selectedText = selectionObj?.toString().trim();

    if (
      !selectedText ||
      selectedText.length === 0 ||
      selectedText.length > 4096
    ) {
      setSelection(null);
      return;
    }

    if (selectionObj && selectionObj.rangeCount > 0) {
      const range = selectionObj.getRangeAt(0);
      const container = containerRef.current;
      const adaptedContainer = adaptedContainerRef.current;
      const simplifiedContainer = simplifiedContainerRef.current;

      if (container && container.contains(range.commonAncestorContainer)) {
        const rect = range.getBoundingClientRect();
        // Position the popup on the opposite side from the native selection bar:
        //   iOS  — bar appears below in the upper half of the viewport and above
        //           in the lower half, so we mirror that (above / below).
        //   Android — bar is almost always above the selection, so we always
        //             show below to avoid overlap.
        //   Desktop — no native bar; always show below.
        const isIOS =
          /iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        const showAbove = isIOS && rect.top < window.innerHeight / 2;
        setSelection({
          text: selectedText,
          x: rect.left + rect.width / 2,
          y: showAbove ? rect.top - 8 : rect.bottom + 8,
          above: showAbove,
        });
        setTutorChatSelectedText(selectedText);
      } else if (adaptedContainer && adaptedContainer.contains(range.commonAncestorContainer)) {
        setTutorChatSelectedText(selectedText);
      } else if (simplifiedContainer && simplifiedContainer.contains(range.commonAncestorContainer)) {
        setTutorChatSelectedText(selectedText);
      } else {
        setSelection(null);
      }
    }
  }, [setTutorChatSelectedText]);

  const handleAddWord = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      e?.preventDefault();
      e?.stopPropagation();

      const selectionObj = window.getSelection();
      const selectedText = selectionObj?.toString().trim() || selection?.text;

      if (selectedText) {
        addHighlightedWord(selectedText);
        setSelection(null);
        selectionObj?.removeAllRanges();
      }
    },
    [selection, addHighlightedWord]
  );

  const handleDownloadWord = useCallback(async () => {
    // ── Shared style constants ───────────────────────────────────────────────
    const HEADING1_SPACING = { before: 240, after: 120 };
    const PROSE_SPACING    = { before: 0,   after: 80  };
    // Header row shading: steel-blue background.
    // Use ShadingType.CLEAR so fill is applied as a plain solid background with
    // no foreground pattern overlay (color:"auto" = no pattern color).
    const HEADER_SHADING = {
      type: ShadingType.CLEAR,
      fill: "2E74B5",
      color: "auto",
    } as const;
    // Alternating row shading: light blue tint.
    const ALT_ROW_SHADING = {
      type: ShadingType.CLEAR,
      fill: "EAF2FB",
      color: "auto",
    } as const;
    // Thin border used on table cells
    const THIN_BORDER = { style: BorderStyle.SINGLE, size: 4, color: "C0C0C0" } as const;
    const CELL_BORDERS = {
      top:    THIN_BORDER,
      bottom: THIN_BORDER,
      left:   THIN_BORDER,
      right:  THIN_BORDER,
    };

    /** Wraps a section heading (H1) with generous before/after spacing. */
    const sectionHeading = (text: string) =>
      new Paragraph({
        text,
        heading: HeadingLevel.HEADING_1,
        spacing: HEADING1_SPACING,
        pageBreakBefore: false,
      });

    /** Plain text lines for Adapted / Simplified text sections. */
    const plainLines = (raw: string) =>
      raw.split(/\n/).map(
        (line) =>
          new Paragraph({
            children: [new TextRun({ text: line })],
            spacing: PROSE_SPACING,
          })
      );

    try {
      const children: (Paragraph | Table)[] = [];

      // ── Title & subtitle ─────────────────────────────────────────────────
      // Use stored docTitle (generated during extraction) with fallback to first line
      const docTitle = storedDocTitle || (extractedText.split(/\n/).find((l) => l.trim()) ?? t("reading.adaptedText.originalTab"));
      const generatedAt = formatDateTime(new Date());
      children.push(
        new Paragraph({
          text: docTitle.trim(),
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        })
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Generated by Mr.\uD83C\uDD96 ProReader on ${generatedAt}`,
              italics: true,
              color: "595959",
            }),
          ],
          alignment: AlignmentType.CENTER,
          style: "Subtitle",
          spacing: { after: 320 },
        })
      );

      // ── Section 1: Original Text ─────────────────────────────────────────
      children.push(sectionHeading(t("reading.adaptedText.originalTab")));
      children.push(...createDocxWithHighlights(extractedText, highlightedWords, analyzedSentences));

      // ── Section 2: Vocabulary ───────────────────────────────────
      if (includeGlossary && glossary.length > 0) {
        children.push(sectionHeading(t("reading.glossary.title")));

        const colHeaders = [
          t("reading.glossary.word"),
          t("reading.glossary.syllabification"),
          t("reading.glossary.partOfSpeech"),
          t("reading.glossary.englishDefinition"),
          t("reading.glossary.chineseDefinition"),
          t("reading.glossary.example"),
        ];

        const headerRow = new TableRow({
          tableHeader: true,
          children: colHeaders.map(
            (header) =>
              new TableCell({
                shading: HEADER_SHADING,
                borders: CELL_BORDERS,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({ text: header, bold: true, color: "FFFFFF" }),
                    ],
                    spacing: { before: 60, after: 60 },
                  }),
                ],
                width: { size: 100 / 6, type: WidthType.PERCENTAGE },
              })
          ),
        });

        const dataRows = glossary.map((entry, rowIdx) => {
          const isAlt = rowIdx % 2 === 1;
          return new TableRow({
            children: [
              entry.word,
              entry.syllabification || "",
              entry.partOfSpeech || "",
              entry.englishDefinition,
              entry.chineseDefinition,
              entry.example || "",
            ].map(
              (cellText) =>
                new TableCell({
                  ...(isAlt ? { shading: ALT_ROW_SHADING } : {}),
                  borders: CELL_BORDERS,
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: cellText })],
                      spacing: { before: 60, after: 60 },
                    }),
                  ],
                  width: { size: 100 / 6, type: WidthType.PERCENTAGE },
                })
            ),
          });
        });

        children.push(
          new Table({
            rows: [headerRow, ...dataRows],
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
        );
      }

      // ── Section 3: Sentence Analysis ─────────────────────────────────────
      if (includeSentenceAnalysis && Object.keys(analyzedSentences).length > 0) {
        children.push(sectionHeading(t("reading.extractedText.analysisTitle")));

        const entries = Object.values(analyzedSentences);
        entries.forEach((entry, idx) => {
          // Sentence as a styled heading-3 paragraph with a bottom rule,
          // prefixed with a sequential number for clarity.
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${idx + 1}. `, bold: true, size: 24, color: "2E74B5" }),
                new TextRun({ text: entry.sentence, bold: true, size: 24 }),
              ],
              heading: HeadingLevel.HEADING_3,
              spacing: { before: idx === 0 ? 0 : 240, after: 100 },
              border: {
                bottom: { style: BorderStyle.SINGLE, size: 6, color: "2E74B5" },
              },
            })
          );
          // Rich markdown content. Strip the leading bold-sentence line that
          // duplicates the numbered heading above (the AI prompt mandates the
          // analysis begin with "**<sentence>**").
          children.push(...parseAnalysisMarkdown(stripLeadingSentenceLine(entry.analysis, entry.sentence)));
        });
      }

      // ── Section 4: Adapted Text ──────────────────────────────────────────
      if (adaptedText) {
        children.push(sectionHeading(t("reading.adaptedText.adaptedTab")));
        children.push(...plainLines(adaptedText));
      }

      // ── Section 5: Simplified Text ───────────────────────────────────────
      if (simplifiedText) {
        children.push(sectionHeading(t("reading.adaptedText.simplifiedTab")));
        children.push(...plainLines(simplifiedText));
      }

      // ── Assemble document ────────────────────────────────────────────────
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top:    convertInchesToTwip(1),
                  bottom: convertInchesToTwip(1),
                  left:   convertInchesToTwip(1.1),
                  right:  convertInchesToTwip(1.1),
                },
                size: { orientation: PageOrientation.PORTRAIT },
              },
            },
            children,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const safeFileName = docTitle
        .replace(/[\\/:*?"<>|]/g, "")   // strip filesystem-illegal chars
        .replace(/\s+/g, " ")            // collapse whitespace
        .trim()
        .slice(0, 80);                   // cap length
      saveAs(blob, `${safeFileName}.docx`);
    } catch (error) {
      console.error("Failed to generate Word document:", error);
    }
  }, [storedDocTitle, extractedText, highlightedWords, analyzedSentences, adaptedText, simplifiedText, includeGlossary, glossary, includeSentenceAnalysis, t]);

  const handleReadAloud = useCallback(
    async (e?: React.MouseEvent | React.TouchEvent) => {
      e?.preventDefault();
      e?.stopPropagation();

      const selectionObj = window.getSelection();
      const selectedText = selectionObj?.toString().trim() || selection?.text;

      if (!selectedText) return;

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      setIsTTSLoading(true);

      try {
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };

        let url: string;
        if (mode === "local") {
          url = `${completePath(openaicompatibleApiProxy, "/v1")}/audio/speech`;
          if (openaicompatibleApiKey) {
            headers["Authorization"] = `Bearer ${openaicompatibleApiKey}`;
          }
        } else if (mode === "subscription") {
          url = "/api/ai/subscription/v1/audio/speech";
        } else {
          url = "/api/ai/openaicompatible/v1/audio/speech";
          if (accessPassword) {
            headers["Authorization"] = `Bearer ${generateSignature(
              accessPassword,
              Date.now()
            )}`;
          }
        }

        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: "tts-1",
            input: selectedText,
            voice: ttsVoice,
            response_format: "mp3",
            speed: ttsPlaybackRate,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          let errorMsg = `TTS request failed (${response.status})`;
          try {
            const parsed = JSON.parse(errText);
            if (parsed.error?.status && parsed.error?.message) {
              errorMsg = `[${parsed.error.status}]: ${parsed.error.message}`;
            }
          } catch {}
          toast.error(errorMsg);
          return;
        }

        const audioBuffer = await response.arrayBuffer();
        const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
        const audioUrl = URL.createObjectURL(audioBlob);

        await new Promise<void>((resolve, reject) => {
          const audio = new Audio();
          audioRef.current = audio;

          audio.oncanplay = () => {
            audio.play().then(resolve).catch(reject);
          };

          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            audioRef.current = null;
          };

          audio.onerror = (e) => {
            URL.revokeObjectURL(audioUrl);
            audioRef.current = null;
            reject(new Error(`Audio element error: ${JSON.stringify(e)}`));
          };

          audio.src = audioUrl;
          audio.load();
        });

        setSelection(null);
        selectionObj?.removeAllRanges();
      } catch (error) {
        toast.error(parseError(error));
      } finally {
        setIsTTSLoading(false);
      }
    },
    [
      selection,
      ttsVoice,
      ttsPlaybackRate,
      mode,
      openaicompatibleApiKey,
      accessPassword,
      openaicompatibleApiProxy,
    ]
  );

  const handleAnalyzeSentence = useCallback(
    async (e?: React.MouseEvent | React.TouchEvent) => {
      e?.preventDefault();
      e?.stopPropagation();

      const selectionObj = window.getSelection();
      const sentence = selectionObj?.toString().trim() || selection?.text;

      if (!sentence || sentence.length < 5) return;

      const cached = getSentenceAnalysis(sentence);
      if (cached) {
        setActiveSentence(sentence);
        setSelection(null);
        selectionObj?.removeAllRanges();
        return;
      }

      setGenerating("sentence-analysis", true);
      const sessionId = useReadingStore.getState().id;
      const ac = getAbortController("sentence-analysis");

      try {
        const context = getContextAround(extractedText, sentence, 150);
        const provider = await createModelProvider(sentenceAnalysisModel);

        const result = await generateText({
          model: provider,
          prompt: analyzeSentencePrompt(studentAge, sentence, context),
          abortSignal: ac.signal,
        });

        if (useReadingStore.getState().id !== sessionId || ac.signal.aborted) {
          toast.warning(i18next.t("reading.generationCancelled"));
          return;
        }

        setSentenceAnalysis(sentence, sanitizeSentenceAnalysis(result.text, sentence));
        setActiveSentence(sentence);
        setSelection(null);
        selectionObj?.removeAllRanges();
        // Log for achievements
        const { id: sid } = useReadingStore.getState();
        logActivity("sentence_analyze", { sessionId: sid || undefined });
      } catch (error) {
        if (useReadingStore.getState().id !== sessionId || ac.signal.aborted) {
          toast.warning(i18next.t("reading.generationCancelled"));
          return;
        }
        toast.error(parseError(error));
      } finally {
        if (useReadingStore.getState().id === sessionId) {
          setGenerating("sentence-analysis", false);
        }
        removeAbortController("sentence-analysis");
      }
    },
    [
      selection,
      extractedText,
      studentAge,
      sentenceAnalysisModel,
      createModelProvider,
      setGenerating,
      setSentenceAnalysis,
      getSentenceAnalysis,
    ]
  );

  // ── Deferred single-click actions (desktop double-click selection) ──────
  // A single click on the original text either jumps read-along to that
  // sentence or opens the sentence-analysis dialog. Both steal focus and
  // scroll the viewport, which would break the native double-click word
  // selection. On desktop the action is therefore deferred briefly; the
  // second click of a double-click (event.detail >= 2) cancels it. Touch
  // devices keep the immediate behavior.
  const clearPendingClickAction = useCallback(() => {
    if (clickActionTimerRef.current) {
      clearTimeout(clickActionTimerRef.current);
      clickActionTimerRef.current = null;
    }
  }, []);

  const runClickAction = useCallback(
    (action: () => void) => {
      if (isTouchDeviceRef.current) {
        action();
        return;
      }
      clearPendingClickAction();
      clickActionTimerRef.current = setTimeout(() => {
        clickActionTimerRef.current = null;
        action();
      }, CLICK_ACTION_DELAY_MS);
    },
    [clearPendingClickAction]
  );

  const handleMouseDown = useCallback((e: MouseEvent | TouchEvent) => {
    // Cancel on mousedown of the second click — earlier than the click
    // event itself, so slower double-clicks still cancel in time.
    if (!isTouchDeviceRef.current && (e as MouseEvent).detail >= 2) {
      clearPendingClickAction();
    }
    const target = e.target as HTMLElement;
    if (
      !target.closest(".selection-popup") &&
      !target.closest("[role='dialog']") &&
      !target.closest(".glossary-popover") &&
      !target.closest("[data-glossary-word]")
    ) {
      setSelection(null);
      setGlossaryPopover(null);
    }
  }, [clearPendingClickAction]);

  // ── effects ──

  useEffect(() => {
    isTouchDeviceRef.current =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);

  const glossaryMap = useMemo(() => {
    const map = new Map<string, GlossaryEntry>();
    for (const entry of glossary) {
      map.set(entry.word.toLowerCase(), entry);
    }
    return map;
  }, [glossary]);

  const highlightedText = useMemo(() => {
    const { html, sentenceList } = highlightTextAndSentences(
      extractedText,
      highlightedWords,
      analyzedSentences,
      glossaryMap
    );
    sentenceListRef.current = sentenceList;
    return html;
  }, [extractedText, highlightedWords, analyzedSentences, glossaryMap]);

  // ── Read-along (bimodal reading-while-listening) ──────────────────────────
  const readAlongSentences = useMemo(
    () => splitSentences(extractedText),
    [extractedText],
  );

  const startReadAlong = useCallback(
    async (startIndex: number) => {
      if (readAlongSentences.length === 0) return;
      // The click is the user gesture that unlocks the AudioContext (Lesson 27).
      await unlockAudio();
      if (!isAudioUnlocked()) {
        setReadAlong(null, false);
        toast.error(t("reading.readAlong.blocked"));
        return;
      }
      setReadAlong(startIndex, true);
      void readAlong({
        sentences: readAlongSentences,
        startIndex,
        voice: ttsVoice,
        speed: ttsPlaybackRate,
        mode,
        openaicompatibleApiKey,
        openaicompatibleApiProxy,
        accessPassword,
        audioRef,
        onSentenceStart: (i) => setReadAlong(i, true),
        onSentenceEnd: (i) => {
          void i;
        },
        onComplete: () => setReadAlong(null, false),
        onBlocked: () => {
          setReadAlong(null, false);
          toast.error(t("reading.readAlong.blocked"));
        },
      });
    },
    [readAlongSentences, ttsVoice, ttsPlaybackRate, mode, openaicompatibleApiKey, openaicompatibleApiProxy, accessPassword, setReadAlong, t],
  );

  const handleToggleReadAlong = useCallback(async () => {
    if (readAlongPlaying) {
      stopReadAlong();
      setReadAlong(null, false);
      return;
    }
    void startReadAlong(0);
  }, [readAlongPlaying, startReadAlong, setReadAlong]);

  // Click-to-jump: restart read-along from the clicked sentence index.
  // Works whether or not read-along is currently playing. The click event
  // serves as the user gesture for AudioContext unlock.
  const handleJumpReadAlong = useCallback(
    (index: number) => {
      if (readAlongSentences.length === 0) return;
      if (index < 0 || index >= readAlongSentences.length) return;
      stopReadAlong();
      void startReadAlong(index);
    },
    [readAlongSentences, startReadAlong],
  );

  // Read-along jumps go through the deferred click action, but the Web Audio
  // unlock must START inside the gesture handler (Safari rejects resume()
  // from a timer), so unlock here and defer only the rest.
  const scheduleJump = useCallback(
    (index: number) => {
      void unlockAudio();
      runClickAction(() => handleJumpReadAlong(index));
    },
    [runClickAction, handleJumpReadAlong]
  );

  // Stop read-along when leaving the original tab. Also drop any pending
  // deferred click action — it must not fire read-along on a hidden tab.
  useEffect(() => {
    if (activeTab !== "original") {
      clearPendingClickAction();
      if (readAlongPlaying) {
        stopReadAlong();
        setReadAlong(null, false);
      }
    }
  }, [activeTab, readAlongPlaying, setReadAlong, clearPendingClickAction]);

  // Stop read-along on unmount.
  useEffect(() => () => {
    clearPendingClickAction();
    stopReadAlong();
    stopSpeaking();
  }, [clearPendingClickAction]);

  // Esc stops read-along (desktop). Skipped while any Radix dialog is open —
  // Esc's primary job there is closing the dialog (handled by Radix itself),
  // and stopping playback simultaneously would be surprising.
  useEffect(() => {
    if (!readAlongPlaying) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      stopReadAlong();
      setReadAlong(null, false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [readAlongPlaying, setReadAlong]);

  // Highlight + scroll to the active sentence in the DOM.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.querySelectorAll(".ra-sentence.ra-active").forEach((el) => {
      el.classList.remove("ra-active");
    });
    if (readAlongIndex === null || !readAlongPlaying) return;
    const el = container.querySelector<HTMLElement>(`[data-ra-idx="${readAlongIndex}"]`);
    if (el) {
      el.classList.add("ra-active");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [readAlongIndex, readAlongPlaying, highlightedText]);

  const analyzedSentencesKeys = useMemo(
    () => Object.keys(analyzedSentences),
    [analyzedSentences]
  );

  useEffect(() => {
    // selectionchange fires as soon as the browser commits a text selection —
    // including during Android long-press (before touchend) and handle drags.
    // A short debounce prevents excessive calls during rapid handle dragging.
    let selectionTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedSelectionChange = () => {
      if (selectionTimer) clearTimeout(selectionTimer);
      selectionTimer = setTimeout(handleSelectionChange, 150);
    };

    document.addEventListener("selectionchange", debouncedSelectionChange);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("touchstart", handleMouseDown, { passive: true });

    return () => {
      document.removeEventListener("selectionchange", debouncedSelectionChange);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("touchstart", handleMouseDown);
      if (selectionTimer) clearTimeout(selectionTimer);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [handleSelectionChange, handleMouseDown]);

  const handleSentenceClick = useCallback((e: Event) => {
    const mouseEvent = e as MouseEvent;
    const target = mouseEvent.target as HTMLElement;

    // Desktop: the second click of a double-click cancels the pending
    // single-click action so the native word selection completes.
    if (!isTouchDeviceRef.current && mouseEvent.detail >= 2) {
      clearPendingClickAction();
      return;
    }

    if (target.closest("[data-glossary-word]")) return;

    const analyzedSpan = target.closest(
      ".analyzed-sentence"
    ) as HTMLElement | null;

    if (analyzedSpan) {
      e.stopPropagation();
      e.preventDefault();
      // When read-along is active, jump to this sentence instead of opening
      // the analysis dialog (the dialog modal would cover the highlight).
      if (readAlongPlaying) {
        const raSpan = analyzedSpan.closest(".ra-sentence") as HTMLElement | null;
        if (raSpan) {
          const idxAttr = raSpan.getAttribute("data-ra-idx");
          if (idxAttr !== null) {
            scheduleJump(Number(idxAttr));
          }
        }
        return;
      }
      const sentence = analyzedSpan.textContent || "";
      if (sentence.trim()) {
        const trimmed = sentence.trim();
        runClickAction(() => setActiveSentence(trimmed));
      }
      return;
    }

    // Read-along jump: clicking a sentence starts/jumps read-along to it.
    // Skip when the user is actively selecting text (drag-selection).
    const raSpan = target.closest(".ra-sentence") as HTMLElement | null;
    if (raSpan) {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) return;
      const idxAttr = raSpan.getAttribute("data-ra-idx");
      if (idxAttr !== null) {
        e.stopPropagation();
        e.preventDefault();
        scheduleJump(Number(idxAttr));
      }
    }
  }, [scheduleJump, runClickAction, clearPendingClickAction, readAlongPlaying]);

  const handleGlossaryWordClick = useCallback((e: Event) => {
    const target = (e.target as HTMLElement).closest(
      "[data-glossary-word]"
    ) as HTMLElement | null;

    if (target) {
      e.stopPropagation();
      e.preventDefault();
      const word = target.getAttribute("data-glossary-word");
      if (word) {
        const entry = glossaryMap.get(word.toLowerCase());
        if (entry) {
          const rect = target.getBoundingClientRect();
          const isIOS =
            /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
          const showAbove = isIOS && rect.top < window.innerHeight / 2;
          setGlossaryPopover({
            entry,
            x: rect.left + rect.width / 2,
            y: showAbove ? rect.top - 8 : rect.bottom + 8,
            above: showAbove,
          });
          setSelection(null);
          window.getSelection()?.removeAllRanges();
        }
      }
    }
  }, [glossaryMap]);

  const handleSpeakGlossaryWord = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const word = glossaryPopover?.entry.word;
      if (!word) return;

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      setIsTTSLoading(true);
      try {
        const headers: HeadersInit = { "Content-Type": "application/json" };
        let url: string;
        if (mode === "local") {
          url = `${completePath(openaicompatibleApiProxy, "/v1")}/audio/speech`;
          if (openaicompatibleApiKey) headers["Authorization"] = `Bearer ${openaicompatibleApiKey}`;
        } else if (mode === "subscription") {
          url = "/api/ai/subscription/v1/audio/speech";
        } else {
          url = "/api/ai/openaicompatible/v1/audio/speech";
          if (accessPassword) headers["Authorization"] = `Bearer ${generateSignature(accessPassword, Date.now())}`;
        }
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ model: "tts-1", input: word, voice: ttsVoice, response_format: "mp3", speed: ttsPlaybackRate }),
        });
        if (!response.ok) {
          const errText = await response.text();
          let errorMsg = `TTS failed (${response.status})`;
          try {
            const parsed = JSON.parse(errText);
            if (parsed.error?.status && parsed.error?.message) {
              errorMsg = `[${parsed.error.status}]: ${parsed.error.message}`;
            }
          } catch {}
          toast.error(errorMsg);
          return;
        }
        const audioBuffer = await response.arrayBuffer();
        const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
        const audioUrl = URL.createObjectURL(audioBlob);
        await new Promise<void>((resolve, reject) => {
          const audio = new Audio();
          audioRef.current = audio;
          audio.oncanplay = () => audio.play().then(resolve).catch(reject);
          audio.onended = () => { URL.revokeObjectURL(audioUrl); audioRef.current = null; };
          audio.onerror = () => { URL.revokeObjectURL(audioUrl); audioRef.current = null; reject(new Error("Audio error")); };
          audio.src = audioUrl;
          audio.load();
        });
      } catch (error) {
        toast.error(parseError(error));
      } finally {
        setIsTTSLoading(false);
      }
    },
    [glossaryPopover, ttsVoice, ttsPlaybackRate, mode, openaicompatibleApiKey, accessPassword, openaicompatibleApiProxy]
  );

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (containerRef.current) {
        containerRef.current.removeEventListener(
          "click",
          handleSentenceClick,
          true
        );
        containerRef.current.removeEventListener(
          "click",
          handleGlossaryWordClick,
          true
        );
      }
      containerRef.current = node;
      if (node) {
        node.addEventListener("click", handleSentenceClick, true);
        node.addEventListener("click", handleGlossaryWordClick, true);
      }
    },
    [handleSentenceClick, handleGlossaryWordClick]
  );

  const activeAnalysis = activeSentence
    ? getSentenceAnalysis(activeSentence)
    : null;

  if (!extractedText) {
    return null;
  }

  return (
    <section className="p-4 border rounded-md mt-4">
      <div className="flex flex-wrap md:flex-nowrap items-center justify-between border-b pb-4 mb-4 gap-2">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          {t("reading.adaptedText.title")}
          <GuideDialog
            titleKey="reading.adaptedText.help.title"
            introKey="reading.adaptedText.help.intro"
            itemsBaseKey="reading.adaptedText.help.items"
            items={[
              { key: "versions", icon: BookOpen, bgClass: "bg-primary/10", iconClass: "text-primary" },
              { key: "highlight", icon: Plus, bgClass: "bg-yellow-500/10", iconClass: "text-yellow-500" },
              { key: "analysis", icon: Brain, bgClass: "bg-blue-500/10", iconClass: "text-blue-500" },
              { key: "tts", icon: Volume2, bgClass: "bg-green-500/10", iconClass: "text-green-500" },
              { key: "difficulty", icon: BarChart3, bgClass: "bg-cyan-500/10", iconClass: "text-cyan-500" },
            ]}
            stepsTitleKey="reading.adaptedText.help.stepsTitle"
            stepsKeys={[
              "reading.adaptedText.help.steps.s1",
              "reading.adaptedText.help.steps.s2",
              "reading.adaptedText.help.steps.s3",
              "reading.adaptedText.help.steps.s4",
              "reading.adaptedText.help.steps.s5",
            ]}
            tipTitleKey="reading.adaptedText.help.tipTitle"
            tipContentKey="reading.adaptedText.help.tipContent"
          />
        </h3>
        <div className="flex flex-wrap items-center justify-end gap-2 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">{t("reading.extractedText.downloadWord")}</span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={includeGlossary}
                onCheckedChange={setIncludeGlossary}
                disabled={glossary.length === 0}
                onSelect={(e) => e.preventDefault()}
              >
                {t("reading.extractedText.includeGlossary")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={includeSentenceAnalysis}
                onCheckedChange={setIncludeSentenceAnalysis}
                disabled={Object.keys(analyzedSentences).length === 0}
                onSelect={(e) => e.preventDefault()}
              >
                {t("reading.extractedText.includeSentenceAnalysis")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDownloadWord}>
                <FileDown className="h-4 w-4 mr-1" />
                {t("reading.extractedText.exportDownload")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <TextDifficultyAnalyzer />

      <Tabs ref={tabsRef} value={activeTab} onValueChange={setActiveTab} className="scroll-mt-20">
        <TabsList className="w-full">
          <TabsTrigger value="original" className="flex-1 gap-1">
            <FileText className="h-3.5 w-3.5" />
            {t("reading.adaptedText.originalTab")}
          </TabsTrigger>
          <TabsTrigger
            value="adapted"
            className="flex-1 gap-1"
            disabled={!adaptedText && !isAdapting}
          >
            <FileEdit className="h-3.5 w-3.5" />
            <span>{t("reading.adaptedText.adaptedTab")}</span>
            {isAdapting && (
              <LoaderCircle className="ml-1.5 h-3 w-3 animate-spin" />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="simplified"
            className="flex-1 gap-1"
            disabled={!adaptedText && !isSimplifying}
          >
            <FileMinus className="h-3.5 w-3.5" />
            <span>{t("reading.adaptedText.simplifiedTab")}</span>
            {isSimplifying && (
              <LoaderCircle className="ml-1.5 h-3 w-3 animate-spin" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Original tab ─────────────────────────────────────────────── */}
        <TabsContent value="original" className="mt-4">
          {/* Edit controls */}
          <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
            {!isEditing ? (
              <>
                {readAlongPlaying && (
                  <span className="text-xs text-muted-foreground mr-auto hidden sm:inline">
                    {t("reading.readAlong.jumpHint")}
                  </span>
                )}
                <Button
                  variant={readAlongPlaying ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleReadAlong}
                  disabled={!extractedText || readAlongSentences.length === 0}
                  className={readAlongPlaying ? "ra-pulse" : ""}
                >
                  {readAlongPlaying ? (
                    <>
                      <Square className="h-4 w-4 mr-1" />
                      {t("reading.readAlong.stop")}
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4 mr-1" />
                      {t("reading.readAlong.play")}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartEdit}
                  disabled={!extractedText}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  {t("reading.adaptedText.edit")}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                >
                  <X className="h-4 w-4 mr-1" />
                  {t("reading.adaptedText.cancel")}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                >
                  <Check className="h-4 w-4 mr-1" />
                  {t("reading.adaptedText.save")}
                </Button>
              </>
            )}
          </div>

          {isEditing ? (
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
              placeholder={t("reading.adaptedText.editPlaceholder")}
            />
          ) : (
            <>
              {/* Tip banner */}
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-sm text-green-800 dark:text-green-200">
                  💡{" "}
                  <Trans
                    i18nKey="reading.extractedText.highlightTip"
                    components={[
                      <Brain key="brain" className="inline h-3.5 w-3.5 align-text-bottom" />,
                      <Volume2 key="volume" className="inline h-3.5 w-3.5 align-text-bottom" />,
                      <Plus key="plus" className="inline h-3.5 w-3.5 align-text-bottom" />,
                    ]}
                  />
                </p>
              </div>

              {/* AI vocabulary suggestion */}
              <div className="mb-4 flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-md">
                <Wand2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground mr-1">
                  {t("reading.adaptedText.suggestLabel")}
                </span>
                <Select
                  value={String(suggestCount)}
                  onValueChange={(v) => setSuggestCount(Number(v))}
                  disabled={isSuggesting}
                >
                  <SelectTrigger className="w-[80px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 30, 40, 50].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleSuggestVocabulary}
                  disabled={isSuggesting}
                >
                  {isSuggesting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  {isSuggesting
                    ? t("reading.adaptedText.suggesting")
                    : t("reading.adaptedText.suggestButton")}
                </Button>
              </div>

              {/* Vocabulary list chips */}
              {highlightedWords.length > 0 && (
                <div className="mb-4 p-3 bg-muted/50 rounded-md">
                  <button
                    type="button"
                    onClick={() => setVocabListOpen((v) => !v)}
                    className="flex w-full items-center justify-between text-sm font-medium mb-2"
                  >
                    <span>
                      {t("reading.extractedText.highlightedWords")} (
                      {highlightedWords.length}):
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        vocabListOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {vocabListOpen && (
                    <div className="flex flex-wrap gap-2">
                      {highlightedWords.map((word) => (
                        <span
                          key={word}
                          className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-sm cursor-pointer hover:opacity-75"
                          onClick={() => removeHighlightedWord(word)}
                          title={t("reading.extractedText.clickToRemove")}
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Analyzed sentences chips */}
              {analyzedSentencesKeys.length > 0 && (
                <div className="mb-4 p-3 bg-muted/50 rounded-md">
                  <button
                    type="button"
                    onClick={() => setAnalyzedSentencesOpen((v) => !v)}
                    className="flex w-full items-center justify-between text-sm font-medium mb-2"
                  >
                    <span>
                      {t("reading.extractedText.analyzedSentences")} (
                      {analyzedSentencesKeys.length}):
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        analyzedSentencesOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {analyzedSentencesOpen && (
                    <div className="flex flex-wrap gap-2">
                      {analyzedSentencesKeys.map((key) => {
                        const item = analyzedSentences[key];
                        const displayText =
                          item.sentence.length > 40
                            ? item.sentence.slice(0, 40) + "..."
                            : item.sentence;
                        return (
                          <span
                            key={key}
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm cursor-pointer hover:opacity-75 border-b-2 border-blue-500 dark:border-blue-400"
                            onClick={() => {
                              if (activeSentence === item.sentence) {
                                setActiveSentence(null);
                              }
                              removeSentenceAnalysis(item.sentence);
                            }}
                            title={t(
                              "reading.extractedText.clickToRemoveAnalysis"
                            )}
                          >
                            {displayText}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Interactive text body */}
              <div
                className="prose prose-slate dark:prose-invert max-w-full"
                ref={setContainerRef}
              >
                <ParagraphWithNav
                  text={extractedText}
                  currentTab="original"
                  onNavigate={handleNavigateToParagraph}
                  paragraphCounts={paragraphCounts}
                  hasAdaptedText={!!adaptedText}
                  hasSimplifiedText={!!simplifiedText}
                  highlightHtml={highlightedText}
                />
              </div>
            </>
          )}

          {/* Adapt button (shown when adapted text not yet generated) */}
          {!adaptedText && (
            <div className="mt-4 pt-4 border-t flex justify-center">
              <Button
                onClick={() => {
                  setActiveTab("adapted");
                  adaptText();
                  scrollToTabTop();
                }}
                disabled={isAdapting}
                size="sm"
              >
                {isAdapting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span>{t("reading.adaptedText.adapting")}</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="h-4 w-4" />
                    <span>
                      {t("reading.adaptedText.adapt")} ({studentAge})
                    </span>
                  </>
                )}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ── Adapted tab ──────────────────────────────────────────────── */}
        <TabsContent value="adapted" className="mt-4">
          {adaptedText ? (
            <>
              <div className="mb-4 flex justify-end">
                <Button
                  onClick={() => adaptText()}
                  disabled={isAdapting}
                  size="sm"
                  variant="secondary"
                >
                  {isAdapting ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      <span>{t("reading.adaptedText.regenerating")}</span>
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4" />
                      <span>
                        {t("reading.adaptedText.regenerate")} ({studentAge} {t("reading.studentInfo.yearsOld")})
                      </span>
                    </>
                  )}
                </Button>
              </div>
              <div
                ref={adaptedContainerRef}
                className="prose prose-slate dark:prose-invert max-w-full"
              >
                <ParagraphWithNav
                  text={adaptedText}
                  currentTab="adapted"
                  onNavigate={handleNavigateToParagraph}
                  paragraphCounts={paragraphCounts}
                  hasAdaptedText={!!adaptedText}
                  hasSimplifiedText={!!simplifiedText}
                />
              </div>

              {isAdapting ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span>{t("reading.adaptedText.adapting")}</span>
                </div>
              ) : (
                !simplifiedText && (
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      onClick={() => {
                        setActiveTab("simplified");
                        simplifyText();
                        scrollToTabTop();
                      }}
                      disabled={isSimplifying}
                      variant="secondary"
                      className="w-full"
                    >
                      {isSimplifying ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          <span>{t("reading.adaptedText.simplifying")}</span>
                        </>
                      ) : (
                        <>
                          <ArrowDown className="h-4 w-4" />
                          <span>{t("reading.adaptedText.simplifyFurther")}</span>
                        </>
                      )}
                    </Button>
                  </div>
                )
              )}
            </>
          ) : isAdapting ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-11/12" />
              <div className="h-4 bg-muted rounded w-4/5" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-3/4" />
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("reading.adaptedText.emptyTip")}</p>
            </div>
          )}
        </TabsContent>

        {/* ── Simplified tab ───────────────────────────────────────────── */}
        <TabsContent value="simplified" className="mt-4">
          {simplifiedText ? (
            <>
              <div
                ref={simplifiedContainerRef}
                className="prose prose-slate dark:prose-invert max-w-full"
              >
                <ParagraphWithNav
                  text={simplifiedText}
                  currentTab="simplified"
                  onNavigate={handleNavigateToParagraph}
                  paragraphCounts={paragraphCounts}
                  hasAdaptedText={!!adaptedText}
                  hasSimplifiedText={!!simplifiedText}
                />
              </div>
              {isSimplifying ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span>{t("reading.adaptedText.simplifying")}</span>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    onClick={() => simplifyText()}
                    disabled={isSimplifying}
                    variant="secondary"
                    className="w-full"
                  >
                    <ArrowDown className="h-4 w-4" />
                    <span>{t("reading.adaptedText.simplifyFurther")}</span>
                  </Button>
                </div>
              )}
            </>
          ) : isSimplifying ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-11/12" />
              <div className="h-4 bg-muted rounded w-4/5" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-3/4" />
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t("reading.adaptedText.simplifiedEmptyTip")}</p>
              <Button
                onClick={() => {
                  setActiveTab("simplified");
                  simplifyText();
                }}
                disabled={isSimplifying}
                variant="secondary"
                className="mt-4"
              >
                <ArrowDown className="h-4 w-4" />
                <span>{t("reading.adaptedText.generateSimplified")}</span>
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Selection popup ──────────────────────────────────────────────── */}
      {selection && (
        <div
          ref={popupRef}
          className="selection-popup fixed z-[9999] shadow-md flex gap-0.5 bg-background border rounded-md p-0.5"
          style={{
            left: selection.x,
            top: selection.y,
            transform: selection.above ? "translate(-50%, -100%)" : "translateX(-50%)",
          }}
        >
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAddWord}
            onTouchEnd={handleAddWord}
            className="rounded-r-none border-r"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">
              {t("reading.extractedText.addWord")}
            </span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAnalyzeSentence}
            onTouchEnd={handleAnalyzeSentence}
            disabled={isAnalysisLoading}
            className="border-r"
          >
            {isAnalysisLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {t("reading.extractedText.analyze")}
            </span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReadAloud}
            onTouchEnd={handleReadAloud}
            disabled={isTTSLoading}
            className="rounded-l-none"
          >
            {isTTSLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {t("reading.extractedText.readAloud")}
            </span>
          </Button>
        </div>
      )}

      {/* ── Glossary popover ──────────────────────────────────────────────── */}
      {glossaryPopover && (
        <div
          ref={glossaryPopoverRef}
          className="glossary-popover fixed z-[9998] w-[calc(100vw-1rem)] max-w-[320px] bg-background border rounded-lg shadow-lg p-3 animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            left: glossaryPopover.x,
            top: glossaryPopover.y,
            transform: glossaryPopover.above
              ? "translate(-50%, -100%)"
              : "translateX(-50%)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="min-w-0">
              <span className="text-base font-bold text-foreground">
                {glossaryPopover.entry.word}
              </span>
              {glossaryPopover.entry.syllabification && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {glossaryPopover.entry.syllabification}
                </span>
              )}
              <button
                type="button"
                className="ml-1 inline-flex items-center justify-center p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                onClick={handleSpeakGlossaryWord}
                disabled={isTTSLoading}
              >
                {isTTSLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground mr-5">
              {glossaryPopover.entry.partOfSpeech}
            </span>
          </div>
          <div className="text-lg font-semibold text-primary mb-1">
            {glossaryPopover.entry.chineseDefinition}
          </div>
          <div className="text-sm text-muted-foreground">
            {glossaryPopover.entry.englishDefinition}
          </div>
          {glossaryPopover.entry.example && (
            <div className="mt-2 pt-2 border-t text-xs text-muted-foreground italic">
              {glossaryPopover.entry.example}
            </div>
          )}
          <button
            type="button"
            className="absolute top-1.5 right-1.5 p-0.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={() => setGlossaryPopover(null)}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Sentence analysis dialog ─────────────────────────────────────── */}
      <Dialog
        open={!!activeSentence}
        onOpenChange={(open) => !open && setActiveSentence(null)}
      >
        <DialogContent
          className="dialog-safe-width max-h-[80vh] overflow-x-hidden overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="pr-6">
            <DialogTitle>
              {t("reading.extractedText.analysisTitle")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("reading.extractedText.analysisDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert w-full max-w-none overflow-x-hidden">
            {isAnalysisLoading && !activeAnalysis ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>{t("reading.extractedText.analyzing")}</span>
              </div>
            ) : activeAnalysis?.analysis ? (
              // MagicDown is lazy-loaded via next/dynamic with no Suspense
              // boundary of its own. Without a local <Suspense> here, the
              // very first time it's rendered in the session its pending
              // import bubbles up to the app's root Suspense boundary
              // (page.tsx), which blanks the *entire* page until the chunk
              // loads — collapsing document height to 0 and forcing
              // window.scrollY to 0, which looks like the page "scrolling to
              // the top". Scoping the fallback here keeps that loading state
              // local to the dialog.
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>{t("reading.extractedText.analyzing")}</span>
                  </div>
                }
              >
                <MagicDown
                  value={activeAnalysis.analysis}
                  onChange={() => {}}
                  hideTools
                />
              </Suspense>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Clear confirmation dialog ─────────────────────────────────────── */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("reading.adaptedText.editWarningTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("reading.adaptedText.editWarningDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              {t("reading.adaptedText.cancel")}
            </Button>
            <Button onClick={confirmClearAndSave}>
              {t("reading.adaptedText.confirmClear")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default AdaptedText;
