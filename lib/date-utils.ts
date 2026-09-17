/**
 * Date utility functions for local pharmacy timezone support.
 * Avoids UTC offset issues where toISOString().slice(0, 10) gives yesterday's date
 * during night / early morning hours (e.g. 12:00 AM - 6:00 AM in UTC+6 Bangladesh).
 */

export function getLocalDateString(dateInput?: Date | string | number | null): string {
  const d = dateInput ? new Date(dateInput) : new Date()
  if (isNaN(d.getTime())) {
    const fallback = new Date()
    const y = fallback.getFullYear()
    const m = String(fallback.getMonth() + 1).padStart(2, '0')
    const day = String(fallback.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
