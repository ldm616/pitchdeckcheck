export const ROUTES = {
  HOME: '/',
  UPLOAD: '/upload',
  PROCESSING: '/processing/:deckId',
  REPORT: '/report/:deckId',
  ADMIN: '/admin',
} as const

export function getProcessingPath(deckId: string, accessToken: string): string {
  return `/processing/${deckId}?token=${accessToken}`
}

export function getReportPath(deckId: string, accessToken: string): string {
  return `/report/${deckId}?token=${accessToken}`
}

export function getReportPathByCode(reportCode: string): string {
  return `/report/${reportCode}`
}

// Legacy routes (for backwards compatibility)
export function getFreeReportPath(deckId: string): string {
  return `/report/free/${deckId}`
}

export function getPaidReportPath(deckId: string): string {
  return `/report/paid/${deckId}`
}
