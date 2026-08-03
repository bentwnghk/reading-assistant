import i18next from "i18next";

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
- Preserve the original title exactly.
- Preserve the original paragraph structure and formatting exactly.
- **Remove all line numbers (e.g., 1, 5, 10) alongside the left margin** - do not include them in the extracted text.
- **Preserve the original paragraph numbers (e.g., [1], [2], [3]) as is** - do not remove them.
- If the text is unclear, make your best guess.
- Do not add any commentary or explanations.
- Respond with ONLY the extracted text.`;
}

export function generateSummaryPrompt(age: number, text: string) {
  const schoolLevel = age <= 11 ? "primary" : "secondary";
  
  const levelGuidance = age <= 11 ? `
**For Primary Students (ages 8-11):**
- Use very simple sentences (8-12 words max per sentence)
- Include 1-2 relevant emojis per bullet point
- Use friendly words like "story," "character," "happened"
- Connect to things students know (school, family, friends, daily life)
- Make it feel like telling a friend about something interesting
- Keep vocabulary very basic - avoid difficult words
` : age <= 15 ? `
**For Junior Secondary Students (ages 12-15):**
- Use clear, direct sentences (10-15 words average)
- Include 1 emoji per bullet point
- Focus on main themes, events, and character actions
- Be concise but capture important details
- Use moderate vocabulary with simple explanations when needed
` : `
**For Senior Secondary/DSE Students (ages 16-18):**
- Use sophisticated but clear language
- Include minimal emojis (1-2 total, optional)
- Focus on themes, arguments, perspectives, and deeper insights
- Capture nuance and complexity
- Use academic vocabulary appropriately
`;

  return `You are helping a ${age}-year-old Hong Kong ${schoolLevel} student understand a text. Create an engaging, accessible summary with a clear structure.

<text>
${text}
</text>

**REQUIRED STRUCTURE - Follow this exact format:**

## 🎯 TL;DR
[Write ONE super simple sentence (10-15 words max) that captures the MAIN idea. This is for students who find reading difficult. Make it the simplest possible explanation.]

## 📝 Main Points
[3-5 bullet points with emojis. Each bullet should be ONE clear sentence.]

• [emoji] [First main point]
• [emoji] [Second main point]
• [emoji] [Third main point]
• [emoji] [Fourth main point - if needed]
• [emoji] [Fifth main point - if needed]

${levelGuidance}

**CRITICAL FORMATTING RULES:**
- Use exactly the markdown headers (##) as shown above
- Use bullet points (•) for all lists - NOT dashes or asterisks
- Add relevant emojis: 📖🎯📝⭐💭🌟📌🏠👥❤️🎓🌍🎭💪🏆🌈
- **Bold** key terms inline using double asterisks
- Keep the same language as the original text for the main content
- Make sure TL;DR is truly the simplest possible summary

**Respond with ONLY the formatted summary, no introduction or additional text.**`;
}

export function adaptTextPrompt(age: number, text: string) {
  const schoolLevel = age <= 11 ? "primary" : "secondary";
  return `You are adapting an English text for a ${age}-year-old Hong Kong ${schoolLevel} student.

<original-text>
${text}
</original-text>

Rewrite this text to match the student's English level.

**CRITICAL REQUIREMENTS:**
- **Preserve the exact same title.**
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
- **Preserve the exact same title.**
- **Preserve the exact same paragraph structure** - same number of paragraphs in the same order.
- **Do not merge, split, or rearrange paragraphs.**
- Use the simplest possible vocabulary (basic English words).
- Make sentences very short and clear (6-10 words max per sentence).
- Replace difficult words with easier synonyms.
- Add brief explanations in parentheses for any remaining complex concepts and vocabulary.
- Use simple sentence structures (subject-verb-object).
- Keep the same meaning but make it extremely easy to read.

  **Respond with ONLY the simplified text, maintaining the paragraph structure.**`;
}

export function extractTitleFromTextPrompt(text: string): string {
  return `Read the text below and identify its ACTUAL title — the real title the author or publisher gave the passage, exactly as it appears in the text itself.

Return ONLY the title text and nothing else (no explanation, no quotation marks, no trailing period that is not part of the title). If there is no real title, return an empty string.

Strict rules:
- Labels and identifiers are NOT titles. NEVER return any of these as the title: "Part A", "Part B", "Part 1", "Text 1", "Text 2", "Reading Passage 1", "Passage A", "Section A", "Section 1", "Paper 1", "Question 1", or any similar Part/Text/Section/Passage/Paper/Question label — even if it appears at the very top of the text.
- Do NOT return the author's name, a date, a page number, a rubric, or reading instructions.
- Do NOT invent, paraphrase, summarize, or generate a title. Only return a title that literally appears in the text.
- If the text begins with a real title as its heading (a short, title-like line at or near the top that is NOT one of the labels listed above), return that heading exactly as written.
- If the text has NO real title (only labels like "Text 1", or it goes straight into body content with no heading), return an empty string.

<text>
${text}
</text>`;
}

export function generatePreReadingPrompt(age: number, text: string, title?: string): string {
  const schoolLevel = age <= 11 ? "primary" : "secondary";
  const titleLine = title ? `\nThe text's title is: "${title}"` : "";
  return `You are preparing a ${age}-year-old Hong Kong ${schoolLevel} student to read an English text. The student has NOT read the text yet. Generate pre-reading scaffolding that activates prior knowledge, sets a purpose for reading, pre-teaches the few words that would otherwise BLOCK comprehension, and supplies essential background — WITHOUT revealing the text's content, events, argument, or conclusions.

<text>
${text}
</text>${titleLine}

**YOUR TASK — produce this exact JSON shape (and NOTHING else):**
{
  "activationPrompts": ["...", "..."],
  "activationPromptZh": ["...", "..."],
  "predictionPrompt": "...",
  "purpose": "...",
  "purposeZh": "...",
  "preTeachWords": [
    {"word":"...","syllabification":"...","partOfSpeech":"...","englishDefinition":"...","chineseDefinition":"..."}
  ],
  "backgroundNote": "...",
  "backgroundNoteZh": "..."
}

**FIELD RULES:**
- "activationPrompts": 2-3 short questions (in English) that connect the TOPIC to the student's own life or existing knowledge. Do NOT ask about the text's specific content or outcome.
- "activationPromptZh": optional Traditional Chinese (繁體中文) one-line hook per English prompt, to help weaker students engage. May be omitted entirely if the English is simple enough.
- "predictionPrompt": ONE question that invites the student to GUESS what the text will be about, based on what they can SKIM (the title, any headings, and the first/last paragraphs) — never reveal the answer. Prediction is a skimming skill, so the prompt must NOT ask the student to guess from the title alone.
- "purpose": ONE sentence starting "Read to find out..." that gives the student a clear reason to read.
- "purposeZh": optional Traditional Chinese (繁體中文) translation of "purpose", to help weaker students engage. May be omitted entirely if the English is simple enough.
- "preTeachWords": 5-8 words/phrases whose meaning is essential to understanding the text (the ~90-95% coverage principle). For each: a concise English definition a ${age}-year-old can grasp, the part of speech, and a Traditional Chinese (繁體中文) gloss in "chineseDefinition". Include syllabification (use · between syllables, uppercase the stressed syllable, e.g. "im·POR·tant"). Do NOT include trivial words the student already knows.
- "backgroundNote": 1-2 sentences on cultural/contextual knowledge the text ASSUMES but a Hong Kong student may lack (e.g. a holiday, an institution, a historical event). If none is needed, return an empty string.
- "backgroundNoteZh": optional Traditional Chinese (繁體中文) translation of "backgroundNote". If "backgroundNote" is empty, omit this field.

**CRITICAL:** Do not state the text's main idea, summary, findings, plot, or conclusion anywhere. The student must discover those by reading. Respond with ONLY the JSON object, no markdown fences.`;
}

