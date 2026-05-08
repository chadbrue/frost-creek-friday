import { Signup, Player, Group, GroupMember } from '@/types'
import { generateTeeTimes } from './events'

export interface GroupingResult {
  groups: {
    tee_time: string
    group_number: number
    players: (Player & { signup: Signup })[]
  }[]
  waitlist: (Player & { signup: Signup })[]
  proShopAlert: boolean // true when 31st player triggered a new group
}

/**
 * Grouping algorithm:
 * - Hard cap: 30 players (28 normal + up to 2 in fivesomes)
 * - 31st player triggers pro shop notification; goes to waitlist
 * - 32+ go to waitlist
 *
 * For N <= 28:
 *   Maximize foursomes with remainder split into threesomes only.
 *   Algorithm: find max 'a' where (N - 4a) % 3 == 0
 *
 * For N = 29: 6 foursomes + 1 fivesome
 * For N = 30: 5 foursomes + 2 fivesomes
 *
 * Threesomes always receive the earliest tee times.
 */
export function buildGroups(
  confirmedSignups: (Player & { signup: Signup })[]
): GroupingResult {
  // Sort by signup time (earliest first = highest priority)
  const sorted = [...confirmedSignups].sort(
    (a, b) => new Date(a.signup.signed_up_at).getTime() - new Date(b.signup.signed_up_at).getTime()
  )

  let active = sorted
  let waitlist: (Player & { signup: Signup })[] = []
  let proShopAlert = false

  if (sorted.length >= 31) {
    proShopAlert = true
    // Players 31+ go to waitlist; 29-30 handled as fivesomes
    waitlist = sorted.slice(30)
    active = sorted.slice(0, 30)
  }

  const N = active.length
  const groupSizes = computeGroupSizes(N)

  // Shuffle active players randomly
  const shuffled = shuffle(active)

  // Assign players to groups
  const groups: GroupingResult['groups'] = []
  let playerIndex = 0

  // Sort group sizes: threesomes first, then foursomes, then fivesomes
  const sortedSizes = [...groupSizes].sort((a, b) => a - b)
  const teeTimes = generateTeeTimes(sortedSizes.length)

  sortedSizes.forEach((size, idx) => {
    const players = shuffled.slice(playerIndex, playerIndex + size)
    playerIndex += size
    groups.push({
      tee_time: teeTimes[idx],
      group_number: idx + 1,
      players,
    })
  })

  return { groups, waitlist, proShopAlert }
}

function computeGroupSizes(N: number): number[] {
  if (N === 0) return []

  // Overflow fivesome cases
  if (N === 29) return [4, 4, 4, 4, 4, 4, 5]
  if (N === 30) return [4, 4, 4, 4, 4, 5, 5]

  // Normal range (N <= 28): maximize foursomes, use threesomes for remainder
  let a = Math.floor(N / 4)
  while (a >= 0) {
    const remainder = N - 4 * a
    if (remainder >= 0 && remainder % 3 === 0) {
      const b = remainder / 3
      return [...Array(a).fill(4), ...Array(b).fill(3)]
    }
    a--
  }

  // Fallback (should never reach here for N >= 3)
  return [N]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
