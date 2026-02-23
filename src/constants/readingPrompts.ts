export const systemInstruction = `You are an expert English reading teacher for Hong Kong primary and secondary school students. Today is {now}. Follow these instructions:

- Adapt your language and explanations to be appropriate for the student's age.
- Use clear, simple English that students can understand.
- When providing Chinese translations, use Traditional Chinese (繁體中文).
- Be encouraging and supportive in your explanations.`;

export const outputGuidelinesPrompt = `<OutputGuidelines>

## Typographical rules

Follow these rules to organize your output:

- **Title:** Use \`#\` to create article title.
- **Headings:** Use \`##\` through \`######\` to create headings of different levels.
- **Paragraphs:** Use blank lines to separate paragraphs.
- **Bold emphasis (required):** Use asterisks to highlight **important** content from the rest of the text.
- **Links:** Use \`[link text](URL)\` to insert links.
- **Lists:**
    - **Unordered lists:** Use \`*\`, \`-\`, or \`+\` followed by a space.
    - **Ordered lists:** Use \`1.\`, \`2.\`, etc., and a period.
* **Code:**
    - **Inline code:** Enclose it in backticks (\` \`).
    - **Code blocks:** Enclose it in triple backticks (\`\`\` \`\`\`), optionally in a language.
- **Quotes:** Use the \`>\` symbol.
- **Horizontal rule:** Use \`---\`, \`***\` or \`___\`.
- **Table**: Use basic GFM table syntax.
</OutputGuidelines>`;

export function extractTextFromImagePrompt() {
  return `Extract all text from this image.

**Instructions:**
- Preserve the original paragraph structure and formatting exactly.
- If the text is unclear, make your best guess.
- Do not add any commentary or explanations.
- Respond with ONLY the extracted text.`;
}

export function generateSummaryPrompt(age: number, text: string) {
  const schoolLevel = age <= 11 ? "primary" : "secondary";
  return `You are helping a ${age}-year-old Hong Kong ${schoolLevel} student understand a text.

<text>
${text}
</text>

Write a brief summary (3-5 sentences) that captures the main ideas.

**Guidelines:**
- Use simple vocabulary appropriate for a ${age}-year-old student.
- Focus on the key points and general ideas.
- Keep the same language as the original text.
- Be concise but informative.

**Respond with ONLY the summary, no additional text.**`;
}

export function adaptTextPrompt(age: number, text: string) {
  const schoolLevel = age <= 11 ? "primary" : "secondary";
  return `You are adapting an English text for a ${age}-year-old Hong Kong ${schoolLevel} student.

<original-text>
${text}
</original-text>

Rewrite this text to match the student's English level.

**CRITICAL REQUIREMENTS:**
- **Preserve the exact same paragraph structure** - same number of paragraphs in the same order.
- **Do not merge, split, or rearrange paragraphs.**
- Simplify complex vocabulary to age-appropriate words.
- Break long sentences into shorter, clearer ones.
- Keep the same meaning and key information.
- Use the same language as the original text.

**Respond with ONLY the adapted text, maintaining the paragraph structure.**`;
}

export function simplifyTextPrompt(age: number, text: string) {
  const schoolLevel = age <= 11 ? "primary" : "secondary";
  return `You are simplifying a text even further for a ${age}-year-old Hong Kong ${schoolLevel} student who needs extra help understanding. The text may have already been simplified before.

<text>
${text}
</text>

Make this text even simpler while preserving its core meaning.

**CRITICAL REQUIREMENTS:**
- **Preserve the exact same paragraph structure.**
- **Do not merge, split, or rearrange paragraphs.**
- Use the simplest possible vocabulary (basic English words).
- Make sentences very short and clear (6-10 words max per sentence).
- Replace difficult words with easier synonyms.
- Add brief explanations in parentheses for any remaining complex concepts and vocabulary.
- Use simple sentence structures (subject-verb-object).
- Keep the same meaning but make it extremely easy to read.

**Respond with ONLY the simplified text.**`;
}

