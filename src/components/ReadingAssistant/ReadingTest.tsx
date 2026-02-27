"use client";
import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { 
  ClipboardCheck, 
  LoaderCircle, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Languages,
  ArrowLeft,
  ChevronRight,
  Trophy,
  Eye,
  BarChart3,
  Target,
  FileDown,
  ChevronDown
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import { cn } from "@/utils/style";

type QuizState = "idle" | "in-progress" | "completed";

const QUESTION_TYPE_LABELS: Record<ReadingTestQuestionType, string> = {
  "multiple-choice": "multipleChoice",
  "true-false-not-given": "trueFalseNG",
  "short-answer": "shortAnswer",
  "inference": "inference",
  "vocab-context": "vocabContext",
  "referencing": "referencing",
};

const SKILL_LABELS: Record<string, string> = {
  "main-idea": "mainIdea",
  "detail": "detail",
  "inference": "inference",
  "vocabulary": "vocabulary",
  "purpose": "purpose",
  "sequencing": "sequencing",
  "referencing": "detail",
};

function ReadingTest() {
  const { t } = useTranslation();
  const {
    extractedText,
    docTitle,
    readingTest,
    testScore,
    testCompleted,
    testEarnedPoints,
    testTotalPoints,
    testShowChinese,
    testMode,
    setTestShowChinese,
    setTestMode,
  } = useReadingStore();
  const { status, generateReadingTest, generateTargetedPractice, calculateTestScore, evaluateShortAnswer } = useReadingAssistant();
  
  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [evaluatingShortAnswer, setEvaluatingShortAnswer] = useState(false);
  const [retryMissedIds, setRetryMissedIds] = useState<Set<string>>(new Set());

  const isGenerating = status === "testing";

  const handleAnswerChange = (questionId: string, answer: string) => {
    useReadingStore.getState().setUserAnswer(questionId, answer);
  };

  const startTest = useCallback(() => {
    if (testMode === "question-by-question") {
      setQuizState("in-progress");
      setCurrentQuestionIndex(0);
      setShowReview(false);
    } else {
      setQuizState("in-progress");
      setShowReview(false);
    }
  }, [testMode]);

  const handleSubmit = async () => {
    setEvaluatingShortAnswer(true);
    
    for (const question of readingTest) {
      if (question.type === "short-answer" && question.userAnswer) {
        await evaluateShortAnswer(
          question.id,
          question.question,
          question.correctAnswer,
          question.userAnswer,
          question.points
        );
      }
    }
    
    setEvaluatingShortAnswer(false);
    calculateTestScore();
    setQuizState("completed");
    setShowReview(true);
  };

  const handleReset = () => {
    useReadingStore.getState().setTestCompleted(false);
    useReadingStore.getState().setTestScore(0);
    useReadingStore.getState().setTestPoints(0, 0);
    useReadingStore.getState().readingTest.forEach((q) => {
      useReadingStore.getState().setUserAnswer(q.id, "");
      if (q.type === "short-answer") {
        useReadingStore.getState().setQuestionEarnedPoints(q.id, 0);
      }
    });
    setQuizState("idle");
    setShowReview(false);
    setCurrentQuestionIndex(0);
    setRetryMissedIds(new Set());
  };

  const handleRetryMissed = () => {
    const missedIds = new Set(missedQuestions.map(q => q.id));
    missedQuestions.forEach((q) => {
      useReadingStore.getState().setUserAnswer(q.id, "");
      if (q.type === "short-answer") {
        useReadingStore.getState().setQuestionEarnedPoints(q.id, 0);
      }
    });
    useReadingStore.getState().setTestCompleted(false);
    useReadingStore.getState().setTestScore(0);
    useReadingStore.getState().setTestPoints(0, 0);
    setRetryMissedIds(missedIds);
    setQuizState("in-progress");
    setShowReview(false);
    setCurrentQuestionIndex(0);
  };

  const questionsToDisplay = useMemo(() => {
    if (retryMissedIds.size > 0) {
      return readingTest.filter(q => retryMissedIds.has(q.id));
    }
    return readingTest;
  }, [readingTest, retryMissedIds]);

  const goToNext = () => {
    if (currentQuestionIndex < questionsToDisplay.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const missedQuestions = useMemo(() => {
    return readingTest.filter((q) => {
      if (q.type === "short-answer") {
        return (q.earnedPoints ?? 0) < q.points;
      }
      const userAnswer = q.userAnswer?.toLowerCase().trim().replace(/[-\s]+/g, "-");
      const correctAnswer = q.correctAnswer.toLowerCase().trim().replace(/[-\s]+/g, "-");
      if (q.type === "multiple-choice" || q.type === "inference" || q.type === "vocab-context" || q.type === "referencing") {
        return userAnswer !== correctAnswer && userAnswer !== correctAnswer.charAt(0);
      }
      return userAnswer !== correctAnswer;
    });
  }, [readingTest]);

  const skillStats = useMemo(() => {
    const stats: Record<string, { earned: number; total: number; correct: number; count: number }> = {};
    readingTest.forEach((q) => {
      const skill = q.skillTested;
      if (!stats[skill]) {
        stats[skill] = { earned: 0, total: 0, correct: 0, count: 0 };
      }
      stats[skill].total += q.points;
      stats[skill].count += 1;
      
      if (q.type === "short-answer") {
        stats[skill].earned += q.earnedPoints ?? 0;
        if ((q.earnedPoints ?? 0) >= q.points) {
          stats[skill].correct += 1;
        }
      } else {
        const userAnswer = q.userAnswer?.toLowerCase().trim().replace(/[-\s]+/g, "-");
        const correctAnswer = q.correctAnswer.toLowerCase().trim().replace(/[-\s]+/g, "-");
        let isCorrect = false;
        if (q.type === "multiple-choice" || q.type === "inference" || q.type === "vocab-context" || q.type === "referencing") {
          isCorrect = userAnswer === correctAnswer || userAnswer === correctAnswer.charAt(0);
        } else {
          isCorrect = userAnswer === correctAnswer;
        }
        if (isCorrect) {
          stats[skill].earned += q.points;
          stats[skill].correct += 1;
        }
      }
    });
    return stats;
  }, [readingTest]);

  const missedSkills = useMemo(() => {
    const skills: ReadingTestSkill[] = [];
    Object.entries(skillStats).forEach(([skill, stats]) => {
      const percentage = stats.total > 0 ? (stats.earned / stats.total) * 100 : 0;
      if (percentage < 100) {
        skills.push(skill as ReadingTestSkill);
      }
    });
    return skills;
  }, [skillStats]);

  const handleTargetedPractice = async () => {
    if (missedSkills.length === 0) return;
    
    setRetryMissedIds(new Set());
    setCurrentQuestionIndex(0);
    setShowReview(false);
    
    const questions = await generateTargetedPractice(missedSkills);
    
    if (questions && questions.length > 0) {
      setQuizState("in-progress");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const downloadWord = useCallback(async (includeAnswers: boolean = false) => {
    if (!readingTest.length) return;

    const title = docTitle || extractedText.split(/\n/).find((l) => l.trim()) || "Reading Test";
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

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${t("reading.readingTest.title")} - Generated on ${generatedAt}`,
            italics: true,
            color: "595959",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    if (includeAnswers && testCompleted && testScore !== undefined) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${t("reading.readingTest.yourScore")}: `,
              bold: true,
            }),
            new TextRun({
              text: `${testScore}%`,
              bold: true,
              color: testScore >= 80 ? "22C55E" : testScore >= 60 ? "EAB308" : "EF4444",
            }),
          ],
          spacing: { after: 200 },
        })
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: t("reading.readingTest.pointsFormat", { earned: testEarnedPoints, total: testTotalPoints }),
            }),
          ],
          spacing: { after: 400 },
        })
      );
    }

    readingTest.forEach((question, index) => {
      const typeLabelKey = QUESTION_TYPE_LABELS[question.type] || question.type;
      const skillLabelKey = SKILL_LABELS[question.skillTested] || question.skillTested;
      const typeLabel = t(`reading.readingTest.${typeLabelKey}`);
      const skillLabel = t(`reading.readingTest.skills.${skillLabelKey}`);
      const paragraphLabel = question.paragraphRef ? t("reading.readingTest.paragraph", { num: question.paragraphRef }) : null;

      children.push(
        new Paragraph({
          text: `${index + 1}. ${question.question}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        })
      );

      const metaText = paragraphLabel 
        ? `[${typeLabel}] [${skillLabel}] [${paragraphLabel}]`
        : `[${typeLabel}] [${skillLabel}]`;

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: metaText, color: "666666", size: 20 }),
          ],
          spacing: { after: 100 },
        })
      );

      if ((question.type === "multiple-choice" || question.type === "inference" || question.type === "vocab-context" || question.type === "referencing") && question.options) {
        question.options.forEach((option, _optIndex) => {
          const isCorrect = option.charAt(0) === question.correctAnswer;
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
      }

      if (question.type === "true-false-not-given") {
        const options = [
          { label: t("reading.readingTest.true"), value: "true" },
          { label: t("reading.readingTest.false"), value: "false" },
          { label: t("reading.readingTest.notGiven"), value: "not-given" },
        ];
        options.forEach((opt) => {
          const isCorrect = opt.value === question.correctAnswer;
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `   ${opt.label}`,
                  bold: isCorrect && includeAnswers,
                  color: isCorrect && includeAnswers ? "22C55E" : "000000",
                }),
              ],
              spacing: { after: 50 },
            })
          );
        });
      }

      if (question.type === "short-answer") {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `   ${t("reading.readingTest.shortAnswerPlaceholder")}`, italics: true, color: "888888" }),
            ],
            spacing: { after: 100 },
          })
        );
      }

      if (includeAnswers) {
        if (question.type === "short-answer") {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${t("reading.readingTest.suggestedAnswer")}: `, bold: true }),
                new TextRun({ text: question.correctAnswer }),
              ],
              spacing: { before: 100, after: 100 },
            })
          );
        } else {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${t("reading.readingTest.suggestedAnswer")}: `, bold: true }),
                new TextRun({ text: question.correctAnswer, color: "22C55E" }),
              ],
              spacing: { before: 100, after: 100 },
            })
          );
        }

        if (question.explanation) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${t("reading.readingTest.explanation")}: `, bold: true }),
                new TextRun({ text: question.explanation }),
              ],
              spacing: { after: 200 },
            })
          );
        }
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
      saveAs(blob, `${safeFileName} - Reading Test.docx`);
    } catch (error) {
      console.error("Failed to generate Word document:", error);
    }
  }, [readingTest, extractedText, docTitle, testCompleted, testScore, testEarnedPoints, testTotalPoints, t]);

  const renderQuestion = (question: ReadingTestQuestion, index: number, showResult: boolean = false) => {
    let isCorrect = false;
    if (question.type === "short-answer") {
      isCorrect = (question.earnedPoints ?? 0) >= question.points;
    } else {
      const userAnswer = question.userAnswer?.toLowerCase().trim().replace(/[-\s]+/g, "-");
      const correctAnswer = question.correctAnswer.toLowerCase().trim().replace(/[-\s]+/g, "-");
      if (question.type === "multiple-choice" || question.type === "inference" || question.type === "vocab-context" || question.type === "referencing") {
        isCorrect = userAnswer === correctAnswer || userAnswer === correctAnswer.charAt(0);
      } else {
        isCorrect = userAnswer === correctAnswer;
      }
    }

    const typeLabelKey = QUESTION_TYPE_LABELS[question.type] || question.type;
    const skillLabelKey = SKILL_LABELS[question.skillTested] || question.skillTested;

    return (
      <div
        key={question.id}
        className={cn(
          "p-4 border rounded-lg",
          showResult && question.type !== "short-answer" && (isCorrect ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-red-500 bg-red-50 dark:bg-red-950"),
          showResult && question.type === "short-answer" && (isCorrect ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-yellow-500 bg-yellow-50 dark:bg-yellow-950")
        )}
      >
        <div className="flex items-start gap-3 mb-3">
          <span className="font-bold text-primary">{index + 1}.</span>
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-1">
              <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                {t(`reading.readingTest.${typeLabelKey}`)}
              </span>
              <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                {t(`reading.readingTest.skills.${skillLabelKey}`)}
              </span>
              {question.paragraphRef && (
                <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                  {t("reading.readingTest.paragraph", { num: question.paragraphRef })}
                </span>
              )}
            </div>
            <p className="font-medium">{question.question}</p>
            {testShowChinese && question.questionZh && (
              <p className="text-sm text-muted-foreground mt-1">{question.questionZh}</p>
            )}
          </div>
          {showResult && (
            question.type === "short-answer" ? (
              <div className="text-right">
                {isCorrect ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <span className={cn("text-sm font-medium", getScoreColor(Math.round(((question.earnedPoints ?? 0) / question.points) * 100)))}>
                    {question.earnedPoints ?? 0}/{question.points}
                  </span>
                )}
              </div>
            ) : (
              isCorrect ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )
            )
          )}
        </div>

        {(question.type === "multiple-choice" || question.type === "inference" || question.type === "vocab-context" || question.type === "referencing") && question.options && (
          <RadioGroup
            value={question.userAnswer || ""}
            onValueChange={(value) => handleAnswerChange(question.id, value)}
            disabled={showResult}
            className="space-y-2 ml-6"
          >
            {question.options.map((option, optIndex) => (
              <div
                key={optIndex}
                className={cn(
                  "flex items-start space-x-2",
                  showResult && option.charAt(0) === question.correctAnswer && "text-green-600 font-medium"
                )}
              >
                <RadioGroupItem value={option.charAt(0)} id={`${question.id}-${optIndex}`} />
                <div className="flex-1">
                  <Label htmlFor={`${question.id}-${optIndex}`}>{option}</Label>
                  {testShowChinese && question.optionsZh?.[optIndex] && (
                    <p className="text-xs text-muted-foreground">{question.optionsZh[optIndex]}</p>
                  )}
                </div>
              </div>
            ))}
          </RadioGroup>
        )}

        {question.type === "true-false-not-given" && (
          <RadioGroup
            value={question.userAnswer || ""}
            onValueChange={(value) => handleAnswerChange(question.id, value)}
            disabled={showResult}
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
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="not-given" id={`${question.id}-not-given`} />
              <Label htmlFor={`${question.id}-not-given`}>{t("reading.readingTest.notGiven")}</Label>
            </div>
          </RadioGroup>
        )}

        {question.type === "short-answer" && (
          <div className="ml-6">
            <Input
              value={question.userAnswer || ""}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder={t("reading.readingTest.shortAnswerPlaceholder")}
              disabled={showResult}
              className="mt-2"
            />
            {showResult && question.correctAnswer && (
              <p className="text-sm text-muted-foreground mt-2">
                <strong>{t("reading.readingTest.suggestedAnswer")}:</strong> {question.correctAnswer}
              </p>
            )}
          </div>
        )}

        {showResult && question.explanation && (
          <div className="mt-3 p-3 bg-muted rounded text-sm">
            <strong>{t("reading.readingTest.explanation")}:</strong> {question.explanation}
            {testShowChinese && question.explanationZh && (
              <p className="mt-1 text-muted-foreground">{question.explanationZh}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!extractedText) {
    return null;
  }

  if (!readingTest.length) {
    return (
      <section className="p-4 border rounded-md mt-4">
        <div className="flex items-center justify-between border-b mb-4">
          <h3 className="font-semibold text-lg leading-10 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            {t("reading.readingTest.title")}
          </h3>
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
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t("reading.readingTest.emptyTip")}</p>
        </div>
      </section>
    );
  }

  if (quizState === "idle") {
    return (
      <section className="p-4 border rounded-md mt-4">
        <div className="flex items-center justify-between border-b mb-4">
          <h3 className="font-semibold text-lg leading-10 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            {t("reading.readingTest.title")}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">{t("reading.readingTest.downloadWord")}</span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => downloadWord(false)}>
                {t("reading.readingTest.downloadBlank")}
              </DropdownMenuItem>
              {testCompleted && (
                <DropdownMenuItem onClick={() => downloadWord(true)}>
                  {t("reading.readingTest.downloadWithAnswers")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="space-y-1">
              <p className="font-medium">{t("reading.readingTest.questionByQuestion")}</p>
              <p className="text-sm text-muted-foreground">{t("reading.readingTest.modeDesc")}</p>
            </div>
            <Switch
              checked={testMode === "question-by-question"}
              onCheckedChange={(checked: boolean) => setTestMode(checked ? "question-by-question" : "all-at-once")}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4" />
                <p className="font-medium">{t("reading.readingTest.showChinese")}</p>
              </div>
              <p className="text-sm text-muted-foreground">{t("reading.readingTest.chineseDesc")}</p>
            </div>
            <Switch
              checked={testShowChinese}
              onCheckedChange={setTestShowChinese}
            />
          </div>

          <div className="text-center">
            {testCompleted ? (
              <>
                <div className="flex flex-col gap-3 items-center">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-muted-foreground">
                      {t("reading.readingTest.completedTip")}
                    </p>
                    <Button onClick={() => generateReadingTest()} disabled={isGenerating} size="lg">
                      {isGenerating ? (
                        <>
                          <LoaderCircle className="h-5 w-5 mr-2 animate-spin" />
                          {t("reading.readingTest.generating")}
                        </>
                      ) : (
                        <>
                          <ClipboardCheck className="h-5 w-5 mr-2" />
                          {t("reading.readingTest.generateNew")}
                        </>
                      )}
                    </Button>
                  </div>
                  {missedSkills.length > 0 && (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground">
                        {t("reading.readingTest.practiceMissedSkillsDesc")}
                      </p>
                      <Button 
                        variant="secondary" 
                        onClick={handleTargetedPractice}
                        disabled={isGenerating}
                        size="lg"
                      >
                        {isGenerating ? (
                          <>
                            <LoaderCircle className="h-5 w-5 mr-2 animate-spin" />
                            {t("reading.readingTest.generating")}
                          </>
                        ) : (
                          <>
                            <Target className="h-5 w-5 mr-2" />
                            {t("reading.readingTest.practiceMissedSkills", { count: missedSkills.length })}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-4">
                  {t("reading.readingTest.questionsAvailable", { count: readingTest.length })}
                </p>
                <Button onClick={startTest} size="lg">
                  <ClipboardCheck className="h-5 w-5 mr-2" />
                  {t("reading.readingTest.startTest")}
                </Button>
              </>
            )}
            {testCompleted && testScore > 0 && (
              <div className="flex justify-center mt-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">{t("reading.readingTest.lastScore")}</span>
                  <span className={cn("text-lg font-bold", getScoreColor(testScore))}>
                    {testScore}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (quizState === "completed") {
    return (
      <section className="p-4 border rounded-md mt-4">
        <div className="flex items-center justify-between border-b mb-4">
          <h3 className="font-semibold text-lg leading-10 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            {t("reading.readingTest.title")}
          </h3>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileDown className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("reading.readingTest.downloadWord")}</span>
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => downloadWord(false)}>
                  {t("reading.readingTest.downloadBlank")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadWord(true)}>
                  {t("reading.readingTest.downloadWithAnswers")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={handleReset}
              variant="secondary"
              size="sm"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{t("reading.readingTest.retry")}</span>
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-lg font-medium mb-2">
              {t("reading.readingTest.yourScore")}
            </p>
            <p className={cn("text-4xl font-bold", getScoreColor(testScore))}>
              {testScore}%
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("reading.readingTest.pointsFormat", { earned: testEarnedPoints, total: testTotalPoints })}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {testScore >= 80
                ? t("reading.readingTest.excellent")
                : testScore >= 60
                ? t("reading.readingTest.good")
                : t("reading.readingTest.keepPracticing")}
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4" />
              <h4 className="font-medium">{t("reading.readingTest.skillBreakdown")}</h4>
            </div>
            <div className="space-y-3">
              {Object.entries(skillStats).map(([skill, stats]) => (
                <div key={skill}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{t(`reading.readingTest.skills.${SKILL_LABELS[skill as ReadingTestSkill]}`)}</span>
                    <span className={cn(
                      "font-medium",
                      getScoreColor(Math.round((stats.earned / stats.total) * 100))
                    )}>
                      {stats.correct}/{stats.count} ({Math.round((stats.earned / stats.total) * 100)}%)
                    </span>
                  </div>
                  <Progress value={(stats.earned / stats.total) * 100} className="h-2" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-center flex-wrap">
            <Button variant="outline" onClick={() => setShowReview(!showReview)}>
              <Eye className="h-4 w-4 mr-2" />
              {showReview ? t("reading.readingTest.hideReview") : t("reading.readingTest.reviewAnswers")}
            </Button>
            {missedSkills.length > 0 && (
              <Button 
                variant="secondary" 
                onClick={handleTargetedPractice}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                    {t("reading.readingTest.generating")}
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    {t("reading.readingTest.practiceMissedSkills", { count: missedSkills.length })}
                  </>
                )}
              </Button>
            )}
            {missedQuestions.length > 0 && (
              <Button variant="secondary" onClick={handleRetryMissed}>
                <RotateCcw className="h-4 w-4 mr-2" />
                {t("reading.readingTest.retryMissed", { count: missedQuestions.length })}
              </Button>
            )}
          </div>

          {showReview && (
            <div className="space-y-4 mt-6">
              {readingTest.map((question, index) => renderQuestion(question, index, true))}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (testMode === "question-by-question" && quizState === "in-progress") {
    const currentQuestion = questionsToDisplay[currentQuestionIndex];
    const currentAnswer = currentQuestion?.userAnswer;
    const allAnswered = questionsToDisplay.every((q) => q.userAnswer && q.userAnswer.trim() !== "");

    return (
      <section className="p-4 border rounded-md mt-4">
        <div className="flex items-center justify-between border-b mb-4">
          <h3 className="font-semibold text-lg leading-10 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            {t("reading.readingTest.title")}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTestShowChinese(!testShowChinese)}
            >
              <Languages className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {t("reading.readingTest.question")} {currentQuestionIndex + 1}{" "}
                {t("reading.readingTest.of")} {questionsToDisplay.length}
              </span>
              <span>
                {t("reading.readingTest.pressKey")} →/←
              </span>
            </div>
            <Progress value={((currentQuestionIndex + 1) / questionsToDisplay.length) * 100} className="h-2" />
          </div>

          {currentQuestion && renderQuestion(currentQuestion, currentQuestionIndex, false)}

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={goToPrevious}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("reading.glossary.flashcard.previous")}
            </Button>

            {currentQuestionIndex === questionsToDisplay.length - 1 ? (
              <Button 
                onClick={handleSubmit} 
                disabled={!allAnswered || evaluatingShortAnswer}
              >
                {evaluatingShortAnswer ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                    {t("reading.readingTest.evaluating")}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t("reading.readingTest.submit")}
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={goToNext} disabled={!currentAnswer}>
                {t("reading.glossary.flashcard.next")}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="p-4 border rounded-md mt-4">
      <div className="flex items-center justify-between border-b mb-4">
        <h3 className="font-semibold text-lg leading-10 flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
          {t("reading.readingTest.title")}
        </h3>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTestShowChinese(!testShowChinese)}
          >
            <Languages className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleSubmit}
            size="sm"
            disabled={evaluatingShortAnswer}
          >
            {evaluatingShortAnswer ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span>{t("reading.readingTest.evaluating")}</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>{t("reading.readingTest.submit")}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {questionsToDisplay.map((question, index) => renderQuestion(question, index, false))}
      </div>
    </section>
  );
}

export default ReadingTest;
