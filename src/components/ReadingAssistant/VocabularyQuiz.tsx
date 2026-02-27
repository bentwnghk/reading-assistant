"use client";
import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Play, CheckCircle, XCircle, RotateCcw, Eye, ArrowLeft, ChevronRight, Trophy, Target, FileDown, ChevronDown } from "lucide-react";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  convertInchesToTwip,
  PageOrientation,
} from "docx";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useReadingStore } from "@/store/reading";
import { useHistoryStore } from "@/store/history";
import { cn } from "@/utils/style";
import { nanoid } from "nanoid";
import { sortGlossaryByPriority, getWordStats } from "@/utils/vocabulary";

interface VocabularyQuizProps {
  glossary: GlossaryEntry[];
}

type QuizState = "idle" | "in-progress" | "completed";

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function formatBilingualDefinition(entry: GlossaryEntry): string {
  return `${entry.englishDefinition} (${entry.chineseDefinition})`;
}

function generateQuizQuestions(sortedGlossary: GlossaryEntry[]): VocabularyQuizQuestion[] {
  const questions: VocabularyQuizQuestion[] = [];

  for (const entry of sortedGlossary) {
    const otherEntries = sortedGlossary.filter((e) => e.word !== entry.word);
    const type = ["word-to-definition", "definition-to-word", "fill-blank"][
      Math.floor(Math.random() * 3)
    ] as VocabularyQuizQuestion["type"];

    if (type === "word-to-definition") {
      const wrongOptions = shuffleArray(otherEntries)
        .slice(0, 3)
        .map((e) => formatBilingualDefinition(e));
      const correctOption = formatBilingualDefinition(entry);
      const options = shuffleArray([correctOption, ...wrongOptions]);

      questions.push({
        id: nanoid(),
        type: "word-to-definition",
        question: entry.word,
        options,
        correctAnswer: correctOption,
        wordRef: entry.word,
      });
    } else if (type === "definition-to-word") {
      const wrongOptions = shuffleArray(otherEntries)
        .slice(0, 3)
        .map((e) => e.word);
      const options = shuffleArray([entry.word, ...wrongOptions]);

      questions.push({
        id: nanoid(),
        type: "definition-to-word",
        question: formatBilingualDefinition(entry),
        options,
        correctAnswer: entry.word,
        wordRef: entry.word,
      });
    } else {
      if (entry.example) {
        const blankSentence = entry.example.replace(
          new RegExp(`\\b${entry.word}\\b`, "gi"),
          "______"
        );

        if (blankSentence !== entry.example) {
          const wrongOptions = shuffleArray(otherEntries)
            .slice(0, 3)
            .map((e) => e.word);
          const options = shuffleArray([entry.word, ...wrongOptions]);

          questions.push({
            id: nanoid(),
            type: "fill-blank",
            question: blankSentence,
            options,
            correctAnswer: entry.word,
            wordRef: entry.word,
          });
          continue;
        }
      }

      const wrongOptions = shuffleArray(otherEntries)
        .slice(0, 3)
        .map((e) => formatBilingualDefinition(e));
      const correctOption = formatBilingualDefinition(entry);
      const options = shuffleArray([correctOption, ...wrongOptions]);

      questions.push({
        id: nanoid(),
        type: "word-to-definition",
        question: entry.word,
        options,
        correctAnswer: correctOption,
        wordRef: entry.word,
      });
    }
  }

  return questions;
}

