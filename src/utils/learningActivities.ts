import type { ReadingStore } from "@/store/reading";

export interface LearningActivity {
  id: string;
  sectionId: string;
  icon: string;
  color: string;
  titleKey: string;
  descriptionKey: string;
}

const ACTIVITY_DEFINITIONS: LearningActivity[] = [
  {
    id: "summary",
    sectionId: "section-summary",
    icon: "FileText",
    color: "blue",
    titleKey: "recommendation.activities.summary.title",
    descriptionKey: "recommendation.activities.summary.description",
  },
  {
    id: "mindmap",
    sectionId: "section-mindmap",
    icon: "Waypoints",
    color: "orange",
    titleKey: "recommendation.activities.mindmap.title",
    descriptionKey: "recommendation.activities.mindmap.description",
  },
  {
    id: "adapted-text",
    sectionId: "section-adapted",
    icon: "BookOpen",
    color: "green",
    titleKey: "recommendation.activities.adaptedText.title",
    descriptionKey: "recommendation.activities.adaptedText.description",
  },
  {
    id: "sentence-analysis",
    sectionId: "section-adapted",
    icon: "Search",
    color: "pink",
    titleKey: "recommendation.activities.sentenceAnalysis.title",
    descriptionKey: "recommendation.activities.sentenceAnalysis.description",
  },
  {
    id: "highlight-words",
    sectionId: "section-adapted",
    icon: "Highlighter",
    color: "yellow",
    titleKey: "recommendation.activities.highlightWords.title",
    descriptionKey: "recommendation.activities.highlightWords.description",
  },
  {
    id: "glossary",
    sectionId: "section-glossary",
    icon: "BookMarked",
    color: "cyan",
    titleKey: "recommendation.activities.glossary.title",
    descriptionKey: "recommendation.activities.glossary.description",
  },
  {
    id: "spelling-game",
    sectionId: "section-glossary",
    icon: "SpellCheck",
    color: "teal",
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
  },
  {
    id: "reading-test",
    sectionId: "section-test",
    icon: "ClipboardCheck",
    color: "indigo",
    titleKey: "recommendation.activities.readingTest.title",
    descriptionKey: "recommendation.activities.readingTest.description",
  },
];

function getActivity(id: string): LearningActivity {
  return ACTIVITY_DEFINITIONS.find((a) => a.id === id)!;
}

export function getIncompleteActivities(
  session: ReadingStore
): LearningActivity[] {
  if (!session.id || !session.extractedText) return [];

  const incomplete: LearningActivity[] = [];

  if (!session.summary) {
    incomplete.push(getActivity("summary"));
  }

  if (!session.mindMap) {
    incomplete.push(getActivity("mindmap"));
  }

  if (!session.adaptedText) {
    incomplete.push(getActivity("adapted-text"));
  }

  if (Object.keys(session.analyzedSentences).length === 0) {
    incomplete.push(getActivity("sentence-analysis"));
  }

  if (session.highlightedWords.length === 0) {
    incomplete.push(getActivity("highlight-words"));
  }

  if (session.glossary.length === 0) {
    incomplete.push(getActivity("glossary"));
  }

  if (session.glossary.length > 0 && session.spellingGameBestScore === 0) {
    incomplete.push(getActivity("spelling-game"));
  }

  if (session.glossary.length > 0 && session.vocabularyQuizScore === 0) {
    incomplete.push(getActivity("vocab-quiz"));
  }

  if (session.readingTest.length > 0 && !session.testCompleted) {
    incomplete.push(getActivity("reading-test"));
  } else if (session.readingTest.length === 0) {
    incomplete.push(getActivity("reading-test"));
  }

  return incomplete;
}

export function pickRecommendedActivity(
  session: ReadingStore
): LearningActivity | null {
  const incomplete = getIncompleteActivities(session);
  if (incomplete.length === 0) return null;
  return incomplete[Math.floor(Math.random() * incomplete.length)];
}