export function generateMindMapPrompt(age: number, text: string) {
  const schoolLevel = age <= 11 ? "primary" : "secondary";
  return `Create a mind map for this text to help a ${age}-year-old Hong Kong ${schoolLevel} student visualize and connect the main ideas.

<text>
${text}
</text>

Generate a Mermaid mindmap diagram using the following format:

\`\`\`mermaid
mindmap
  root((Main Topic))
    Branch1
      Sub-topic1
      Sub-topic2
    Branch2
      Sub-topic1
      Sub-topic2
\`\`\`

**Requirements:**
1. Use the \`mindmap\` diagram type.
2. Start with the main topic as the root (in a circle).
3. Include 3-5 main branches for key themes or sections.
4. Each branch should have 2-4 sub-topics.
5. Keep text concise (max 5-6 words per node).
6. Use the same language as the original text.

**Respond with ONLY the Mermaid code block, no additional text.**`;
}

export function generateReadingTestPrompt(text: string, age: number) {
  const schoolLevel = age <= 11 ? "primary" : age <= 15 ? "secondary" : "dse";
  const difficultyLevel = age <= 11 ? "foundation" : age <= 15 ? "intermediate" : "advanced";
  
  const questionDistribution = {
    primary: {
      multipleChoice: 4,
      trueFalseNotGiven: 2,
      vocabContext: 2,
      referencing: 1,
      shortAnswer: 1,
    },
    secondary: {
      multipleChoice: 2,
      trueFalseNotGiven: 2,
      vocabContext: 2,
      inference: 2,
      referencing: 1,
      shortAnswer: 1,
    },
    dse: {
      multipleChoice: 2,
      trueFalseNotGiven: 1,
      vocabContext: 2,
      inference: 3,
      referencing: 1,
      shortAnswer: 1,
    },
  };

  return `Create a reading comprehension test for a ${age}-year-old Hong Kong ${schoolLevel} student based on this text.

<text>
${text}
</text>

Generate 10 questions in JSON format. You MUST respond with ONLY a valid JSON array, no markdown code blocks, no additional text.

[
  {
    "id": "q1",
    "type": "multiple-choice",
    "question": "Question text here?",
    "questionZh": "問題中文翻譯",
    "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
    "optionsZh": ["A) 第一個選項", "B) 第二個選項", "C) 第三個選項", "D) 第四個選項"],
    "correctAnswer": "A",
    "explanation": "Brief explanation in English",
    "explanationZh": "簡短中文解釋",
    "skillTested": "detail",
    "paragraphRef": 1,
    "difficultyLevel": "${difficultyLevel}",
    "points": 1
  },
  {
    "id": "q2",
    "type": "true-false-not-given",
    "question": "Statement to evaluate against the text",
    "questionZh": "需要判斷的陳述",
    "options": ["True", "False", "Not Given"],
    "correctAnswer": "True",
    "explanation": "Why this is True/False/Not Given with text reference",
    "explanationZh": "中文解釋為何是True/False/Not Given",
    "skillTested": "detail",
    "paragraphRef": 2,
    "difficultyLevel": "${difficultyLevel}",
    "points": 1
  },
  {
    "id": "q3",
    "type": "inference",
    "question": "What can we infer from paragraph X?",
    "questionZh": "我們可以從第X段推斷出什麼？",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "optionsZh": ["A) 選項一", "B) 選項二", "C) 選項三", "D) 選項四"],
    "correctAnswer": "B",
    "explanation": "Explanation of the inference",
    "explanationZh": "推論解釋",
    "skillTested": "inference",
    "paragraphRef": 3,
    "difficultyLevel": "${difficultyLevel}",
    "points": 2
  },
  {
    "id": "q4",
    "type": "vocab-context",
    "question": "In paragraph X, what does the word '___' most likely mean?",
    "questionZh": "在第X段，'___'這個詞最可能是什麼意思？",
    "options": ["A) Meaning 1", "B) Meaning 2", "C) Meaning 3", "D) Meaning 4"],
    "optionsZh": ["A) 意思一", "B) 意思二", "C) 意思三", "D) 意思四"],
    "correctAnswer": "C",
    "explanation": "Explanation using context clues",
    "explanationZh": "根據上下文的解釋",
    "skillTested": "vocabulary",
    "paragraphRef": 2,
    "difficultyLevel": "${difficultyLevel}",
    "points": 1
  },
  {
    "id": "q5",
    "type": "referencing",
    "question": "What does 'they' in line X refer to?",
    "questionZh": "第X行的'they'指的是什麼？",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "optionsZh": ["A) 選項一", "B) 選項二", "C) 選項三", "D) 選項四"],
    "correctAnswer": "A",
    "explanation": "What the pronoun/phrase refers to in context",
    "explanationZh": "該代詞/短語在上下文中指的是什麼",
    "skillTested": "detail",
    "paragraphRef": 2,
    "difficultyLevel": "${difficultyLevel}",
    "points": 1
  },
  {
    "id": "q6",
    "type": "short-answer",
    "question": "Open-ended question requiring 2-3 sentences",
    "questionZh": "需要2-3句回答的開放式問題",
    "correctAnswer": "Key points that must be included: point 1, point 2, point 3",
    "explanation": "What a good answer should include",
    "explanationZh": "好的答案應該包含什麼",
    "skillTested": "main-idea",
    "difficultyLevel": "${difficultyLevel}",
    "points": 3
  }
]

**Question Distribution for this student (${age} years old, ${schoolLevel}):**
${JSON.stringify(questionDistribution[schoolLevel], null, 2)}

**Guidelines:**
- Questions should test comprehension, not just memory.
- Use age-appropriate language.
- Make questions clear and unambiguous.
- For multiple-choice, ensure only one answer is clearly correct.
- For true-false-not-given: 
  - "True" = statement agrees with the text
  - "False" = statement contradicts the text  
  - "Not Given" = text does not provide enough information
- For vocabulary-in-context: choose words that can be understood from surrounding text.
- For inference questions: answer should be logically deducible but not explicitly stated.
- For referencing questions:
  - Identify pronouns (it, they, them, this, that, these, those, he, she, etc.)
  - Or noun phrases with definite articles that refer to previously mentioned concepts
  - Ask what the word/phrase refers to in the surrounding context
  - Options should be noun phrases from the text
  - Choose words where the reference is clear from context but requires careful reading
- For short-answer: provide key points that must be mentioned, comma-separated
- Include ALL required metadata fields for each question.
- paragraphRef should be 1-indexed (first paragraph = 1).
- Points: MC/TFNG/Vocab/Referencing = 1, Inference = 2, Short-answer = 3.
- Chinese translations (questionZh, optionsZh, explanationZh) are REQUIRED for all questions.
- Use Traditional Chinese (繁體中文) for all Chinese text.

**Respond with ONLY the JSON array, no markdown, no code blocks.**`;
}