export function generateCollocationsPrompt(age: number, text: string, glossaryWords: string[]): string {
  const schoolLevel = age <= 11 ? "primary" : "secondary";
  const knownList = glossaryWords.length > 0
    ? `\nWords already covered in the glossary (do NOT repeat these as single words): ${glossaryWords.slice(0, 40).join(", ")}`
    : "";
  return `You are a language teacher analyzing an English text for ${age}-year-old Hong Kong ${schoolLevel} students. Hong Kong learners make many collocation errors due to L1 (Cantonese/Chinese) transfer — roughly half of their phrase-level mistakes come from translating word-for-word from Chinese. Extract the most useful multi-word chunks and collocations from the text.

<text>
${text}
</text>${knownList}

**YOUR TASK — produce a JSON array of objects with this exact shape (and NOTHING else):**
[
  {
    "chunk": "take into account",
    "pattern": "V + N (idiomatic)",
    "meaning": "to consider something when judging a situation",
    "meaningZh": "考慮；把……計算在內",
    "contrastNote": "Cantonese speakers often say 「考慮」 directly; English requires the full chunk 'take into account', NOT 'consider into'.",
    "example": "We must take the cost into account."
  }
]

**EXTRACTION RULES:**
- Extract 6-12 high-value chunks: phrasal verbs, delexicalized-verb collocations (take/make/have/do + noun), adjective+noun pairs, prepositional phrases, idioms, and fixed expressions that appear in (or are relevant to) the text.
- "pattern": a short label (e.g. "Phrasal verb", "V+N", "Adj+N", "Prepositional phrase", "Idiom", "Fixed expression").
- "meaning": concise English meaning a ${age}-year-old can grasp.
- "meaningZh": Traditional Chinese (繁體中文) gloss.
- "contrastNote": FOR CHUNKS WITH A KNOWN CANTONESE-L1 TRANSFER PITFALL, give a short note explaining how a Chinese-speaking learner typically gets it wrong (e.g. wrong preposition, word-for-word translation, missing article). This is the KEY value of this feature — include it whenever a transfer error is common. If the chunk has no notable transfer issue, omit "contrastNote".
- "example": one example sentence (preferably from the text if present, otherwise generated and natural).

**CRITICAL:**
- Focus on chunks, NOT single words already in the glossary.
- Respond with ONLY the JSON array, no markdown fences.`;
}

