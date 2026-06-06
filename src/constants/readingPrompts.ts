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

## 🔑 Key Words
[List 4-6 important or challenging vocabulary words from the text that students should learn]

• **word** - simple English definition (中文解釋)
• **word2** - simple English definition (中文解釋)
...

## 💡 Something to Think About
[End with ONE engaging question that encourages students to think deeper about the text. Make it personal and relatable.]

${levelGuidance}

**CRITICAL FORMATTING RULES:**
- Use exactly the markdown headers (##) as shown above
- Use bullet points (•) for all lists - NOT dashes or asterisks
- Add relevant emojis: 📖🎯📝🔑💡⭐💭🌟📌🏠👥❤️🎓🌍🎭💪🏆🌈
- **Bold** key vocabulary words inline using double asterisks
- Include Traditional Chinese (繁體中文) translations for ALL key words
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

export function generateMindMapPrompt(age: number, text: string, useChinese: boolean = false) {
  const schoolLevel = age <= 11 ? "primary" : "secondary";
  const languageInstruction = useChinese 
    ? "Use Traditional Chinese (繁體中文) for all text in the mind map." 
    : "Use the same language as the original text.";
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
    "question": "In paragraph [X], what does the word '___' most likely mean?",
    "questionZh": "在第[X]段，'___'這個詞最可能是什麼意思？",
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
- For vocabulary-in-context: choose words understandable from surrounding text
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

export function readingTutorSystemPrompt(age: number, text: string) {
  const schoolLevel = age <= 11 ? "primary" : "secondary";
  
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

**Language:**
- Respond in the same language the student uses (English or Traditional Chinese)
- If using Chinese, always use Traditional Chinese (繁體中文)

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
    : "Use the same language as the original text for all text labels, captions, headings, and any readable text in the image.";
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
   - **2K resolution (2048x1152), 16:9 aspect ratio, PNG format**
4. ${languageInstruction}

**Respond with ONLY a detailed image generation prompt** (a single paragraph describing exactly what to draw, including the visual style chosen, color palette, key elements to include, layout/composition, and any text labels). Do not include any preamble, explanation, or commentary — just the prompt itself.`;
}

export function getSystemPrompt(): string {
  return systemInstruction.replace("{now}", new Date().toLocaleDateString(i18next.language));
}