function VocabularyQuiz({ glossary }: VocabularyQuizProps) {
  const { t } = useTranslation();
  const { id, docTitle, extractedText, vocabularyQuizScore, setVocabularyQuizScore, glossaryRatings, backup } = useReadingStore();
  const { update, save } = useHistoryStore();

  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [questions, setQuestions] = useState<VocabularyQuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showReview, setShowReview] = useState(false);
  const [prioritizeHardWords, setPrioritizeHardWords] = useState(false);

  const wordStats = useMemo(() => {
    return getWordStats(glossary, glossaryRatings);
  }, [glossary, glossaryRatings]);

  const startQuiz = useCallback(() => {
    const sortedGlossary = sortGlossaryByPriority(glossary, glossaryRatings, {
      prioritize: prioritizeHardWords,
      shuffle: true,
    });
    const generatedQuestions = generateQuizQuestions(sortedGlossary);
    setQuestions(generatedQuestions);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setQuizState("in-progress");
    setShowReview(false);
  }, [glossary, glossaryRatings, prioritizeHardWords]);

  const handleAnswer = (answer: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));
  };

  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      const correct = questions.filter(
        (q) => answers[q.id] === q.correctAnswer
      ).length;
      const percentage = Math.round((correct / questions.length) * 100);
      setVocabularyQuizScore(percentage);
      setQuizState("completed");
      
      if (id) {
        const session = backup();
        const updated = update(id, session);
        if (!updated) {
          save(session);
        }
      }
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const getScore = useMemo(() => {
    let correct = 0;
    for (const question of questions) {
      if (answers[question.id] === question.correctAnswer) {
        correct++;
      }
    }
    return { correct, total: questions.length };
  }, [questions, answers]);

  const missedQuestions = useMemo(() => {
    return questions.filter((q) => answers[q.id] !== q.correctAnswer);
  }, [questions, answers]);

  const retryMissed = () => {
    if (missedQuestions.length === 0) return;
    const missedWords = glossary.filter((e) => missedQuestions.some((q) => q.wordRef === e.word));
    const sortedMissed = sortGlossaryByPriority(missedWords, glossaryRatings, {
      prioritize: prioritizeHardWords,
      shuffle: true,
    });
    const newQuestions = generateQuizQuestions(sortedMissed);
    setQuestions(newQuestions);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setQuizState("in-progress");
    setShowReview(false);
  };

  const downloadWord = useCallback(async (includeAnswers: boolean = false) => {
    const sortedGlossary = sortGlossaryByPriority(glossary, glossaryRatings, {
      prioritize: prioritizeHardWords,
      shuffle: true,
    });
    const questionsToExport = questions.length > 0 ? questions : generateQuizQuestions(sortedGlossary);
    
    if (!questionsToExport.length) return;

    const title = docTitle || extractedText.split(/\n/).find((l) => l.trim()) || "Vocabulary Quiz";
    const generatedAt = new Date().toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const children: Paragraph[] = [];

    children.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      })
    );

    const subtitle = includeAnswers 
      ? t("reading.glossary.quiz.answerKeyTitle")
      : t("reading.glossary.quiz.title");

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${subtitle} - Generated on ${generatedAt}`,
            italics: true,
            color: "595959",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    questionsToExport.forEach((question, index) => {
      const typeLabel = question.type === "word-to-definition"
        ? t("reading.glossary.quiz.chooseDefinition")
        : question.type === "definition-to-word"
        ? t("reading.glossary.quiz.chooseWord")
        : t("reading.glossary.quiz.fillBlank");

      children.push(
        new Paragraph({
          text: `${index + 1}. ${question.question}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `[${typeLabel}]`, color: "666666", size: 20 }),
          ],
          spacing: { after: 100 },
        })
      );

      question.options.forEach((option) => {
        const isCorrect = option === question.correctAnswer;
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `   ${option}`,
                bold: isCorrect && includeAnswers,
                color: isCorrect && includeAnswers ? "22C55E" : "000000",
              }),
            ],
            spacing: { after: 50 },
          })
        );
      });

      if (includeAnswers) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${t("reading.glossary.quiz.correctAnswer")}: `, bold: true }),
              new TextRun({ text: question.correctAnswer, color: "22C55E" }),
            ],
            spacing: { before: 100, after: 200 },
          })
        );
      }
    });

    try {
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: convertInchesToTwip(1),
                  bottom: convertInchesToTwip(1),
                  left: convertInchesToTwip(1.1),
                  right: convertInchesToTwip(1.1),
                },
                size: { orientation: PageOrientation.PORTRAIT },
              },
            },
            children,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const safeFileName = title
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
      const fileSuffix = includeAnswers 
        ? " - Vocabulary Quiz Answer Key.docx"
        : " - Vocabulary Quiz.docx";
      saveAs(blob, `${safeFileName}${fileSuffix}`);
    } catch (error) {
      console.error("Failed to generate Word document:", error);
    }
  }, [questions, extractedText, docTitle, glossary, glossaryRatings, prioritizeHardWords, t]);

  if (glossary.length < 4) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t("reading.glossary.quiz.noQuizWords")}</p>
      </div>
    );
  }

  const hasRatings = wordStats.hard > 0 || wordStats.medium > 0 || wordStats.easy > 0;

  if (quizState === "idle") {
    return (
      <div className="py-4 space-y-6">
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">{t("reading.glossary.quiz.downloadWord")}</span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => downloadWord(false)}>
                {t("reading.glossary.quiz.downloadBlank")}
              </DropdownMenuItem>
              {vocabularyQuizScore > 0 && (
                <DropdownMenuItem onClick={() => downloadWord(true)}>
                  {t("reading.glossary.quiz.downloadWithAnswers")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="text-center">
          <p className="text-muted-foreground mb-6">
            {t("reading.glossary.quiz.wordsAvailable", { count: glossary.length })}
          </p>

          {hasRatings && (
            <div className="flex justify-center mb-4">
              <button
                onClick={() => setPrioritizeHardWords(!prioritizeHardWords)}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all",
                  prioritizeHardWords
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                <Target className="h-4 w-4" />
                <span className="text-sm">{t("reading.glossary.prioritizeHard")}</span>
              </button>
            </div>
          )}

          {prioritizeHardWords && hasRatings && (
            <p className="text-xs text-muted-foreground mb-4">
              {t("reading.glossary.wordStats", { 
                hard: wordStats.hard, 
                medium: wordStats.medium, 
                easy: wordStats.easy 
              })}
            </p>
          )}

          <Button onClick={startQuiz} size="lg">
            <Play className="h-5 w-5 mr-2" />
            {t("reading.glossary.quiz.startQuiz")}
          </Button>
          {vocabularyQuizScore > 0 && (
            <div className="flex justify-center mt-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">{t("reading.glossary.quiz.lastScore")}</span>
                <span className="text-lg font-bold text-primary">{vocabularyQuizScore}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (quizState === "completed") {
    const percentage = Math.round((getScore.correct / getScore.total) * 100);

    return (
      <div className="py-6 space-y-6">
        <div className="text-center">
          <h4 className="text-xl font-bold mb-2">{t("reading.glossary.quiz.quizComplete")}</h4>
          <div
            className={cn(
              "text-5xl font-bold mb-2",
              percentage >= 80
                ? "text-green-600 dark:text-green-400"
                : percentage >= 60
                ? "text-yellow-600 dark:text-yellow-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            {percentage}%
          </div>
          <p className="text-muted-foreground">
            {t("reading.glossary.quiz.scoreFormat", { correct: getScore.correct, total: getScore.total })}
          </p>
        </div>

        <div className="flex gap-2 justify-center flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">{t("reading.glossary.quiz.downloadWord")}</span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => downloadWord(false)}>
                {t("reading.glossary.quiz.downloadBlank")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadWord(true)}>
                {t("reading.glossary.quiz.downloadWithAnswers")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => setShowReview(!showReview)}>
            <Eye className="h-4 w-4 mr-2" />
            {t("reading.glossary.quiz.reviewAnswers")}
          </Button>
          {missedQuestions.length > 0 && (
            <Button variant="secondary" onClick={retryMissed}>
              <RotateCcw className="h-4 w-4 mr-2" />
              {t("reading.glossary.quiz.retryMissed")} ({missedQuestions.length})
            </Button>
          )}
          <Button onClick={startQuiz}>
            <Play className="h-4 w-4 mr-2" />
            {t("reading.glossary.quiz.retryQuiz")}
          </Button>
        </div>

        {showReview && (
          <div className="space-y-4 mt-6">
            {questions.map((question, index) => {
              const userAnswer = answers[question.id];
              const isCorrect = userAnswer === question.correctAnswer;

              return (
                <div
                  key={question.id}
                  className={cn(
                    "p-4 border rounded-lg",
                    isCorrect
                      ? "border-green-500 bg-green-50 dark:bg-green-950"
                      : "border-red-500 bg-red-50 dark:bg-red-950"
                  )}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="font-bold text-primary">{index + 1}.</span>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">
                        {question.type === "word-to-definition" &&
                          t("reading.glossary.quiz.chooseDefinition")}
                        {question.type === "definition-to-word" &&
                          t("reading.glossary.quiz.chooseWord")}
                        {question.type === "fill-blank" && t("reading.glossary.quiz.fillBlank")}
                      </p>
                      <p className="font-medium">
                        {question.type === "fill-blank" ? (
                          <span className="italic">&ldquo;{question.question}&rdquo;</span>
                        ) : (
                          question.question
                        )}
                      </p>
                    </div>
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>

                  <div className="ml-6 space-y-1 text-sm">
                    {question.options.map((option) => (
                      <div
                        key={option}
                        className={cn(
                          option === question.correctAnswer && "text-green-600 font-medium",
                          option === userAnswer &&
                            option !== question.correctAnswer &&
                            "text-red-600"
                        )}
                      >
                        {option}
                        {option === question.correctAnswer && " ✓"}
                        {option === userAnswer && option !== question.correctAnswer && " ✘"}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id];

  return (
    <div className="py-4 space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            {t("reading.glossary.quiz.question")} {currentQuestionIndex + 1}{" "}
            {t("reading.glossary.quiz.of")} {questions.length}
          </span>
          <span>
            {t("reading.glossary.quiz.pressKey")} →/←
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(currentQuestionIndex / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="p-6 border rounded-lg bg-card">
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">
            {currentQuestion.type === "word-to-definition" &&
              t("reading.glossary.quiz.chooseDefinition")}
            {currentQuestion.type === "definition-to-word" &&
              t("reading.glossary.quiz.chooseWord")}
            {currentQuestion.type === "fill-blank" && t("reading.glossary.quiz.fillBlank")}
          </p>
          <p className="text-xl font-medium">
            {currentQuestion.type === "fill-blank" ? (
              <span className="italic">&ldquo;{currentQuestion.question}&rdquo;</span>
            ) : (
              currentQuestion.question
            )}
          </p>
        </div>

        <RadioGroup
          value={currentAnswer || ""}
          onValueChange={handleAnswer}
          className="space-y-3"
        >
          {currentQuestion.options.map((option, index) => (
            <div
              key={option}
              className={cn(
                "flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer",
                currentAnswer === option && "border-primary bg-accent"
              )}
              onClick={() => handleAnswer(option)}
            >
              <RadioGroupItem value={option} id={`option-${index}`} />
              <Label htmlFor={`option-${index}`} className="cursor-pointer flex-1">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goToPrevious}
          disabled={currentQuestionIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("reading.glossary.flashcard.previous")}
        </Button>

        <Button onClick={goToNext} disabled={!currentAnswer}>
          {currentQuestionIndex === questions.length - 1
            ? t("reading.glossary.quiz.submitQuiz")
            : t("reading.glossary.flashcard.next")}
          {currentQuestionIndex !== questions.length - 1 && (
            <ChevronRight className="h-4 w-4 ml-2" />
          )}
        </Button>
      </div>
    </div>
  );
}

export default VocabularyQuiz;
