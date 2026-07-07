# Plan: Enriched Grammar Lessons Tab

## Goal
Transform the Lessons tab from a near-duplicate of Topics into a deep-dive, MPF/PPP-aligned learning experience, generated on-demand per topic. Topics stays a lightweight overview.

## Design Decisions (user-confirmed)
- **Scope**: Tier 1 + Tier 2 content
- **Generation**: On-demand per topic (each accordion has a "Load Full Lesson" button)
- **Topics tab**: Unchanged (lightweight)
- **Practice evaluation**: Hybrid — client-side match by default + optional "Ask AI for help" button per item
- **Persistence**: Reuse the existing `grammar_topics` JSONB column — **no DB migration**

---

## 1. Data Model — `src/types.d.ts` (lines 71–90)

Extend `GrammarTopic` with **optional** fields so old sessions & un-enriched topics render gracefully:

```ts
interface GrammarTopic {
  // ... existing fields unchanged ...
  // Tier 1 (new, optional)
  whenToUse?: string;                  // EN: when/why to use it (situations, time references)
  whenToUseZh?: string;                // ZH
  signalWords?: string[];              // trigger words: ["since", "for", "already", "yet"]
  forms?: {                            // completes the "Form" pillar
    affirmative: string;
    negative: string;
    question: string;
  };
  compareWith?: {                      // "Use" pillar — contrast with confused counterpart
    structure: string;                 // e.g. "Simple Past Tense"
    difference: string;                // EN explanation of the difference
    differenceZh: string;
    example: string;                   // side-by-side example
  };
  pronunciationTips?: string;          // contractions, stress, weak forms, intonation
  // Tier 2 (new, optional)
  commonMistakePairs?: {               // concrete wrong→right (augments existing commonMistakes blob)
    wrong: string;
    right: string;
    explanation: string;
  }[];
  ccqs?: {                             // Concept Checking Questions
    question: string;
    answer: string;                    // short answer: "Yes" / "No" / "the past" etc.
  }[];
  guidedPractice?: GrammarGuidedPracticeItem[];
}

/** One inline practice item for the Lessons tab "Quick Practice" section. */
interface GrammarGuidedPracticeItem {
  prompt: string;
  type: "fill-in" | "transformation" | "choice";
  options?: string[];                 // present only for "choice"
  acceptableAnswers: string[];        // lowercased; client-side normalized match
  explanation: string;
}

/** Shape returned by the on-demand grammar-lesson AI call. */
interface GrammarLessonEnrichment {
  whenToUse: string;
  whenToUseZh: string;
  signalWords: string[];
  forms: { affirmative: string; negative: string; question: string };
  compareWith: { structure: string; difference: string; differenceZh: string; example: string };
  pronunciationTips: string;
  commonMistakePairs: { wrong: string; right: string; explanation: string }[];
  ccqs: { question: string; answer: string }[];
  guidedPractice: GrammarGuidedPracticeItem[];
}
```

---

## 2. Store — `src/store/reading.ts`

| Change | Location | Detail |
|---|---|---|
| Add `"grammar-lesson"` to `GenerationType` union | lines 110–129 | So per-topic loading keys typecheck |
| Relax `setGenerating` param type `GenerationType` → `string` | line 280 (decl) | Matches the existing `Record<string, boolean>` field type; allows dynamic keys `grammar-lesson:${topicId}` |
| New action `enrichGrammarTopic(topicId, enrichment: Partial<GrammarTopic>)` | decl near line 245; impl near `setGrammarTopics` (lines 682–694) | Immutably merges `enrichment` into the matching topic, preserves other topics, bumps `updatedAt`, fires `syncToHistoryIfNeeded` + `syncToAPI` (mirror the `setGrammarTopics` pattern) |

Implementation of `enrichGrammarTopic` (mirror of `setGrammarTopics` at lines 682–694):
```ts
enrichGrammarTopic: (topicId, enrichment) =>
  set((state) => {
    const newState = {
      grammarTopics: state.grammarTopics.map((t) =>
        t.id === topicId ? { ...t, ...enrichment } : t
      ),
      grammarGeneratedAt: Date.now(),
      updatedAt: Date.now(),
    };
    syncToHistoryIfNeeded({ ...state, ...newState });
    if (currentUserId && state.id) {
      syncToAPI(state.id, newState);
    }
    return newState;
  }),
```

Per-topic loading uses the dynamic-key pattern in `activeGenerations`:
```ts
const key = `grammar-lesson:${topicId}`;
// guard, set, read — all via existing setGenerating / activeGenerations
```
This survives SPA navigation per AGENTS.md lesson #8 (store-level, not component `useState`).

