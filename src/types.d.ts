interface ImageSource {
  url: string;
  description?: string;
}

interface ReadingTestQuestion {
  id: string;
  type: "multiple-choice" | "true-false" | "short-answer";
  question: string;
  options?: string[];
  correctAnswer: string;
  userAnswer?: string;
  explanation?: string;
}

interface GlossaryEntry {
  word: string;
  englishDefinition: string;
  chineseDefinition: string;
  example?: string;
}

interface ReadingSession {
  id: string;
  title: string;
  studentAge: number;
  originalImage?: string;
  extractedText: string;
  summary: string;
  adaptedText: string;
  simplifiedText: string;
  highlightedWords: string[];
  mindMap: string;
  readingTest: ReadingTestQuestion[];
  glossary: GlossaryEntry[];
  testScore?: number;
  testCompleted?: boolean;
  createdAt: number;
  updatedAt: number;
}

interface PartialJson {
  value: JSONValue | undefined;
  state:
    | "undefined-input"
    | "successful-parse"
    | "repaired-parse"
    | "failed-parse";
}