export function generateMindMapPrompt(age: number, text: string, useChinese: boolean = false) {
  const schoolLevel = age <= 11 ? "primary" : "secondary";
  const languageInstruction = useChinese 
    ? "Use Traditional Chinese (繁體中文) for ALL text in the mind map." 
    : "Use English for ALL text in the mind map.";
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
6. ${languageInstruction}

**Respond with ONLY the Mermaid code block, no additional text.**`;
}

export function getReadingTestPreset(age: number): ReadingTestQuestionCounts {
  const schoolLevel = age <= 11 ? "primary" : age <= 15 ? "secondary" : "dse";
  switch (schoolLevel) {
    case "primary":
      return {
        "multiple-choice": 4,
        "true-false-not-given": 2,
        "inference": 0,
        "vocab-context": 2,
        "referencing": 1,
        "short-answer": 1,
      };
    case "secondary":
      return {
        "multiple-choice": 2,
        "true-false-not-given": 2,
        "inference": 2,
        "vocab-context": 2,
        "referencing": 1,
        "short-answer": 1,
      };
    case "dse":
      return {
        "multiple-choice": 2,
        "true-false-not-given": 1,
        "inference": 3,
        "vocab-context": 2,
        "referencing": 1,
        "short-answer": 1,
      };
  }
}

export function generateReadingTestPrompt(text: string, age: number, questionCounts: ReadingTestQuestionCounts) {
  const schoolLevel = age <= 11 ? "primary" : age <= 15 ? "secondary" : "dse";
  const difficultyLevel = age <= 11 ? "foundation" : age <= 15 ? "intermediate" : "advanced";

  const total = (Object.values(questionCounts) as number[]).reduce((sum, n) => sum + n, 0);

  const distributionLines = [
    `Multiple Choice (type "multiple-choice"): ${questionCounts["multiple-choice"]}`,
    `True/False/Not Given (type "true-false-not-given"): ${questionCounts["true-false-not-given"]}`,
    `Inference (type "inference"): ${questionCounts["inference"]}`,
    `Vocabulary in Context (type "vocab-context"): ${questionCounts["vocab-context"]}`,
    `Pronoun Reference (type "referencing"): ${questionCounts["referencing"]}`,
    `Short Answer (type "short-answer"): ${questionCounts["short-answer"]}`,
  ].join("\n");

  return `Create a reading comprehension test for a ${age}-year-old Hong Kong ${schoolLevel} student based on this text.

<text>
${text}
</text>

Generate exactly ${total} questions in JSON format. You MUST respond with ONLY a valid JSON array, no markdown code blocks, no additional text.

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
    "question": "What can we infer from paragraph [X]?",
    "questionZh": "我們可以從第[X]段推斷出什麼？",
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
    "question": "In paragraph [X], what does the word/phrase '___' most likely mean?",
    "questionZh": "在第[X]段，'___'這個詞／短語最可能是什麼意思？",
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
    "question": "In paragraph [2], what does 'they' refer to in '...they went to the store...'?",
    "questionZh": "在第[2]段，'...they went to the store...'中的'they'指的是什麼？",
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

**Question Distribution for this student (${age} years old, ${schoolLevel}) — TOTAL ${total} questions:**
${distributionLines}

**CRITICAL: You MUST generate EXACTLY the number of questions specified above for each type, summing to exactly ${total} questions. Do NOT generate any questions for a type whose count is 0. The JSON examples below show the required format/schema for each type — they are templates, not a count specification.**

**Guidelines:**
- Questions should test comprehension, not just memory.
- Use age-appropriate language.
- Make questions clear and unambiguous.
- For multiple-choice, ensure only one answer is clearly correct.
- For true-false-not-given: 
  - "True" = statement agrees with the text
  - "False" = statement contradicts the text  
  - "Not Given" = text does not provide enough information
- For vocabulary-in-context: choose words, phrasal verbs, collocations, or idiomatic phrases that can be understood from surrounding text. Include multi-word expressions (e.g. "look forward to", "in spite of") when they are worth testing.
- For inference questions: answer should be logically deducible but not explicitly stated.
- For referencing questions:
  - Identify pronouns (it, they, them, this, that, these, those, he, she, etc.)
  - Or noun phrases with definite articles that refer to previously mentioned concepts
  - Ask what the word/phrase refers to in the surrounding context
  - Options should be noun phrases from the text
  - Choose words where the reference is clear from context but requires careful reading
  - **CRITICAL: If the same pronoun appears multiple times in the paragraph, include surrounding context (5-8 words before and after) to uniquely identify which occurrence. Format: "In paragraph [X], what does 'they' refer to in '...they went to the store...'?"**
- For short-answer: provide key points that must be mentioned, comma-separated
- Include ALL required metadata fields for each question.
- **IMPORTANT: When referencing paragraphs in questions, use square-bracketed format (e.g., "paragraph [1]", "paragraph [2]") to match the extracted text. NEVER use line numbers or "line X" references.**
- paragraphRef should be 1-indexed (first paragraph = 1).
- Points: MC/TFNG/Vocab/Referencing = 1, Inference = 2, Short-answer = 3.
- Chinese translations (questionZh, optionsZh, explanationZh) are REQUIRED for all questions.
- Use Traditional Chinese (繁體中文) for all Chinese text.
- **skillTested MUST be one of these exact values: "main-idea", "detail", "inference", "vocabulary", "purpose". No other values are permitted.**

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
    "purpose": "questions about the author's purpose or intent"
  };

  const skillQuestionTypes: Record<ReadingTestSkill, string[]> = {
    "main-idea": ["multiple-choice", "short-answer"],
    "detail": ["multiple-choice", "true-false-not-given", "referencing"],
    "inference": ["inference", "multiple-choice"],
    "vocabulary": ["vocab-context"],
    "purpose": ["inference", "multiple-choice"]
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
- For referencing: 
  - Ask what a pronoun or phrase refers to
  - **If the same pronoun appears multiple times in the paragraph, include surrounding context (5-8 words before and after) to uniquely identify which occurrence. Format: "In paragraph [X], what does 'they' refer to in '...they went to the store...'?"**
- For vocabulary-in-context: choose words, phrasal verbs, collocations, or idiomatic phrases understandable from surrounding text. Include multi-word expressions when worth testing.
- For inference: answer should be logically deducible but not explicitly stated
- Include ALL required metadata fields
- **IMPORTANT: When referencing paragraphs in questions, use square-bracketed format (e.g., "paragraph [1]", "paragraph [2]") to match the extracted text. NEVER use line numbers or "line X" references.**
- paragraphRef should be 1-indexed
- Points: MC/TFNG/Vocab/Referencing = 1, Inference = 2, Short-answer = 3
- Chinese translations (questionZh, optionsZh, explanationZh) are REQUIRED
- Use Traditional Chinese (繁體中文) for all Chinese text
- **skillTested MUST be one of these exact values: "main-idea", "detail", "inference", "vocabulary", "purpose". No other values are permitted.**

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
    "syllabification": "ex·AM·ple",
    "partOfSpeech": "noun",
    "englishDefinition": "A clear, simple English definition appropriate for students",
    "chineseDefinition": "繁體中文解釋",
    "example": "A simple example sentence using the word in context"
  }
]

**Requirements:**
- Syllabification: Break down the word into syllables separated by middle dots (·). Use UPPERCASE to mark the stressed syllable (e.g., "beau·TI·ful", "IM·por·tant", "ex·CEP·tion·al").
- Part of speech should be: noun, verb, adjective, adverb, preposition, conjunction, interjection, pronoun, or phrase.
- English definitions should be simple and clear for students.
- Chinese translations MUST be in Traditional Chinese (繁體中文), not Simplified.
- Examples should be relevant and easy to understand.
- Include ALL highlighted words in the response.
- Maintain the same order as the highlighted words list.

  **Respond with ONLY the JSON array, no markdown, no code blocks.`;
}

export function suggestVocabularyPrompt(age: number, text: string, count: number) {
  const schoolLevel = age <= 11 ? "primary" : age <= 15 ? "junior secondary" : "senior secondary/DSE";

  const levelGuidance = age <= 11 ? `
**For a ${age}-year-old primary student (ages 8-11):**
- The student knows only very common everyday words (A1-A2 level).
- Select challenging SINGLE words that appear in the text and that the student is unlikely to know.
- Do NOT include extremely basic words the student certainly knows (e.g. "the", "go", "big").
` : age <= 15 ? `
**For a ${age}-year-old junior secondary student (ages 12-15):**
- The student knows common everyday and early academic words (up to B1 level).
- Focus on challenging SINGLE words: B2+ vocabulary, abstract concepts, and figurative-language words.
- Do NOT include words a typical 12-15 year old already knows.
` : `
**For a ${age}-year-old senior secondary/DSE student (ages 16-18):**
- The student has solid command of everyday and academic English (up to B2 level).
- Focus on challenging SINGLE words: advanced (C1-C2) vocabulary, low-frequency academic words, and nuanced single-word terms.
- Do NOT include words a typical senior secondary student already knows.
`;

  return `You are an expert English reading teacher for Hong Kong students. Identify exactly **${count}** single words from the text below that a ${age}-year-old ${schoolLevel} student is unlikely to already know, and that are therefore worth learning.

<text>
${text}
</text>
${levelGuidance}
**Selection rules:**
- Return AT MOST ${count} items. If the text contains fewer than ${count} genuinely challenging items, return fewer — never pad the list with easy words.
- Prefer items in order of their first appearance in the text.
- Each item MUST be copied **verbatim** from the text (same words, same form). Do not lemmatize, inflect, or rephrase.
- **SINGLE WORDS ONLY.** Do NOT include multi-word phrases, collocations, idioms, phrasal verbs, or fixed expressions. If a multi-word expression is worth learning, suggest its single most challenging component word instead, and only if that word itself is worth learning on its own.
- Each item should be distinct and independently worth learning.

