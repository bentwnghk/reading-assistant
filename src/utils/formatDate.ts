const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
}

export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (!date) return ""
  return new Date(date).toLocaleString("en-GB", DATE_TIME_OPTIONS)
}

export function formatDateLong(date: Date | string | number, locale: string): string {
  return new Date(date).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}
