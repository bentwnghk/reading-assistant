"use client";
import dynamic from "next/dynamic";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  LoaderCircle,
  ArrowDown,
  Plus,
  Volume2,
  Loader2,
  Brain,
  FileDown,
  HelpCircle,
  Pencil,
  Check,
  X,
} from "lucide-react";
import TextDifficultyAnalyzer from "./TextDifficultyAnalyzer";
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
import { generateText } from "ai";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReadingStore } from "@/store/reading";
import { useSettingStore } from "@/store/setting";
import { useGlobalStore } from "@/store/global";
import { generateSignature } from "@/utils/signature";
import { completePath } from "@/utils/url";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import useModelProvider from "@/hooks/useAiProvider";
import { analyzeSentencePrompt } from "@/constants/readingPrompts";

const MagicDown = dynamic(() => import("@/components/MagicDown"));
import ParagraphWithNav from "./ParagraphWithNav";

// ─── helpers ────────────────────────────────────────────────────────────────

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
  analyzedSentences: Record<string, SentenceAnalysis>
): { html: string; sentenceList: string[] } {
  let result = text;
  const sentenceList: string[] = [];

  const analyzedKeys = Object.keys(analyzedSentences);
  if (analyzedKeys.length > 0) {
    const sortedSentences = analyzedKeys
      .map((key) => analyzedSentences[key].sentence)
      .filter((s) => s.length > 10)
      .sort((a, b) => b.length - a.length);

    for (const sentence of sortedSentences) {
      const sentenceIndex = sentenceList.length;
      sentenceList.push(sentence);
      const escaped = escapeRegExp(sentence);
      const pattern = new RegExp(`(${escaped})`, "g");
      result = result.replace(
        pattern,
        `<span class="analyzed-sentence border-b-2 border-blue-500 dark:border-blue-400 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950" data-idx="${sentenceIndex}">$1</span>`
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
          '<mark class="bg-yellow-200 dark:bg-yellow-400 px-0.5 rounded">$1</mark>'
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
  } = useReadingStore();

  const { setTutorChatSelectedText } = useGlobalStore();

  const {
    ttsVoice,
    mode,
    openaicompatibleApiKey,
    accessPassword,
    openaicompatibleApiProxy,
    sentenceAnalysisModel,
  } = useSettingStore();

  const { status, adaptText, simplifyText } = useReadingAssistant();
  const { createModelProvider } = useModelProvider();

// tab state
  const [activeTab, setActiveTab] = useState<string>("original");
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const isAdapting = status === "adapting";
  const isSimplifying = status === "simplifying";

  // ── interactive-text state ──
  const containerRef = useRef<HTMLDivElement | null>(null);
  const adaptedContainerRef = useRef<HTMLDivElement | null>(null);
  const simplifiedContainerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
  const [selection, setSelection] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [activeSentence, setActiveSentence] = useState<string | null>(null);
  const isTouchDeviceRef = useRef(false);
  const sentenceListRef = useRef<string[]>([]);

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
        setSelection({
          text: selectedText,
          x: rect.left + rect.width / 2,
          y: rect.bottom + 8,
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
      const generatedAt = new Date().toLocaleString(undefined, {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
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
          // Rich markdown content
          children.push(...parseAnalysisMarkdown(entry.analysis));
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
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(
            `TTS request failed (${response.status}): ${errText}`
          );
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
        console.error("TTS error:", error);
      } finally {
        setIsTTSLoading(false);
      }
    },
    [
      selection,
      ttsVoice,
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

      setIsAnalysisLoading(true);

      try {
        const context = getContextAround(extractedText, sentence, 150);
        const provider = await createModelProvider(sentenceAnalysisModel);

        const result = await generateText({
          model: provider,
          prompt: analyzeSentencePrompt(studentAge, sentence, context),
        });

        setSentenceAnalysis(sentence, result.text);
        setActiveSentence(sentence);
        setSelection(null);
        selectionObj?.removeAllRanges();
      } catch (error) {
        console.error("Analysis error:", error);
      } finally {
        setIsAnalysisLoading(false);
      }
    },
    [
      selection,
      extractedText,
      studentAge,
      sentenceAnalysisModel,
      createModelProvider,
      setSentenceAnalysis,
      getSentenceAnalysis,
    ]
  );

  const handleMouseDown = useCallback((e: MouseEvent | TouchEvent) => {
    const target = e.target as HTMLElement;
    if (
      !target.closest(".selection-popup") &&
      !target.closest("[role='dialog']")
    ) {
      setSelection(null);
    }
  }, []);

  // ── effects ──

  useEffect(() => {
    isTouchDeviceRef.current =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);

  const highlightedText = useMemo(() => {
    const { html, sentenceList } = highlightTextAndSentences(
      extractedText,
      highlightedWords,
      analyzedSentences
    );
    sentenceListRef.current = sentenceList;
    return html;
  }, [extractedText, highlightedWords, analyzedSentences]);

  const analyzedSentencesKeys = useMemo(
    () => Object.keys(analyzedSentences),
    [analyzedSentences]
  );

  useEffect(() => {
    document.addEventListener("mouseup", handleSelectionChange);
    document.addEventListener("touchend", handleSelectionChange);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("touchstart", handleMouseDown, { passive: true });

    return () => {
      document.removeEventListener("mouseup", handleSelectionChange);
      document.removeEventListener("touchend", handleSelectionChange);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("touchstart", handleMouseDown);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [handleSelectionChange, handleMouseDown]);

  const handleSentenceClick = useCallback((e: Event) => {
    const mouseEvent = e as MouseEvent;
    const target = mouseEvent.target as HTMLElement;
    const analyzedSpan = target.closest(
      ".analyzed-sentence"
    ) as HTMLElement | null;

    if (analyzedSpan) {
      e.stopPropagation();
      e.preventDefault();
      const idxAttr = analyzedSpan.getAttribute("data-idx");
      if (idxAttr !== null) {
        const idx = parseInt(idxAttr, 10);
        const sentence = sentenceListRef.current[idx];
        if (sentence) {
          setActiveSentence(sentence);
        }
      }
    }
  }, []);

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (containerRef.current) {
        containerRef.current.removeEventListener(
          "click",
          handleSentenceClick,
          true
        );
      }
      containerRef.current = node;
      if (node) {
        node.addEventListener("click", handleSentenceClick, true);
      }
    },
    [handleSentenceClick]
  );

  const activeAnalysis = activeSentence
    ? getSentenceAnalysis(activeSentence)
    : null;

  if (!extractedText) {
    return null;
  }

  return (
    <section className="p-4 border rounded-md mt-4">
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          {t("reading.adaptedText.title")}
          <Popover>
            <PopoverTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
            </PopoverTrigger>
            <PopoverContent className="w-[480px] max-h-[70vh] overflow-y-auto" align="start">
              <div className="space-y-4 text-sm">
                <h4 className="font-semibold text-base">{t("reading.adaptedText.help.title")}</h4>
                <div className="space-y-3">
                  <div>
                    <h5 className="font-medium text-foreground">{t("reading.adaptedText.help.tabs.title")}</h5>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-1">
                      <li>{t("reading.adaptedText.help.tabs.original")}</li>
                      <li>{t("reading.adaptedText.help.tabs.adapted")}</li>
                      <li>{t("reading.adaptedText.help.tabs.simplified")}</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-foreground">{t("reading.adaptedText.help.features.title")}</h5>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-1">
                      <li>{t("reading.adaptedText.help.features.edit")}</li>
                      <li>{t("reading.adaptedText.help.features.highlight")}</li>
                      <li>{t("reading.adaptedText.help.features.tts")}</li>
                      <li>{t("reading.adaptedText.help.features.sentenceAnalysis")}</li>
                      <li>{t("reading.adaptedText.help.features.paragraphNav")}</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-foreground">{t("reading.adaptedText.help.difficulty.title")}</h5>
                    <p className="text-muted-foreground mt-1">{t("reading.adaptedText.help.difficulty.desc")}</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-1">
                      <li>{t("reading.adaptedText.help.difficulty.metrics")}</li>
                      <li>{t("reading.adaptedText.help.difficulty.cefr")}</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-foreground">{t("reading.adaptedText.help.export.title")}</h5>
                    <p className="text-muted-foreground mt-1">{t("reading.adaptedText.help.export.desc")}</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-1">
                      <li>{t("reading.adaptedText.help.export.glossary")}</li>
                      <li>{t("reading.adaptedText.help.export.analysis")}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="include-glossary"
              checked={includeGlossary}
              onCheckedChange={setIncludeGlossary}
              disabled={glossary.length === 0}
            />
            <Label htmlFor="include-glossary" className="text-sm cursor-pointer">
              {t("reading.extractedText.includeGlossary")}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="include-sentence-analysis"
              checked={includeSentenceAnalysis}
              onCheckedChange={setIncludeSentenceAnalysis}
              disabled={Object.keys(analyzedSentences).length === 0}
            />
            <Label htmlFor="include-sentence-analysis" className="text-sm cursor-pointer">
              {t("reading.extractedText.includeSentenceAnalysis")}
            </Label>
          </div>
          <Button onClick={handleDownloadWord} variant="outline" size="sm">
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">{t("reading.extractedText.downloadWord")}</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="original" className="flex-1">
            {t("reading.adaptedText.originalTab")}
          </TabsTrigger>
          <TabsTrigger
            value="adapted"
            className="flex-1"
            disabled={!adaptedText && !isAdapting}
          >
            <span>{t("reading.adaptedText.adaptedTab")}</span>
            {isAdapting && (
              <LoaderCircle className="ml-1.5 h-3 w-3 animate-spin" />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="simplified"
            className="flex-1"
            disabled={!adaptedText && !isSimplifying}
          >
            <span>{t("reading.adaptedText.simplifiedTab")}</span>
            {isSimplifying && (
              <LoaderCircle className="ml-1.5 h-3 w-3 animate-spin" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Original tab ─────────────────────────────────────────────── */}
        <TabsContent value="original" className="mt-4">
          {/* Edit controls */}
          <div className="mb-4 flex justify-end gap-2">
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartEdit}
                disabled={!extractedText}
              >
                <Pencil className="h-4 w-4 mr-1" />
                {t("reading.adaptedText.edit")}
              </Button>
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
                  💡 {t("reading.extractedText.highlightTip")}
                </p>
              </div>

              {/* Vocabulary list chips */}
              {highlightedWords.length > 0 && (
                <div className="mb-4 p-3 bg-muted/50 rounded-md">
                  <p className="text-sm font-medium mb-2">
                    {t("reading.extractedText.highlightedWords")} (
                    {highlightedWords.length}):
                  </p>
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
                </div>
              )}

              {/* Analyzed sentences chips */}
              {analyzedSentencesKeys.length > 0 && (
                <div className="mb-4 p-3 bg-muted/50 rounded-md">
                  <p className="text-sm font-medium mb-2">
                    {t("reading.extractedText.analyzedSentences")} (
                    {analyzedSentencesKeys.length}):
                  </p>
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
                          title={t("reading.extractedText.clickToRemoveAnalysis")}
                        >
                          {displayText}
                        </span>
                      );
                    })}
                  </div>
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
          className="selection-popup fixed z-[9999] shadow-md flex gap-0.5 bg-background border rounded-md p-0.5"
          style={{
            left: selection.x,
            top: selection.y,
            transform: "translateX(-50%)",
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
            onClick={handleReadAloud}
            onTouchEnd={handleReadAloud}
            disabled={isTTSLoading}
            className="border-r"
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
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAnalyzeSentence}
            onTouchEnd={handleAnalyzeSentence}
            disabled={isAnalysisLoading}
            className="rounded-l-none"
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
        </div>
      )}

      {/* ── Sentence analysis dialog ─────────────────────────────────────── */}
      <Dialog
        open={!!activeSentence}
        onOpenChange={(open) => !open && setActiveSentence(null)}
      >
        <DialogContent className="dialog-safe-width max-h-[80vh] overflow-x-hidden overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
              <MagicDown
                value={activeAnalysis.analysis}
                onChange={() => {}}
                hideTools
              />
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

      <TextDifficultyAnalyzer />
    </section>
  );
}

export default AdaptedText;
