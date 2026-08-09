export const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

// Indexed by Date#getDay() (0 = Sunday ... 6 = Saturday), independent of
// locale/formatting so it can't drift from the DAY_NAMES values above.
const WEEKDAY_BY_JS_INDEX: (typeof DAY_NAMES)[number][] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export interface WeekDay {
  dayName: (typeof DAY_NAMES)[number]
  dateLabel: string
  isToday: boolean
}

// Returns a rolling 7-day window starting today (e.g. today is Sunday ->
// Sun, Mon, Tue, Wed, Thu, Fri, Sat), not a fixed Monday-start calendar week.
export function getCurrentWeekDays(): WeekDay[] {
  const today = new Date()

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    return {
      dayName: WEEKDAY_BY_JS_INDEX[date.getDay()],
      dateLabel: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      isToday: i === 0,
    }
  })
}