**Output format:**
Respond with ONLY a valid JSON array of strings. No markdown, no code blocks, no commentary.

["first item", "second item", "third item"]`;
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

CRITICAL RULES:
- Your response MUST start EXACTLY with the bolded sentence "**${sentence}**" as the very first line.
- Do NOT include any greeting, acknowledgment, preamble, or conversational filler before it (e.g., no "好的", "以下是", "我將分析", etc.).
- Output the analysis sections immediately after the bolded sentence.

Keep explanations age-appropriate and use clear, simple language throughout. Respond entirely in Traditional Chinese (繁體中文).`;
}

export function readingTutorSystemPrompt(age: number, text: string, useChinese: boolean = false) {
  const schoolLevel = age <= 11 ? "primary" : "secondary";
  const languageInstruction = useChinese
    ? "Always respond in Traditional Chinese (繁體中文), regardless of the language the student uses or the language of the reading text above. Use clear, age-appropriate Traditional Chinese in every reply."
    : "Always respond in English, regardless of the language the student uses or the language of the reading text above. Use clear, age-appropriate English in every reply.";

  return `You are a patient and encouraging English reading tutor helping a ${age}-year-old Hong Kong ${schoolLevel} school student.

<reading-text>
${text.slice(0, 8000)}
</reading-text>

**Your Teaching Approach:**
- Use Socratic questioning: guide students to discover answers through thoughtful questions rather than telling them directly
- Adapt your language complexity to match a ${age}-year-old's comprehension level
- Be warm, encouraging, and supportive in every interaction
- When the student seems stuck after 2-3 hints, provide the answer gently with a clear explanation
- Use examples from the text when relevant
- Keep responses concise but helpful (2-4 sentences typically)

**Response Guidelines:**
1. If asked about vocabulary: explain in simple terms, give an example, relate to the text
2. If asked about meaning: ask guiding questions first, then explain
3. If asked for help: break down the problem into smaller steps
4. Always encourage effort and curiosity
5. Use emojis sparingly to keep a friendly tone (1-2 max per response)

**Staying On-Topic (IMPORTANT):**
- Your role is to help the student understand THIS reading text above
- If the student asks a question completely unrelated to the reading text, politely redirect them
- Say something like: "That's an interesting question! But let's focus on our reading text first. Is there anything about the text you'd like to explore?"
- If the student uploads an image, check if it relates to the reading (e.g., a screenshot of the text, a question related to the text, a related diagram, or vocabulary illustration)
- For unrelated images, politely say: "I see you've shared an image. Could you tell me how it relates to our reading text? I'm here to help you understand the passage above."
- You may briefly acknowledge off-topic questions but always gently guide back to the reading

**Language (IMPORTANT):**
- ${languageInstruction}

Remember: Your goal is to help the student understand and learn from THIS text, not just to give answers.`;
}

export function analyzeGrammarTopicsPrompt(age: number, text: string) {
  const schoolLevel = age <= 11 ? "primary" : age <= 15 ? "secondary" : "dse";
  const maxTopics = age <= 11 ? 4 : age <= 15 ? 6 : 8;

  return `Analyze the following English text and identify the most notable grammar structures that a ${age}-year-old Hong Kong ${schoolLevel} student could learn from.

<text>
${text}
</text>

Identify ${maxTopics} notable grammar topics present in this text. For each topic, provide a detailed analysis. You MUST respond with ONLY a valid JSON array, no markdown code blocks, no additional text.

[
  {
    "id": "g1",
    "name": "Present Perfect Tense",
    "nameZh": "現在完成式",
    "category": "tenses",
    "cefrLevel": "A2",
    "explanation": "Clear, age-appropriate English explanation of what this grammar structure is and when to use it. 2-3 sentences.",
    "explanationZh": "繁體中文解釋，2-3句",
    "pattern": "Subject + has/have + Past Participle",
    "examples": [
      { "sentence": "An actual sentence from the text demonstrating this grammar.", "source": "text" },
      { "sentence": "An additional example sentence not from the text.", "source": "generated" }
    ],
    "commonMistakes": "Common mistakes Hong Kong students make with this grammar point. 1-2 sentences.",
    "commonMistakesZh": "香港學生常犯的錯誤，1-2句",
    "occurrences": 3,
    "textSentences": ["Full sentence from the text showing this grammar structure", "Another full sentence from the text"]
  }
]

**Category values MUST be one of:**
"tenses", "conditionals", "passive-voice", "relative-clauses", "reported-speech", "modal-verbs", "articles", "prepositions", "conjunctions", "comparisons", "infinitives-gerunds", "subjunctive", "clause-structure", "other"

**CEFR level values MUST be one of:** "A1", "A2", "B1", "B2", "C1", "C2"

**Guidelines:**
- Prioritize grammar structures that are: (1) actually present in the text, (2) educational for the student's age level, (3) varied across categories
- All textSentences MUST be exact quotes from the text above
- Examples with source "text" MUST use sentences from the text; source "generated" should be original examples
- English explanations should use simple language appropriate for the student's age
- Chinese translations MUST be in Traditional Chinese (繁體中文)
- Pattern should be a simplified formula showing the structure
- Common mistakes should be specific to Hong Kong students learning English
- occurrences should count how many times this grammar structure appears in the text
- ${age <= 11 ? "Focus on basic grammar: simple tenses, articles, basic prepositions, simple conjunctions, subject-verb agreement" : age <= 15 ? "Include intermediate grammar: perfect tenses, conditionals, passive voice, relative clauses, modal verbs" : "Include advanced grammar: complex conditionals, subjunctive, advanced clause structures, reported speech, infinitive/gerund distinctions"}

**Respond with ONLY the JSON array, no markdown, no code blocks.**`;
}