---

## 3. AI Prompt — `src/constants/readingPrompts.ts`

Add `generateGrammarLessonPrompt(topic: GrammarTopic, text: string, age: number)` after `analyzeGrammarTopicsPrompt` (~line 677). Returns a JSON-only prompt asking for the `GrammarLessonEnrichment` shape. Key directives:
- Tailor depth to age (primary/secondary/dse, mirroring existing age-banding)
- `signalWords`: list 4–8 trigger words/phrases actually visible in the text where possible
- `forms`: show all three (affirmative/negative/question) for the topic's `pattern`
- `compareWith`: pick the **single** most-confused counterpart structure for HK students of this age
- `commonMistakePairs`: 3 pairs, errors HK students actually make
- `ccqs`: 2–3 yes/no or either/or items, answer ≤ 4 words
- `guidedPractice`: 3 items, mix of types, each with `acceptableAnswers` array (lowercased) for client-side match
- All Chinese in Traditional Chinese (繁體中文)
- JSON-only, no markdown fences

---

## 4. Generation Function — `src/hooks/useReadingAssistant.ts`

### 4a. `generateGrammarLesson(topicId)` — near `analyzeGrammarTopics` (~line 941)
Follows the canonical pattern:
```ts
async function generateGrammarLesson(topicId: string) {
  const key = `grammar-lesson:${topicId}`;
  if (useReadingStore.getState().activeGenerations[key]) return;
  const { studentAge, extractedText, grammarTopics } = readingStore;
  const topic = grammarTopics.find((t) => t.id === topicId);
  if (!topic || !extractedText) return;

  setGenerating(key, true);
  const toastId = toast.info(i18next.t("reading.grammar.lesson.generatingWait"), { duration: Infinity });
  try {
    const text = await grammarGenerateText(
      generateGrammarLessonPrompt(topic, extractedText, studentAge),
      getSystemPrompt(),
    );
    const enrichment: GrammarLessonEnrichment = JSON.parse(text);
    readingStore.enrichGrammarTopic(topicId, enrichment);
    logActivity("grammar_lesson_load", { sessionId: readingStore.id || undefined, topicId });
    toast.dismiss(toastId);
  } catch (error) {
    toast.dismiss(toastId);
    handleError(error);
  } finally {
    setGenerating(key, false);
  }
}
```
Return it from the hook (add to returned object near line 1217).

### 4b. `evaluateGrammarPracticeItem(item, userAnswer)` — hybrid "Ask AI for help"
A new helper for the optional AI-evaluation path on a single practice item. Reuses `grammarGenerateText` + a new small prompt. Returns `{ correct: boolean, feedback: string }`. Per-item loading tracked component-locally (a `Set<number>` of item indices) since this is ephemeral UI state per AGENTS.md §8.

---

## 5. UI — `src/components/ReadingAssistant/Grammar.tsx`

Modify only `renderLessons()` (lines 814–891). Per accordion item:

**Always shown (existing basic content, unchanged):**
- What is it (EN/ZH), Pattern, Examples, Common Mistakes (EN/ZH), Highlight button

**New "Full Lesson" trigger** (shown only when the topic has no enrichment yet, i.e. `!topic.whenToUse`):
- Button `<GraduationCap /> Load Full Lesson` → `generateGrammarLesson(topic.id)`
- Spinner from `!!activeGenerations[\`grammar-lesson:${topic.id}\`]`
- Once loaded, button becomes a subtle "Reload Lesson" secondary action

**Enriched sections** (rendered once any enrichment field is present, each conditionally on its own field):
1. **When to Use** — `topic.whenToUse` + `whenToUseZh` + `signalWords` (badges)
2. **Forms** — 3-column table (Affirmative / Negative / Question)
3. **Compare With** — card contrasting `topic.compareWith.structure` with `difference` + `example`
4. **Pronunciation Tips** — `topic.pronunciationTips`
5. **Common Mistakes** — augment existing blob with `commonMistakePairs` rendered as ❌ wrong → ✅ right rows (keep old `commonMistakes` text for back-compat)
6. **Check Your Understanding (CCQs)** — list of `topic.ccqs` with "Reveal Answer" toggle per item (component-local `useState<Set<number>>` — fine because ephemeral UI)
7. **Quick Practice** — `topic.guidedPractice` items:
   - For `choice`: RadioGroup; for `fill-in`/`transformation`: Input
   - On submit: client-side `normalizeAndCompare(userAnswer, item.acceptableAnswers)` → instant ✓/✗ with explanation
   - "Ask AI for help" button → calls `evaluateGrammarPracticeItem`, shows richer feedback, per-item spinner
   - Component-local state: `revealedCcqs: Set<number>`, `practiceAttempts: Record<index, {answer, correct, aiFeedback?}>`

