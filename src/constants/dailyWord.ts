export const DAILY_WORD_IMAGE_KINDS = ["mascot", "scene"] as const;
export type DailyWordImageKind = (typeof DAILY_WORD_IMAGE_KINDS)[number];

export const DAILY_WORD_MAX_NOTE = 500;
export const DAILY_WORD_MAX_AHEAD_DAYS = 30;
