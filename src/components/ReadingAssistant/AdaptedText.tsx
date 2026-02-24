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
  Download,
} from "lucide-react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from "docx";
import { saveAs } from "file-saver";
import { generateText } from "ai";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReadingStore } from "@/store/reading";
import { useSettingStore } from "@/store/setting";
import { generateSignature } from "@/utils/signature";
import { completePath } from "@/utils/url";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import useModelProvider from "@/hooks/useAiProvider";
import { analyzeSentencePrompt } from "@/constants/readingPrompts";

const MagicDown = dynamic(() => import("@/components/MagicDown"));

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

// ─── component ──────────────────────────────────────────────────────────────

function AdaptedText() {
  const { t } = useTranslation();

  // store
  const {
    extractedText,
    adaptedText,
    simplifiedText,
    studentAge,
    highlightedWords,
    analyzedSentences,
    glossary,
    addHighlightedWord,
    removeHighlightedWord,
    removeSentenceAnalysis,
    setSentenceAnalysis,
    getSentenceAnalysis,
  } = useReadingStore();

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
  const [includeGlossary, setIncludeGlossary] = useState(false);

  const isAdapting = status === "adapting";
  const isSimplifying = status === "simplifying";

  // ── interactive-text state ──
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

      if (container && container.contains(range.commonAncestorContainer)) {
        const rect = range.getBoundingClientRect();
        setSelection({
          text: selectedText,
          x: rect.left + rect.width / 2,
          y: rect.bottom + 8,
        });
      } else {
        setSelection(null);
      }
    }
  }, []);

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
    try {
      const children: (Paragraph | Table)[] = [];

      children.push(
        new Paragraph({
          text: t("reading.adaptedText.originalTab"),
          heading: HeadingLevel.HEADING_1,
        })
      );
      children.push(...createDocxWithHighlights(extractedText, highlightedWords, analyzedSentences));

      if (includeGlossary && glossary.length > 0) {
        children.push(new Paragraph({ text: "", children: [] }));
        children.push(
          new Paragraph({
            text: t("reading.glossary.title"),
            heading: HeadingLevel.HEADING_1,
          })
        );

        const headerRow = new TableRow({
          children: [
            t("reading.glossary.word"),
            t("reading.glossary.partOfSpeech"),
            t("reading.glossary.englishDefinition"),
            t("reading.glossary.chineseDefinition"),
            t("reading.glossary.example"),
          ].map(
            (header) =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })] })],
                width: { size: 20, type: WidthType.PERCENTAGE },
              })
          ),
        });

        const dataRows = glossary.map(
          (entry) =>
            new TableRow({
              children: [
                entry.word,
                entry.partOfSpeech || "",
                entry.englishDefinition,
                entry.chineseDefinition,
                entry.example || "",
              ].map(
                (cellText) =>
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: cellText })] })],
                    width: { size: 20, type: WidthType.PERCENTAGE },
                  })
              ),
            })
        );

        children.push(
          new Table({
            rows: [headerRow, ...dataRows],
          })
        );
      }

      if (adaptedText) {
        children.push(new Paragraph({ text: "", children: [] }));
        children.push(
          new Paragraph({
            text: t("reading.adaptedText.adaptedTab"),
            heading: HeadingLevel.HEADING_1,
          })
        );
        const adaptedParagraphs = adaptedText.split(/\n/).map(
          (line) => new Paragraph({ children: [new TextRun({ text: line })] })
        );
        children.push(...adaptedParagraphs);
      }

      if (simplifiedText) {
        children.push(new Paragraph({ text: "", children: [] }));
        children.push(
          new Paragraph({
            text: t("reading.adaptedText.simplifiedTab"),
            heading: HeadingLevel.HEADING_1,
          })
        );
        const simplifiedParagraphs = simplifiedText.split(/\n/).map(
          (line) => new Paragraph({ children: [new TextRun({ text: line })] })
        );
        children.push(...simplifiedParagraphs);
      }

      const doc = new Document({
        sections: [
          {
            properties: {},
            children,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, "reading-content.docx");
    } catch (error) {
      console.error("Failed to generate Word document:", error);
    }
  }, [extractedText, highlightedWords, analyzedSentences, adaptedText, simplifiedText, includeGlossary, glossary, t]);

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
        <h3 className="font-semibold text-lg">
          {t("reading.adaptedText.title")}
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
          <Button onClick={handleDownloadWord} variant="outline" size="sm">
            <Download className="h-4 w-4" />
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
            <MagicDown
              value={highlightedText}
              onChange={() => {}}
              hideTools
              disableMath
            />
          </div>

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
              <div className="prose prose-slate dark:prose-invert max-w-full">
                <MagicDown
                  value={adaptedText}
                  onChange={() => {}}
                  hideTools
                  disableMath
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
              <div className="prose prose-slate dark:prose-invert max-w-full">
                <MagicDown
                  value={simplifiedText}
                  onChange={() => {}}
                  hideTools
                  disableMath
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("reading.extractedText.analysisTitle")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("reading.extractedText.analysisDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-full">
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
    </section>
  );
}

export default AdaptedText;