export function generateTargetedPracticePrompt(
  text: string, 
  age: number, 
  missedSkills: ReadingTestSkill[]
) {
  const schoolLevel = age <= 11 ? "primary" : age <= 15 ? "secondary" : "dse";
  const difficultyLevel = age <= 11 ? "foundation" : age <= 15 ? "intermediate" : "advanced";
  
  const questionCount = Math.min(10, Math.max(5, missedSkills.length * 2));
  const questionsPerSkill = Math.ceil(questionCount / missedSkills.length);
  
  const skillDescriptions: Record<ReadingTestSkill, string> = {
    "main-idea": "questions testing understanding of the main idea or central theme",
    "detail": "questions testing comprehension of specific details or pronoun references",
    "inference": "questions requiring logical inference from the text",
    "vocabulary": "questions testing understanding of vocabulary in context",
    "purpose": "questions about the author's purpose or intent",
    "sequencing": "questions about the order of events or ideas"
  };

  const skillQuestionTypes: Record<ReadingTestSkill, string[]> = {
    "main-idea": ["multiple-choice", "short-answer"],
    "detail": ["multiple-choice", "true-false-not-given", "referencing"],
    "inference": ["inference", "multiple-choice"],
    "vocabulary": ["vocab-context"],
    "purpose": ["inference", "multiple-choice"],
    "sequencing": ["multiple-choice"]
  };

  return `Create ${questionCount} targeted practice questions for a ${age}-year-old Hong Kong ${schoolLevel} student.

The student needs more practice in these specific skills (generate ${questionsPerSkill} questions for each skill):
${missedSkills.map(s => `- ${s}: ${skillDescriptions[s]}`).join("\n")}

<text>
${text}
</text>

Generate ${questionCount} questions focusing ONLY on the skills listed above. You MUST respond with ONLY a valid JSON array, no markdown code blocks, no additional text.

[
  {
    "id": "q1",
    "type": "multiple-choice",
    "question": "Question text here?",
    "questionZh": "問題中文翻譯",
    "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
    "optionsZh": ["A) 第一個選項", "B) 第二個選項", "C) 第三個選項", "D) 第四個選項"],
    "correctAnswer": "A",
    "explanation": "Brief explanation in English",
    "explanationZh": "簡短中文解釋",
    "skillTested": "detail",
    "paragraphRef": 1,
    "difficultyLevel": "${difficultyLevel}",
    "points": 1
  }
]

**Question Type to Skill Mapping:**
${Object.entries(skillQuestionTypes).map(([skill, types]) => `- ${skill}: use ${types.join(" or ")}`).join("\n")}

**Guidelines:**
- Distribute questions evenly across the missed skills
- Use age-appropriate language
- Make questions clear and unambiguous
- For true-false-not-given: "True", "False", or "Not Given"
- For referencing: ask what a pronoun or phrase refers to
- For vocabulary-in-context: choose words understandable from surrounding text
- For inference: answer should be logically deducible but not explicitly stated
- Include ALL required metadata fields
- paragraphRef should be 1-indexed
- Points: MC/TFNG/Vocab/Referencing = 1, Inference = 2, Short-answer = 3
- Chinese translations (questionZh, optionsZh, explanationZh) are REQUIRED
- Use Traditional Chinese (繁體中文) for all Chinese text

**Respond with ONLY the JSON array, no markdown, no code blocks.**`;
}

