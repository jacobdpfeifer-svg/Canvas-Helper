/** Static Canvas-relevant micro-fact for the practice-format onboarding game. */

export const MICRO_FACT = {
  title: "How Canvas due times work",
  body:
    "Canvas stores due dates in UTC, but shows them in your course timezone. " +
    "If your school is Mountain Time, a due time of 11:59 PM MT is the same instant " +
    "as 5:59 AM UTC the next calendar day in summer (MDT).",
  question: "In Mountain Time (MDT), what UTC clock time is 11:59 PM local?",
  answer: "5:59 AM UTC the next calendar day",
  workedSteps: [
    "Canvas stores the deadline as a single UTC instant.",
    "Your course timezone (e.g. America/Denver) is only for display.",
    "MDT is UTC−6, so 11:59 PM local → add 6 hours → 5:59 AM UTC next day.",
  ],
} as const;
