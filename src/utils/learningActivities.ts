import type { ReadingStore } from "@/store/reading";

export interface LearningActivity {
  id: string;
  sectionId: string;
  icon: string;
  color: string;
  titleKey: string;
  descriptionKey: string;
  priority: number;
}

const ACTIVITY_DEFINITIONS: LearningActivity[] = [
  {
    id: "reading-test",
    sectionId: "section-test",
    icon: "ClipboardCheck",
    color: "indigo",
    titleKey: "recommendation.activities.readingTest.title",
    descriptionKey: "recommendation.activities.readingTest.description",
    priority: 1,
  },
  {
    id: "spelling-game",
    sectionId: "section-glossary",
    icon: "SpellCheck",
    color: "teal",
    priority: 2,
    titleKey: "recommendation.activities.spellingGame.title",
    descriptionKey: "recommendation.activities.spellingGame.description",
  },
  {
    id: "vocab-quiz",
    sectionId: "section-glossary",
    icon: "Brain",
    color: "purple",
    titleKey: "recommendation.activities.vocabQuiz.title",
    descriptionKey: "recommendation.activities.vocabQuiz.description",
    priority: 3,
  },
  {
    id: "mindmap",
    sectionId: "section-mindmap",
    icon: "Waypoints",
    color: "orange",
    titleKey: "recommendation.activities.mindmap.title",
    descriptionKey: "recommendation.activities.mindmap.description",
    priority: 4,
  },
  {
    id: "summary",
    sectionId: "section-summary",
    icon: "FileText",
    color: "blue",
    titleKey: "recommendation.activities.summary.title",
    descriptionKey: "recommendation.activities.summary.description",
    priority: 5,
  },
  {
    id: "adapted-text",
    sectionId: "section-adapted",
    icon: "BookOpen",
    color: "green",
    titleKey: "recommendation.activities.adaptedText.title",
    descriptionKey: "recommendation.activities.adaptedText.description",
    priority: 6,
  },
  {
    id: "glossary",
    sectionId: "section-glossary",
    icon: "BookMarked",
    color: "cyan",
    titleKey: "recommendation.activities.glossary.title",
    descriptionKey: "recommendation.activities.glossary.description",
    priority: 7,
  },
];

export function getIncompleteActivities(
  session: ReadingStore
): LearningActivity[] {
  if (!session.id || !session.extractedText) return [];

  const incomplete: LearningActivity[] = [];

  if (session.readingTest.length > 0 && !session.testCompleted) {
    incomplete.push(ACTIVITY_DEFINITIONS.find((a) => a.id === "reading-test")!);
  }

  if (session.glossary.length > 0 && session.spellingGameBestScore === 0) {
    incomplete.push(
      ACTIVITY_DEFINITIONS.find((a) => a.id === "spelling-game")!
    );
  }

  if (session.glossary.length > 0 && session.vocabularyQuizScore === 0) {
    incomplete.push(ACTIVITY_DEFINITIONS.find((a) => a.id === "vocab-quiz")!);
  }

  if (!session.mindMap) {
    incomplete.push(ACTIVITY_DEFINITIONS.find((a) => a.id === "mindmap")!);
  }

  if (!session.summary) {
    incomplete.push(ACTIVITY_DEFINITIONS.find((a) => a.id === "summary")!);
  }

  if (!session.adaptedText) {
    incomplete.push(
      ACTIVITY_DEFINITIONS.find((a) => a.id === "adapted-text")!
    );
  }

  if (session.glossary.length === 0) {
    incomplete.push(ACTIVITY_DEFINITIONS.find((a) => a.id === "glossary")!);
  }

  return incomplete.sort((a, b) => a.priority - b.priority);
}

export function pickRecommendedActivity(
  session: ReadingStore
): LearningActivity | null {
  const incomplete = getIncompleteActivities(session);
  if (incomplete.length === 0) return null;
  return incomplete[0];
}