export function generateGrammarLessonPrompt(topic: GrammarTopic, text: string, age: number) {
  const schoolLevel = age <= 11 ? "primary" : age <= 15 ? "secondary" : "dse";
  return `Create a detailed, age-appropriate "full lesson" for ONE English grammar topic to help a ${age}-year-old Hong Kong ${schoolLevel} student truly understand and master it.

<grammar-topic>
Name: ${topic.name} (${topic.nameZh})
Pattern: ${topic.pattern}
Explanation: ${topic.explanation}
</grammar-topic>

<source-text>
${text}
</source-text>

You MUST respond with ONLY a valid JSON object (no markdown code blocks, no extra text) with EXACTLY this shape:

{
  "whenToUse": "2-3 sentences in English explaining WHEN and WHY we choose this structure (situations, time references, communicative purpose). Age-appropriate.",
  "whenToUseZh": "繁體中文，2-3句",
  "signalWords": ["since", "for", "already", "yet"],
  "forms": {
    "affirmative": "Subject + has/have + past participle  (e.g. She has finished.)",
    "negative": "Subject + has/have + not + past participle  (e.g. She has not finished.)",
    "question": "Has/Have + subject + past participle?  (e.g. Has she finished?)"
  },
  "compareWith": {
    "structure": "The single most-confused counterpart structure for HK students of this age (e.g. Simple Past Tense)",
    "difference": "Clear English explanation of the key difference and when to choose each.",
    "differenceZh": "繁體中文解釋",
    "example": "A side-by-side mini-example contrasting the two, e.g. 'I lived in London (past). I have lived in London for 10 years (present perfect).'"
  },
  "pronunciationTips": "Notes on contractions, stress, weak forms, linking, or intonation that HK students should know when saying this structure (1-3 sentences).",
  "commonMistakePairs": [
    { "wrong": "I have went to the store.", "right": "I have gone to the store. / I went to the store.", "explanation": "'have' needs the past participle 'gone', not 'went'." }
  ],
  "ccqs": [
    { "question": "Does the action continue to the present?", "answer": "Yes" },
    { "question": "Is the time of the action finished and in the past?", "answer": "No" }
  ],
  "guidedPractice": [
    {
      "prompt": "Complete: She _____ (live) here since 2010.",
      "type": "fill-in",
      "acceptableAnswers": ["has lived"],
      "explanation": "'since 2010' + third person singular → has lived."
    },
    {
      "prompt": "Rewrite in the present perfect: I started this book last week (and I am still reading it).",
      "type": "transformation",
      "acceptableAnswers": ["i have been reading this book since last week", "i have read this book since last week"],
      "explanation": "An action starting in the past and continuing → present perfect."
    },
    {
      "prompt": "Which sentence is grammatically correct?",
      "type": "choice",
      "options": ["A) I have seen him yesterday.", "B) I saw him yesterday.", "C) I have saw him yesterday.", "D) I seen him yesterday."],
      "acceptableAnswers": ["b", "b) i saw him yesterday", "i saw him yesterday"],
      "explanation": "With a finished time word 'yesterday', use the simple past 'saw'."
    }
  ]
}

**Guidelines:**
- This is ONE topic only — go deep, not broad.
- "signalWords": give 4-8 trigger words/phrases. Prefer ones that genuinely appear in the <source-text> when relevant; otherwise give the standard triggers for this structure.
- "forms": must show affirmative, negative, AND question forms (this completes the "Form" picture).
- "compareWith.structure": choose the ONE structure that HK students of this age most often confuse with this topic. Keep the comparison focused and concrete.
- "commonMistakePairs": give exactly 3 pairs of realistic errors Hong Kong students actually make. Each "wrong" must be a realistic student error, not an obviously absurd one.
- "ccqs": 2-3 Concept Checking Questions. Each must be answerable with a short yes/no or single phrase. The answer must be ≤ 5 words.
- "guidedPractice": exactly 3 items. Mix the types (at least one "fill-in" or "transformation", at least one "choice"). For "choice", provide exactly 4 options labeled A) B) C) D). Put ALL acceptable variants (lowercased) into "acceptableAnswers" — the option letter alone, the option text, and the bare answer. Items should test THIS topic's structure, not unrelated grammar.
- All Chinese MUST be in Traditional Chinese (繁體中文).
- ${age <= 11 ? "Keep all English simple and concrete; prefer everyday examples (school, family, food)." : age <= 15 ? "Examples may cover school life, travel, technology, and personal experience." : "Examples may use abstract topics, current affairs, and academic register."}
- Do NOT wrap the JSON in markdown code fences. Respond with ONLY the JSON object.`;
}

export function evaluateGrammarPracticePrompt(
  item: GrammarGuidedPracticeItem,
  userAnswer: string
) {
  return `A Hong Kong student learning English attempted a grammar practice item. Evaluate their answer.

Practice item:
- Prompt: ${item.prompt}
- Type: ${item.type}
${item.options ? `- Options: ${item.options.join(" | ")}` : ""}
- Known acceptable answers: ${item.acceptableAnswers.join(" | ")}
Student's answer: ${userAnswer || "(blank)"}

Decide whether the student's answer is acceptable (correct) and give brief, encouraging feedback.
Respond with ONLY a JSON object (no markdown, no code blocks):
{
  "correct": true,
  "feedback": "Short, friendly feedback (1-2 sentences). If wrong, explain the rule and give the right answer. Use Traditional Chinese (繁體中文) for a short closing hint if helpful."
}`;
}

