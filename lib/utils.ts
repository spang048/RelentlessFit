/** Format a Date as YYYY-MM-DD in LOCAL time (not UTC) */
export function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Today's date as YYYY-MM-DD in local time */
export function today(): string {
  return formatDate(new Date())
}