**Export**: extend `downloadWord` "lessons" section (lines 437–535) to optionally include the enriched fields when present.

**Helper utility** (inline in component or in utils): `normalizeAnswer(s) = s.toLowerCase().trim().replace(/[.,!?;:'"]/g, "").replace(/\s+/g, " ")`

---

## 6. i18n — `src/locales/{en-US,zh-HK}.json`

Add under `reading.grammar` (both languages), a new `lesson` sub-namespace:
```
lesson.loadFullLesson
lesson.reloadLesson
lesson.generatingWait
lesson.loaded
lesson.whenToUse
lesson.signalWords
lesson.forms
lesson.affirmative
lesson.negative
lesson.question
lesson.compareWith
lesson.difference
lesson.pronunciationTips
lesson.mistakePairs
lesson.wrong
lesson.right
lesson.ccqTitle
lesson.ccqReveal
lesson.ccqHide
lesson.practiceTitle
lesson.practiceSubmit
lesson.practiceCorrect
lesson.practiceIncorrect
lesson.practiceTryAgain
lesson.practiceAskAi
lesson.practiceAiThinking
```

---

## 7. Full Touchpoint Checklist (per AGENTS.md "Lessons Learned")

| # | File | Change |
|---|---|---|
| 1 | `src/types.d.ts` | Add optional fields to `GrammarTopic` + new `GrammarGuidedPracticeItem` + `GrammarLessonEnrichment` |
| 2 | `src/store/reading.ts` | Add `"grammar-lesson"` to `GenerationType`; relax `setGenerating` param to `string`; add `enrichGrammarTopic` action |
| 3 | `src/constants/readingPrompts.ts` | Add `generateGrammarLessonPrompt` (and a small `evaluateGrammarPracticePrompt` for the hybrid AI help) |
| 4 | `src/hooks/useReadingAssistant.ts` | Add `generateGrammarLesson` + `evaluateGrammarPracticeItem`; return both |
| 5 | `src/components/ReadingAssistant/Grammar.tsx` | Enrich `renderLessons()`; add CCQ/practice interactivity; extend `downloadWord` |
| 6 | `src/locales/en-US.json` + `zh-HK.json` | New `reading.grammar.lesson.*` keys |
| 7 | **No DB migration** | `grammar_topics` is JSONB — verified |
| 8 | **No session.ts change** | `fieldMappings`/INSERT already cover `grammarTopics` as opaque JSON — verified |
| 9 | **No leaderboard/dashboard/achievements** | Lessons enrichment is per-topic learning content, not a new scored activity |

---

## Suggested Commit Structure (per AGENTS.md §5)
1. **Types + store** — `GrammarTopic` extension, `enrichGrammarTopic`, `GenerationType` update
2. **Prompt + AI function** — `generateGrammarLessonPrompt` + `generateGrammarLesson` + `evaluateGrammarPracticeItem`
3. **UI** — enriched `renderLessons()` + practice/CCQ interactivity + Word export
4. **i18n** — both locale files

Each commit independently builds and doesn't break existing functionality.

---

## Verification
- `npm run lint` and `npm run build` after each commit
- Manual: extract text → Analyze Grammar → open a topic in Lessons → click "Load Full Lesson" → verify all enriched sections render, signal words appear as badges, forms table is correct, CCQ reveal toggles, guided practice gives instant feedback, "Ask AI for help" produces richer feedback
- Back-compat: load an old session (no enrichment) → Lessons still renders the basic content as today; no crashes on `undefined` enriched fields
- SPA-navigation: kick off "Load Full Lesson", navigate to `/leaderboard`, return → spinner persists

---

## Research Basis
- **MPF** (Meaning-Pronunciation-Form): CELTA/TESOL cornerstone — current app covers Meaning (partly) and Form, but Pronunciation is entirely absent. Source: languagepointtraining.com.
- **PPP** (Presentation-Practice-Production): Lessons tab is currently pure Presentation. Tier 2 inline practice adds the Practice stage. Source: bridge.edu/tefl, tesolpop.com.
- **Form-Meaning-Use** (Larsen-Freeman): Compare-With section addresses the Use pillar.
- **CCQs** (Concept Checking Questions): standard CELTA technique for verifying understanding without "Do you understand?".
- **Signal words**: HK students learn tenses largely by trigger words (since/for/already/yet) — highest-impact single addition for this audience.
- **Duolingo**: ships "Explain My Answer" (personalized grammar tips) + per-skill Tips & Notes — confirms value of explanation + comparison + common-error pairs.