export function generateGrammarQuizPrompt(text: string, age: number, topics: GrammarTopic[]) {
  const schoolLevel = age <= 11 ? "primary" : age <= 15 ? "secondary" : "dse";
  const topicSummaries = topics.map(t => `- ${t.name} (${t.id}): ${t.pattern}`).join("\n");

  return `Create a grammar quiz for a ${age}-year-old Hong Kong ${schoolLevel} student based on grammar structures found in this text.

<text>
${text}
</text>

<Grammar Topics to Test>
${topicSummaries}
</Grammar Topics to Test>

Generate 10 grammar quiz questions. You MUST respond with ONLY a valid JSON array, no markdown code blocks, no additional text.

[
  {
    "id": "gq1",
    "type": "identify",
    "topicId": "g1",
    "topicName": "Present Perfect Tense",
    "question": "Which grammar structure is used in this sentence: 'She has lived here for ten years'?",
    "questionZh": "這個句子使用了什麼語法結構？",
    "options": ["A) Simple Past", "B) Past Perfect", "C) Present Perfect", "D) Present Continuous"],
    "optionsZh": ["A) 一般過去式", "B) 過去完成式", "C) 現在完成式", "D) 現在進行式"],
    "correctAnswer": "C",
    "explanation": "The sentence uses 'has + past participle (lived)' which is the present perfect tense structure.",
    "explanationZh": "這個句子使用了 'has + 過去分詞 (lived)'，這是現在完成式的結構。",
    "points": 1
  },
  {
    "id": "gq2",
    "type": "fill-in",
    "topicId": "g1",
    "topicName": "Present Perfect Tense",
    "question": "Complete: She _____ (live) in Hong Kong since 2010.",
    "questionZh": "完成句子：She _____ (live) in Hong Kong since 2010.",
    "correctAnswer": "has lived",
    "explanation": "'Since 2010' indicates the present perfect tense. Use 'has lived' for third person singular.",
    "explanationZh": "'Since 2010' 表示現在完成式。第三人稱單數使用 'has lived'。",
    "points": 2
  },
  {
    "id": "gq3",
    "type": "error-spot",
    "topicId": "g1",
    "topicName": "Present Perfect Tense",
    "question": "Find and correct the grammar error: 'She have went to the store yesterday.'",
    "questionZh": "找出並改正語法錯誤：'She have went to the store yesterday.'",
    "options": ["A) She has gone to the store yesterday.", "B) She have went to the store.", "C) No error", "D) She went to the store yesterday."],
    "optionsZh": ["A) She has gone to the store yesterday.", "B) She have went to the store.", "C) 沒有錯誤", "D) She went to the store yesterday."],
    "correctAnswer": "D",
    "explanation": "With 'yesterday', use simple past 'went', not present perfect. Also 'have' doesn't agree with 'she'.",
    "explanationZh": "使用 'yesterday' 時，應使用一般過去式 'went'，而不是現在完成式。此外 'have' 與 'she' 不搭配。",
    "points": 1
  },
  {
    "id": "gq4",
    "type": "rewrite",
    "topicId": "g2",
    "topicName": "Passive Voice",
    "question": "Rewrite in passive voice: 'The teacher explained the lesson.'",
    "questionZh": "將以下句子改為被動語態：'The teacher explained the lesson.'",
    "correctAnswer": "The lesson was explained by the teacher.",
    "explanation": "Object becomes subject, verb becomes 'was + past participle', subject becomes 'by' phrase.",
    "explanationZh": "賓語變為主語，動詞變為 'was + 過去分詞'，主語變為 'by' 短語。",
    "points": 2
  }
]

**Question types (distribute evenly across topics):**
- "identify": Given a sentence, identify which grammar structure it uses. Must have options (A-D).
- "fill-in": Fill in the blank with the correct grammar form. No options. correctAnswer is the expected answer.
- "error-spot": Find and correct a grammar error. Must have options (A-D).
- "rewrite": Rewrite a sentence using a different grammar structure. No options. correctAnswer is one correct version.

**Guidelines:**
- Use sentences from the text when possible for identify and error-spot questions
- For error-spot: create realistic errors that Hong Kong students commonly make
- For rewrite: accept any grammatically correct answer (AI will evaluate)
- Points: identify/error-spot = 1, fill-in/rewrite = 2
- CRITICAL: For questions with options (identify, error-spot), the correct answer MUST be evenly distributed across ALL option positions (A, B, C, D). Do NOT bias toward A or B. Randomize the position of the correct answer for every question.
- CRITICAL: Do NOT reference "underlined" or "the underlined part" in any question. When you need to highlight a specific word or phrase within a sentence, wrap it in **double asterisks**. For example: "Identify the grammar structure used in **has lived** in this sentence: 'She has lived here for ten years.'"
- Chinese translations are REQUIRED for all questions
- Use Traditional Chinese (繁體中文) for all Chinese text
- Make questions age-appropriate

**Respond with ONLY the JSON array, no markdown, no code blocks.**`;
}

export function evaluateGrammarRewritePrompt(
  question: string,
  correctAnswer: string,
  userAnswer: string,
  maxPoints: number
) {
  return `Evaluate this grammar rewrite/fill-in answer for a Hong Kong student learning English.

Question: ${question}
Expected answer: ${correctAnswer}
Student's answer: ${userAnswer}
Maximum points: ${maxPoints}

Evaluate whether the student's answer is grammatically correct and addresses the question.
Respond with ONLY a JSON object (no markdown, no code blocks):
{
  "earnedPoints": <number 0 to ${maxPoints}>,
  "feedback": "<brief feedback in English explaining what was good and what could be improved>"
}

Guidelines:
- Award full points if the answer is grammatically correct even if different from expected
- Award partial points if partially correct
- Award 0 if completely wrong
- Keep feedback brief and encouraging`;
}

// ── Grammar Games AI prompts ─────────────────────────────────────────────────

/**
 * Generates additional Word Order Scramble sentences for each grammar topic.
 * Returns: GrammarScrambleChallenge[]
 */
export function generateGrammarScramblePrompt(topics: GrammarTopic[], age: number): string {
  const topicList = topics
    .map(t => `- id: "${t.id}", name: "${t.name}", pattern: "${t.pattern}", CEFR: ${t.cefrLevel}`)
    .join("\n");

  return `Generate Word Order Scramble challenges for a ${age}-year-old Hong Kong student learning English grammar.

Grammar topics identified in the text:
${topicList}

For each topic, generate 2 new example sentences that clearly demonstrate the grammar pattern. The sentences must NOT be taken from any previously seen text — they must be original.

Respond with ONLY a valid JSON array. No markdown, no code blocks.

[
  {
    "topicId": "<topic id from the list above>",
    "sentence": "<a complete, natural sentence of 6–14 words demonstrating the grammar pattern>",
    "hint": "<the pattern formula for this topic>"
  }
]

Guidelines:
- Each sentence must clearly and unambiguously illustrate the target grammar pattern
- Use vocabulary appropriate for age ${age}
- Sentences should be varied: different subjects, tenses within the pattern, contexts
- Generate exactly 2 sentences per topic
- Keep sentences between 6 and 14 words so they are manageable as word-chip puzzles
- Respond with ONLY the JSON array, no markdown, no code blocks`;
}

/**
 * Generates Grammar Workshop slot-fill challenges for each grammar topic.
 * Returns: GrammarWorkshopChallenge[]
 */
export function generateGrammarWorkshopPrompt(topics: GrammarTopic[], age: number): string {
  const topicList = topics
    .map(t => `- id: "${t.id}", name: "${t.name}", pattern: "${t.pattern}", commonMistakes: "${t.commonMistakes}"`)
    .join("\n");

  return `Generate Grammar Workshop slot-fill challenges for a ${age}-year-old Hong Kong student.

Grammar topics:
${topicList}

For each topic, create 2 slot-fill challenges. Each challenge has a sentence with one or two labelled blanks that the student must fill by selecting from a word bank. The word bank contains the correct answers plus plausible distractors targeting common Hong Kong student mistakes.

Respond with ONLY a valid JSON array. No markdown, no code blocks.

[
  {
    "topicId": "<topic id>",
    "template": "<sentence with blanks written as __[label]__ e.g. 'She __[auxiliary]__ finished her homework.'>",
    "slots": [
      { "label": "<label matching the blank in template>", "answer": "<correct word or phrase>" }
    ],
    "wordBank": ["<distractor 2>", "<correct answer 1>", "<distractor 1>", "<correct answer 2 if two slots>", "<distractor 3>"],
    "explanation": "<brief explanation of why the correct answer is right, in English>"
  }
]

Guidelines:
- Blank labels should be grammar role names: [auxiliary], [verb form], [preposition], [article], [conjunction], [connector], [modal]
- Word bank must contain all correct answers plus at least 3 distractors
- Distractors should be the exact wrong forms Hong Kong students commonly use (from commonMistakes)
- Shuffle the word bank (do not put correct answer first)
- Template must use __[label]__ format with double underscores
- Generate 2 challenges per topic
- Respond with ONLY the JSON array, no markdown, no code blocks`;
}

