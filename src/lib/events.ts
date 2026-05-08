import { addDays, nextFriday, startOfDay, isFriday, parseISO, format } from 'date-fns'

/**
 * Returns the next upcoming Friday that is open for signup.
 * Signup opens 6 days before (Saturday) and closes Thursday at 5pm MT.
 */
export function getUpcomingFriday(): Date | null {
  const now = new Date()
  const today = startOfDay(now)

  // Find the next Friday from today
  let friday = isFriday(today) ? today : nextFriday(today)

  // Signup opens the Saturday before (6 days prior)
  const signupOpens = addDays(friday, -6)

  // Signup closes Thursday 5pm MT (the day before)
  const signupCloses = addDays(friday, -1)
  signupCloses.setHours(17, 0, 0, 0) // 5:00 PM

  if (now < signupOpens) return null
  if (now > signupCloses) {
    // Try the following Friday
    friday = nextFriday(addDays(friday, 1))
    const nextOpens = addDays(friday, -6)
    if (now < nextOpens) return null
    return friday
  }

  return friday
}

export function isSignupOpen(eventDate: string): boolean {
  const friday = parseISO(eventDate)
  const now = new Date()
  const signupOpens = addDays(friday, -6)
  const signupCloses = addDays(friday, -1)
  signupCloses.setHours(17, 0, 0, 0)
  return now >= signupOpens && now <= signupCloses
}

export function formatEventDate(dateStr: string): string {
  return format(parseISO(dateStr), 'EEEE, MMMM d, yyyy')
}

export function formatTeeTime(timeStr: string): string {
  // timeStr is HH:MM:SS
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

// Generate tee times starting at 12:00 PM, 10-min intervals
export function generateTeeTimes(groupCount: number): string[] {
  const times: string[] = []
  for (let i = 0; i < groupCount; i++) {
    const totalMinutes = 12 * 60 + i * 10
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    times.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`)
  }
  return times
}
