"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardCheck, LoaderCircle, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import { cn } from "@/utils/style";

function ReadingTest() {
  const { t } = useTranslation();
  const { extractedText, readingTest, testScore, testCompleted } = useReadingStore();
  const { status, generateReadingTest, calculateTestScore } = useReadingAssistant();
  const [showExplanations, setShowExplanations] = useState(false);
  
  const isGenerating = status === "testing";

  const handleAnswerChange = (questionId: string, answer: string) => {
    useReadingStore.getState().setUserAnswer(questionId, answer);
  };

  const handleSubmit = () => {
    calculateTestScore();
    setShowExplanations(true);
  };

  const handleReset = () => {
    useReadingStore.getState().setTestCompleted(false);
    useReadingStore.getState().setTestScore(0);
    useReadingStore.getState().readingTest.forEach(q => {
      useReadingStore.getState().setUserAnswer(q.id, "");
    });
    setShowExplanations(false);
  };

  if (!extractedText) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <section className="p-4 border rounded-md mt-4">
      <div className="flex items-center justify-between border-b mb-4">
        <h3 className="font-semibold text-lg leading-10">
          {t("reading.readingTest.title")}
        </h3>
        <div className="flex gap-2">
          {!readingTest.length ? (
            <Button
              onClick={() => generateReadingTest()}
              disabled={isGenerating}
              size="sm"
            >
              {isGenerating ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span>{t("reading.readingTest.generating")}</span>
                </>
              ) : (
                <>
                  <ClipboardCheck className="h-4 w-4" />
                  <span>{t("reading.readingTest.generate")}</span>
                </>
              )}
            </Button>
          ) : testCompleted ? (
            <Button
              onClick={handleReset}
              variant="secondary"
              size="sm"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{t("reading.readingTest.retry")}</span>
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              size="sm"
            >
              <CheckCircle className="h-4 w-4" />
              <span>{t("reading.readingTest.submit")}</span>
            </Button>
          )}
        </div>
      </div>

      {!readingTest.length ? (
        <div className="text-center py-8 text-muted-foreground">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t("reading.readingTest.emptyTip")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {testCompleted && (
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-lg font-medium mb-2">
                {t("reading.readingTest.yourScore")}
              </p>
              <p className={cn("text-4xl font-bold", getScoreColor(testScore))}>
                {testScore}%
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {testScore >= 80
                  ? t("reading.readingTest.excellent")
                  : testScore >= 60
                  ? t("reading.readingTest.good")
                  : t("reading.readingTest.keepPracticing")}
              </p>
            </div>
          )}

          {readingTest.map((question, index) => {
            const isCorrect = question.userAnswer?.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
            
            return (
              <div
                key={question.id}
                className={cn(
                  "p-4 border rounded-lg",
                  testCompleted && question.type !== "short-answer" && (isCorrect ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-red-500 bg-red-50 dark:bg-red-950")
                )}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="font-bold text-primary">{index + 1}.</span>
                  <div className="flex-1">
                    <p className="font-medium">{question.question}</p>
                    {question.type === "multiple-choice" && (
                      <span className="text-xs text-muted-foreground">
                        ({t("reading.readingTest.multipleChoice")})
                      </span>
                    )}
                    {question.type === "true-false" && (
                      <span className="text-xs text-muted-foreground">
                        ({t("reading.readingTest.trueFalse")})
                      </span>
                    )}
                    {question.type === "short-answer" && (
                      <span className="text-xs text-muted-foreground">
                        ({t("reading.readingTest.shortAnswer")})
                      </span>
                    )}
                  </div>
                  {testCompleted && question.type !== "short-answer" && (
                    isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )
                  )}
                </div>

                {question.type === "multiple-choice" && question.options && (
                  <RadioGroup
                    value={question.userAnswer || ""}
                    onValueChange={(value) => handleAnswerChange(question.id, value)}
                    disabled={testCompleted}
                    className="space-y-2 ml-6"
                  >
                    {question.options.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        className={cn(
                          "flex items-center space-x-2",
                          testCompleted && option.charAt(0) === question.correctAnswer && "text-green-600 font-medium"
                        )}
                      >
                        <RadioGroupItem value={option.charAt(0)} id={`${question.id}-${optIndex}`} />
                        <Label htmlFor={`${question.id}-${optIndex}`}>{option}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {question.type === "true-false" && (
                  <RadioGroup
                    value={question.userAnswer || ""}
                    onValueChange={(value) => handleAnswerChange(question.id, value)}
                    disabled={testCompleted}
                    className="space-y-2 ml-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id={`${question.id}-true`} />
                      <Label htmlFor={`${question.id}-true`}>{t("reading.readingTest.true")}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id={`${question.id}-false`} />
                      <Label htmlFor={`${question.id}-false`}>{t("reading.readingTest.false")}</Label>
                    </div>
                  </RadioGroup>
                )}

                {question.type === "short-answer" && (
                  <div className="ml-6">
                    <Input
                      value={question.userAnswer || ""}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      placeholder={t("reading.readingTest.shortAnswerPlaceholder")}
                      disabled={testCompleted}
                      className="mt-2"
                    />
                    {testCompleted && question.correctAnswer && (
                      <p className="text-sm text-muted-foreground mt-2">
                        <strong>{t("reading.readingTest.suggestedAnswer")}:</strong> {question.correctAnswer}
                      </p>
                    )}
                  </div>
                )}

                {testCompleted && showExplanations && question.explanation && (
                  <div className="mt-3 p-3 bg-muted rounded text-sm">
                    <strong>{t("reading.readingTest.explanation")}:</strong> {question.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default ReadingTest;