/**
 * Generates Error Surgery challenges — sentences with one deliberate grammar error.
 * Returns: ErrorSurgeryChallenge[]
 */
export function generateErrorSurgeryPrompt(topics: GrammarTopic[], age: number): string {
  const topicList = topics
    .map(t => `- id: "${t.id}", name: "${t.name}", pattern: "${t.pattern}", commonMistakes: "${t.commonMistakes}"`)
    .join("\n");

  return `Generate Error Surgery challenges for a ${age}-year-old Hong Kong student learning English grammar.

Grammar topics:
${topicList}

For each topic, generate 3 sentences. Each sentence contains exactly ONE deliberate grammar error related to that topic — specifically the kind of mistake Hong Kong students commonly make (see commonMistakes above). The student must identify the single erroneous word or short phrase and correct it.

Respond with ONLY a valid JSON array. No markdown, no code blocks.

[
  {
    "topicId": "<topic id>",
    "sentence": "<a complete sentence containing exactly one grammar error>",
    "errorWord": "<the exact erroneous word or short phrase as it appears in the sentence>",
    "correction": "<the correct replacement word or phrase>",
    "distractors": ["<wrong option 1>", "<wrong option 2>", "<wrong option 3>"],
    "explanation": "<brief explanation of the error and why the correction is right>"
  }
]

Guidelines:
- The errorWord must appear verbatim in the sentence with exact same casing; it may be one word or a short phrase (2–3 words max) when the error is inherently multi-word (e.g. "will rain" → "rains" for a conditional clause)
- Each sentence should have exactly ONE error — all other grammar must be correct
- Errors must be realistic, natural-sounding sentences (not obviously artificial)
- Use vocabulary appropriate for age ${age}
- The error should be clearly related to the grammar topic, not a spelling or vocabulary mistake
- Generate exactly 3 error sentences per topic
- distractors must be exactly 3 real words or short phrases of the same form as the correction — plausible alternatives that are grammatically wrong in this context (NOT the correction, NOT grammatical terms like "participle" or "agent", NOT meta-labels like "correct")
- Respond with ONLY the JSON array, no markdown, no code blocks`;
}

/**
 * Generates MCQ questions for Grammar Roulette and Grammar Duel (AI refresh).
 * Returns: GrammarGameQuestion[]
 */
export function generateGrammarQuestionsPrompt(topics: GrammarTopic[], age: number): string {
  const topicList = topics
    .map(t => `- id: "${t.id}", name: "${t.name}", pattern: "${t.pattern}", explanation: "${t.explanation}", commonMistakes: "${t.commonMistakes}"`)
    .join("\n");

  return `Generate multiple-choice grammar questions for a ${age}-year-old Hong Kong student.

Grammar topics:
${topicList}

Generate 4 questions per topic. Use these question types:
1. "Which sentence correctly uses [topic]?" — one correct + three wrong sentences (distractors target commonMistakes)
2. "Which word/phrase correctly completes this sentence?" — fill-in with 4 options
3. "Which situation calls for [topic] rather than an alternative?" — usage judgment
4. "Find the grammatically correct sentence" — one correct + three with typical HK student errors

Respond with ONLY a valid JSON array. No markdown, no code blocks.

[
  {
    "topicId": "<topic id>",
    "question": "<question text>",
    "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
    "correctIndex": <0-3>,
    "explanation": "<brief explanation of why the correct answer is right>"
  }
]

Guidelines:
- Exactly 4 options per question, exactly one correct
- Distractors must be plausible — target specific errors from commonMistakes
- Questions should be clearly worded for age ${age}
- Vary question types across the 4 questions per topic
- Generate exactly 4 questions per topic
- Respond with ONLY the JSON array, no markdown, no code blocks`;
}

export function generateVisualizationPrompt(age: number, text: string, useChinese: boolean = false): string {
  const schoolLevel = age <= 11 ? "primary" : "secondary";
  const languageInstruction = useChinese
    ? "Use Traditional Chinese (繁體中文) for ALL text labels, captions, headings, and any readable text in the image."
    : "Use English for ALL text labels, captions, headings, and any readable text in the image.";
  return `You are generating an image to help a ${age}-year-old Hong Kong ${schoolLevel} student visualize the main ideas of a reading passage. Analyze the text below, determine its genre and nature, then create a vivid, educational image.

<text>
${text}
</text>

**Instructions:**
1. Analyze the genre and nature of the text above (e.g., informational/expository, narrative/story, children's literature/fable, literary/poetic, scientific, historical, etc.).
2. Choose the most fitting visual representation style:
   - **Infographic poster**: for informational, expository, scientific, or technical texts — organize key facts, data, and concepts into a visually appealing poster layout with sections, icons, and labels.
   - **Comic strip**: for narrative texts with dialogue, events, or story arcs — depict key scenes in a colorful comic strip format with speech bubbles and sequential panels.
   - **Cartoon**: for children's literature, fables, or light-hearted texts — create a fun, colorful cartoon-style illustration featuring characters and key plot elements.
   - **Painting**: for literary, poetic, emotional, or descriptive texts — create an artistic, evocative painting-style illustration that captures the mood and atmosphere.
3. The image must be:
   - **Colorful and visually engaging** — use vibrant colors that appeal to students
   - **Educational** — convey the main ideas, key concepts, and important details from the text
   - **Age-appropriate** — suitable for a ${age}-year-old student
   - **Clear and readable** — any text in the image should be legible and concise
    - **1K resolution (1280x720), 16:9 aspect ratio, PNG format**
4. ${languageInstruction}

Generate the image now.`;
}

export function getSystemPrompt(): string {
  return systemInstruction.replace("{now}", new Date().toLocaleDateString(i18next.language));
}

// ─── AI reading-text generator ────────────────────────────────────────────────

/**
 * Maps a student's age to a target CEFR band and an approximate Flesch-Kincaid
 * grade-level range. Based on the research that FK scores of 60-70 correspond
 * to grade 8-9, matching learners around 13-15 years old. Extends the spec's
 * table (10-18) down to age 8 for primary students.
 */
