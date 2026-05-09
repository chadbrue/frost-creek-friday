import { addDays, nextFriday, startOfDay, isFriday, parseISO, format } from 'date-fns'

// Signup opens the Friday before at 4pm, closes Thursday at 4pm
export function getUpcomingFriday(): Date | null {
  if (process.env.NEXT_PUBLIC_TESTING_MODE === 'true') {
    const today = startOfDay(new Date())
    return isFriday(today) ? today : nextFriday(today)
  }

  const now = new Date()
  const today = startOfDay(now)

  let friday = isFriday(today) ? today : nextFriday(today)

  // Opens Friday before at 4pm (7 days prior)
  const signupOpens = addDays(friday, -7)
  signupOpens.setHours(16, 0, 0, 0)

  // Closes Thursday at 4pm (1 day prior)
  const signupCloses = addDays(friday, -1)
  signupCloses.setHours(16, 0, 0, 0)

  if (now < signupOpens) return null
  if (now > signupCloses) {
    friday = nextFriday(addDays(friday, 1))
    const nextOpens = addDays(friday, -7)
    nextOpens.setHours(16, 0, 0, 0)
    if (now < nextOpens) return null
    return friday
  }

  return friday
}

export function isSignupOpen(eventDate: string): boolean {
  if (process.env.NEXT_PUBLIC_TESTING_MODE === 'true') return true

  const friday = parseISO(eventDate)
  const now = new Date()
  const signupOpens = addDays(friday, -7)
  signupOpens.setHours(16, 0, 0, 0)
  const signupCloses = addDays(friday, -1)
  signupCloses.setHours(16, 0, 0, 0)
  return now >= signupOpens && now <= signupCloses
}

export function formatEventDate(dateStr: string): string {
  return format(parseISO(dateStr), 'EEEE, MMMM d, yyyy')
}

export function formatTeeTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

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
