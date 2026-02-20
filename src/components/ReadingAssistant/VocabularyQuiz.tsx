"use client";
import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Play, CheckCircle, XCircle, RotateCcw, Eye, ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/style";
import { nanoid } from "nanoid";

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

function generateQuizQuestions(glossary: GlossaryEntry[]): VocabularyQuizQuestion[] {
  const questions: VocabularyQuizQuestion[] = [];
  const shuffledGlossary = shuffleArray(glossary);

  for (const entry of shuffledGlossary) {
    const otherEntries = glossary.filter((e) => e.word !== entry.word);
    const type = ["word-to-definition", "definition-to-word", "fill-blank"][
      Math.floor(Math.random() * 3)
    ] as VocabularyQuizQuestion["type"];

    if (type === "word-to-definition") {
      const wrongOptions = shuffleArray(otherEntries)
        .slice(0, 3)
        .map((e) => e.englishDefinition);
      const options = shuffleArray([entry.englishDefinition, ...wrongOptions]);

      questions.push({
        id: nanoid(),
        type: "word-to-definition",
        question: entry.word,
        options,
        correctAnswer: entry.englishDefinition,
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
        question: entry.englishDefinition,
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
        .map((e) => e.englishDefinition);
      const options = shuffleArray([entry.englishDefinition, ...wrongOptions]);

      questions.push({
        id: nanoid(),
        type: "word-to-definition",
        question: entry.word,
        options,
        correctAnswer: entry.englishDefinition,
        wordRef: entry.word,
      });
    }
  }

  return questions;
}

function VocabularyQuiz({ glossary }: VocabularyQuizProps) {
  const { t } = useTranslation();

  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [questions, setQuestions] = useState<VocabularyQuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showReview, setShowReview] = useState(false);

  const startQuiz = useCallback(() => {
    const generatedQuestions = generateQuizQuestions(glossary);
    setQuestions(generatedQuestions);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setQuizState("in-progress");
    setShowReview(false);
  }, [glossary]);

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
      setQuizState("completed");
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
    const newQuestions = generateQuizQuestions(
      glossary.filter((e) => missedQuestions.some((q) => q.wordRef === e.word))
    );
    setQuestions(newQuestions);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setQuizState("in-progress");
    setShowReview(false);
  };

  if (glossary.length < 4) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t("reading.glossary.quiz.noQuizWords")}</p>
      </div>
    );
  }

  if (quizState === "idle") {
    return (
      <div className="text-center py-12">
          <p className="text-muted-foreground mb-6">
            {t("reading.glossary.quiz.wordsAvailable", { count: glossary.length })}
          </p>
        <Button onClick={startQuiz} size="lg">
          <Play className="h-5 w-5 mr-2" />
          {t("reading.glossary.quiz.startQuiz")}
        </Button>
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
            {getScore.correct} {t("reading.glossary.quiz.correct")} {t("reading.glossary.quiz.of")}{" "}
            {getScore.total}
          </p>
        </div>

        <div className="flex gap-2 justify-center flex-wrap">
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
                            "text-red-600 line-through"
                        )}
                      >
                        {option}
                        {option === question.correctAnswer && " ✓"}
                      </div>
                    ))}
                  </div>

                  {!isCorrect && (
                    <div className="ml-6 mt-2 text-sm text-muted-foreground">
                      {t("reading.glossary.quiz.yourScore")}: {userAnswer || "-"}
                    </div>
                  )}
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