export interface AgeLevelMapping {
  cefr: CEFRLevel;
  fkMin: number;
  fkMax: number;
}

export function getAgeLevelMapping(age: number): AgeLevelMapping {
  if (age <= 9) return { cefr: "A1", fkMin: 1, fkMax: 3 };
  if (age <= 12) return { cefr: "A2", fkMin: 3, fkMax: 5 };
  if (age <= 14) return { cefr: "B1", fkMin: 5, fkMax: 7 };
  if (age <= 16) return { cefr: "B2", fkMin: 7, fkMax: 9 };
  return { cefr: "C1", fkMin: 9, fkMax: 11 };
}

/** Ordered CEFR levels, used to step up/down for the "regenerate at level" flow. */
export const CEFR_ORDER: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

/** Shifts a CEFR level by one band in the given direction, clamped at the ends. */
export function shiftCefrLevel(level: CEFRLevel, direction: "easier" | "harder"): CEFRLevel {
  const idx = CEFR_ORDER.indexOf(level);
  if (idx === -1) return level;
  const next = direction === "easier" ? Math.max(0, idx - 1) : Math.min(CEFR_ORDER.length - 1, idx + 1);
  return CEFR_ORDER[next];
}

export const READING_TEXT_TYPES = [
  { id: "article", labelKey: "reading.aiGenerate.textTypes.article" },
  { id: "report-informational", labelKey: "reading.aiGenerate.textTypes.reportInformational" },
  { id: "blog-post", labelKey: "reading.aiGenerate.textTypes.blogPost" },
  { id: "review", labelKey: "reading.aiGenerate.textTypes.review" },
  { id: "email-letter", labelKey: "reading.aiGenerate.textTypes.emailLetter" },
  { id: "editorial-argumentative", labelKey: "reading.aiGenerate.textTypes.editorialArgumentative" },
  { id: "interview", labelKey: "reading.aiGenerate.textTypes.interview" },
  { id: "short-story", labelKey: "reading.aiGenerate.textTypes.shortStory" },
  { id: "advertisement-brochure", labelKey: "reading.aiGenerate.textTypes.advertisementBrochure" },
  { id: "notice-announcement", labelKey: "reading.aiGenerate.textTypes.noticeAnnouncement" },
  { id: "profile-feature", labelKey: "reading.aiGenerate.textTypes.profileFeature" },
] as const;

export type ReadingTextType = (typeof READING_TEXT_TYPES)[number]["id"];

export const READING_TEXT_LENGTHS = [250, 400, 550, 700, 850, 1000, 1150] as const;

export interface GenerateReadingTextArgs {
  age: number;
  cefrLevel: CEFRLevel;
  topic: string;
  description?: string;
  textTypeId: ReadingTextType;
  textTypeLabel: string;
  wordCount: number;
}

/**
 * Builds the user prompt for AI reading-text generation. Adapted from the
 * EFL-materials-writer research prompt: combines an explicit CEFR band with
 * concrete vocabulary/grammar/sentence-length rules and a self-check step,
 * then requests structured JSON output (title, body, metadata) for easy
 * rendering and quality control.
 */
export function generateReadingTextPrompt(args: GenerateReadingTextArgs): string {
  const { age, cefrLevel, topic, description, textTypeLabel, wordCount } = args;
  const mapping = getAgeLevelMapping(age);

  const grammarGuidance =
    cefrLevel === "A1" || cefrLevel === "A2"
      ? "simple and compound sentences; present/past/future simple; basic modals (can, must, should); basic comparisons."
      : cefrLevel === "B1"
        ? "patterns typical of A2 plus: present perfect; first and second conditional; relative clauses; reported speech; basic passive."
        : "patterns typical of B1 plus: passive voice; third conditional; complex clause combinations; a wider range of modals.";

  const sentenceLengthGuidance =
    cefrLevel === "A1" || cefrLevel === "A2" || cefrLevel === "B1"
      ? "Average 10-15 words per sentence, varying naturally rather than uniformly."
      : "Average 15-20 words per sentence, varying naturally rather than uniformly.";

  const descriptionBlock = description?.trim()
    ? `\nADDITIONAL DIRECTION FROM THE STUDENT/TEACHER:\n${description.trim()}\n`
    : "";

  return `You are an expert EFL materials writer creating a reading text for a Hong Kong secondary school student.

INPUTS:
- Age: ${age}
- CEFR level: ${cefrLevel} (auto-mapped from age, user-adjustable)
- Topic/theme: ${topic}
- Text type: ${textTypeLabel}
- Target length: ${wordCount} words (+/-10%)
${descriptionBlock}
WRITING RULES:
1. Vocabulary: Use only words at or below ${cefrLevel} according to the English Vocabulary Profile / CEFR word lists. You may introduce up to 5 new words above this level only if they are essential to the topic; if used, list every one of them in the "new_vocabulary" field.
2. Grammar: Restrict sentence structures to patterns typical of ${cefrLevel} (e.g., ${grammarGuidance}).
3. Sentence length: ${sentenceLengthGuidance}
4. Avoid cultural references unfamiliar to a Hong Kong teenager unless clearly explained in context.
5. Structure the text appropriately for ${textTypeLabel} (e.g., report/informational: clear heading + organized body; short story: setup, complication, resolution; blog post: informal tone, first person; email/letter: greeting, body, sign-off; editorial/argumentative: claim, reasons, conclusion; interview: question-and-answer turns; advertisement/brochure: catchy headline, persuasive points; notice/announcement: clear who/what/when/where; profile/feature: engaging opening, key facts, closing).
6. Make the topic "${topic}" engaging and age-appropriate for a ${age}-year-old, avoiding mature, violent, or culturally biased content.
7. Prefer settings, names, and references that feel natural to a Hong Kong or broader Asian context when relevant, without stereotyping.

SELF-CHECK BEFORE OUTPUT:
- Re-read the text and confirm vocabulary and grammar match ${cefrLevel}.
- Estimate the Flesch-Kincaid grade level; the target range for ${cefrLevel} is roughly ${mapping.fkMin}-${mapping.fkMax}. If your text deviates significantly, revise to simplify or enrich accordingly.
- Confirm the word count is within ${wordCount} +/-10%.

OUTPUT FORMAT (valid JSON only, no markdown code blocks, no additional text):
{
  "title": "string",
  "text_type": "${textTypeLabel}",
  "cefr_level": "${cefrLevel}",
  "word_count": integer,
  "estimated_fk_grade": number,
  "new_vocabulary": ["word1", "word2"],
  "body": ["paragraph1", "paragraph2", "..."]
}

Respond with ONLY the JSON object, no markdown, no code blocks, no commentary.`;
}