export function generateGlossaryPrompt(text: string, highlightedWords: string[]) {
  return `Create a bilingual glossary for these highlighted words from the text.

<text>
${text}
</text>

<highlighted-words>
${highlightedWords.join(", ")}
</highlighted-words>

For each word, provide a bilingual glossary entry. You MUST respond with ONLY a valid JSON array, no markdown code blocks, no additional text.

[
  {
    "word": "example",
    "partOfSpeech": "noun",
    "englishDefinition": "A clear, simple English definition appropriate for students",
    "chineseDefinition": "繁體中文解釋",
    "example": "A simple example sentence using the word in context"
  }
]

**Requirements:**
- Part of speech should be: noun, verb, adjective, adverb, preposition, conjunction, interjection, pronoun, or phrase.
- English definitions should be simple and clear for students.
- Chinese translations MUST be in Traditional Chinese (繁體中文), not Simplified.
- Examples should be relevant and easy to understand.
- Include ALL highlighted words in the response.
- Maintain the same order as the highlighted words list.

**Respond with ONLY the JSON array, no markdown, no code blocks.`;
}

export function analyzeSentencePrompt(age: number, sentence: string, context: string) {
  const schoolLevel = age <= 11 ? "primary" : "secondary";
  return `You are an expert English language teacher specializing in helping Hong Kong students learn English as a foreign language.

<Student Profile>
- Age: ${age} years old
- Education level: ${schoolLevel} school student
- Target: English reading comprehension support
</Student Profile>

<Selected Sentence>
${sentence}
</Selected Sentence>

<Surrounding Context>
${context}
</Surrounding Context>

Analyze why this sentence might be difficult for this student to understand. Structure your response in Traditional Chinese (繁體中文) as follows:

**${sentence}**

## 句意概要
[Brief explanation of what the sentence means in simple terms - 1-2 sentences]

## 詞彙分析
- **難詞**: [Identify 2-4 challenging vocabulary words from the sentence]
- **解釋**: [Provide simple definitions - English + Traditional Chinese]
- **用法示例**: [One simple example sentence for each difficult word]

## 句法分析
- **句子結構**: [Identify the sentence type: simple/compound/complex]
- **主要從句**: [Break down the main clause components: subject, verb, object]
- **難點解析**: [Explain any tricky grammatical structures, e.g., passive voice, inverted word order, relative clauses, participial phrases]

## 語用分析
- **語境功能**: [What is the sentence doing? Describing, arguing, contrasting, expressing emotion, etc.]
- **修辭手法**: [Any figures of speech? Metaphor, simile, personification, hyperbole, etc. If none, say "無特殊修辭手法"]
- **語氣語調**: [Formal/informal, factual/emotional, objective/subjective, etc.]

## 學習建議
[2-3 practical tips for understanding similar sentences in the future - make them actionable and age-appropriate]

Keep explanations age-appropriate and use clear, simple language throughout. Respond entirely in Traditional Chinese (繁體中文).`;
}

export function getSystemPrompt(): string {
  return systemInstruction.replace("{now}", new Date().toLocaleDateString());
}
