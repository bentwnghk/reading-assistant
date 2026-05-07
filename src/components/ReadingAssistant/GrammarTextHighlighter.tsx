"use client";
import React, { useMemo } from "react";
import { useReadingStore } from "@/store/reading";

const TOPIC_COLORS: Record<string, { bg: string; border: string }> = {
  tenses: { bg: "bg-blue-200 dark:bg-blue-800", border: "border-blue-400" },
  conditionals: { bg: "bg-purple-200 dark:bg-purple-800", border: "border-purple-400" },
  "passive-voice": { bg: "bg-green-200 dark:bg-green-800", border: "border-green-400" },
  "relative-clauses": { bg: "bg-orange-200 dark:bg-orange-800", border: "border-orange-400" },
  "reported-speech": { bg: "bg-pink-200 dark:bg-pink-800", border: "border-pink-400" },
  "modal-verbs": { bg: "bg-cyan-200 dark:bg-cyan-800", border: "border-cyan-400" },
  articles: { bg: "bg-yellow-200 dark:bg-yellow-800", border: "border-yellow-400" },
  prepositions: { bg: "bg-red-200 dark:bg-red-800", border: "border-red-400" },
  conjunctions: { bg: "bg-indigo-200 dark:bg-indigo-800", border: "border-indigo-400" },
  comparisons: { bg: "bg-teal-200 dark:bg-teal-800", border: "border-teal-400" },
  "infinitives-gerunds": { bg: "bg-lime-200 dark:bg-lime-800", border: "border-lime-400" },
  subjunctive: { bg: "bg-fuchsia-200 dark:bg-fuchsia-800", border: "border-fuchsia-400" },
  "clause-structure": { bg: "bg-amber-200 dark:bg-amber-800", border: "border-amber-400" },
  other: { bg: "bg-gray-200 dark:bg-gray-800", border: "border-gray-400" },
};

interface GrammarHighlightedTextProps {
  text: string;
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function GrammarHighlightedText({ text }: GrammarHighlightedTextProps) {
  const { grammarTopics, grammarHighlightTopicId } = useReadingStore();

  const highlightedContent = useMemo(() => {
    const topic = grammarTopics.find((t) => t.id === grammarHighlightTopicId);
    if (!topic || topic.textSentences.length === 0) {
      return <span>{text}</span>;
    }

    const parts: React.ReactNode[] = [];
    const sentences = topic.textSentences
      .filter((s) => s.trim().length > 5)
      .sort((a, b) => b.length - a.length);

    if (sentences.length === 0) {
      return <span>{text}</span>;
    }

    const patterns = sentences.map((s) => escapeRegExp(s.trim()));
    const combinedPattern = new RegExp(`(${patterns.join("|")})`, "g");

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    while ((match = combinedPattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${key++}`}>{text.slice(lastIndex, match.index)}</span>
        );
      }

      const colors = TOPIC_COLORS[topic.category] || TOPIC_COLORS.other;
      parts.push(
        <span
          key={`grammar-${key++}`}
          className={`${colors.bg} ${colors.border} border-l-2 px-1 rounded-sm cursor-default`}
          title={`${topic.name} (${topic.nameZh})`}
        >
          {match[0]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={`text-${key++}`}>{text.slice(lastIndex)}</span>);
    }

    return parts;
  }, [text, grammarTopics, grammarHighlightTopicId]);

  return <>{highlightedContent}</>;
}

interface GrammarTextHighlighterProps {
  text: string | null;
}

export default function GrammarTextHighlighter({ text }: GrammarTextHighlighterProps) {
  const { grammarHighlightEnabled, grammarHighlightTopicId, grammarTopics } = useReadingStore();

  if (!text || !grammarHighlightEnabled || !grammarHighlightTopicId) return null;

  const topic = grammarTopics.find((t) => t.id === grammarHighlightTopicId);
  if (!topic) return null;

  return (
    <div className="mt-4 border rounded-md p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-3 h-3 rounded ${
              (TOPIC_COLORS[topic.category] || TOPIC_COLORS.other).bg
            }`}
          />
          <span className="font-medium text-sm">
            {topic.name} ({topic.nameZh})
          </span>
          <span className="text-xs text-muted-foreground">
            — {topic.textSentences.length} sentences highlighted
          </span>
        </div>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-full max-h-[300px] overflow-y-auto">
        <p className="whitespace-pre-wrap leading-relaxed">
          <GrammarHighlightedText text={text} />
        </p>
      </div>
    </div>
  );
}
