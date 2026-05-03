export const ROUTES = {
  HOME: '/',
  UPLOAD: '/upload',
  FREE_REPORT: '/report/free/:deckId',
  PAID_REPORT: '/report/paid/:deckId',
} as const

export function getFreeReportPath(deckId: string): string {
  return `/report/free/${deckId}`
}

export function getPaidReportPath(deckId: string): string {
  return `/report/paid/${deckId}`
}
