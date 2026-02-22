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
  const schoolLevel = age <= 11 ? "primary" : "secondary";
  return `Create a reading comprehension test for a ${age}-year-old Hong Kong ${schoolLevel} student based on this text.

<text>
${text}
</text>

Generate 8 questions in JSON format. You MUST respond with ONLY a valid JSON array, no markdown code blocks, no additional text.

[
  {
    "id": "q1",
    "type": "multiple-choice",
    "question": "Question text here?",
    "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
    "correctAnswer": "A",
    "explanation": "Brief explanation of why this is the correct answer"
  },
  {
    "id": "q2",
    "type": "true-false",
    "question": "Statement to evaluate",
    "correctAnswer": "true",
    "explanation": "Brief explanation"
  },
  {
    "id": "q3",
    "type": "short-answer",
    "question": "Open-ended question that requires understanding",
    "correctAnswer": "Key points that should be mentioned in a good answer",
    "explanation": "What to look for in the answer"
  }
]

**Question Distribution:**
- 5 multiple-choice questions (test comprehension and details)
- 2 true/false questions (test factual understanding)
- 1 short-answer question (test deeper understanding)

**Guidelines:**
- Questions should test comprehension, not just memory.
- Use age-appropriate language.
- Make questions clear and unambiguous.
- For multiple-choice, ensure only one answer is clearly correct.

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
