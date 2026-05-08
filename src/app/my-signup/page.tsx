'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { TEE_LABELS, TeePreference, Player } from '@/types'
import { formatEventDate, formatTeeTime } from '@/lib/events'

interface SignupWithEvent {
  id: string
  status: string
  tee_preference: TeePreference
  signed_up_at: string
  event: {
    id: string
    event_date: string
    status: string
  }
  player: Player
}

interface GroupInfo {
  tee_time: string
  group_number: number
  members: { player: Player }[]
}

export default function MySignupPage() {
  const [lookup, setLookup] = useState('')
  const [signups, setSignups] = useState<SignupWithEvent[]>([])
  const [groups, setGroups] = useState<Record<string, GroupInfo[]>>({})
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [cancelLoading, setCancelLoading] = useState<string | null>(null)

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    setSearched(false)

    const isEmail = lookup.includes('@')
    const param = isEmail
      ? `email=${encodeURIComponent(lookup.trim())}`
      : `phone=${encodeURIComponent(lookup.replace(/\D/g, ''))}`

    const playerRes = await fetch(`/api/players?${param}`)
    const playerData = await playerRes.json()

    if (!playerData.player) {
      setLoading(false)
      setSearched(true)
      setSignups([])
      return
    }

    const signupRes = await fetch(`/api/signups?player_id=${playerData.player.id}`)
    const signupData = await signupRes.json()
    setLoading(false)
    setSearched(true)

    const allSignups: SignupWithEvent[] = (signupData.signups ?? [])
      .filter((s: SignupWithEvent) => s.status !== 'cancelled')
      .sort(
        (a: SignupWithEvent, b: SignupWithEvent) =>
          new Date(b.event.event_date).getTime() - new Date(a.event.event_date).getTime()
      )
      .slice(0, 5)

    setSignups(allSignups)

    // Load groups for notified events
    const groupMap: Record<string, GroupInfo[]> = {}
    for (const s of allSignups) {
      if (s.event.status === 'notified' || s.event.status === 'groups_generated') {
        const gRes = await fetch(`/api/groups?event_id=${s.event.id}`)
        const gData = await gRes.json()
        groupMap[s.event.id] = gData.groups ?? []
      }
    }
    setGroups(groupMap)
  }

  async function handleCancel(signup: SignupWithEvent) {
    if (!confirm('Cancel your signup for this week?')) return
    setCancelLoading(signup.id)

    const res = await fetch(
      `/api/signups?signup_id=${signup.id}&player_id=${signup.player?.id ?? ''}`,
      { method: 'DELETE' }
    )
    const data = await res.json()
    setCancelLoading(null)

    if (!res.ok) {
      setError(data.error ?? 'Failed to cancel')
      return
    }

    setSignups((prev) => prev.filter((s) => s.id !== signup.id))
  }

  function findMyGroup(eventId: string, playerId: string): GroupInfo | null {
    const eventGroups = groups[eventId] ?? []
    return (
      eventGroups.find((g) =>
        g.members.some((m) => m.player?.id === playerId)
      ) ?? null
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 max-w-lg mx-auto px-4 py-10 w-full">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--fc-green)' }}>
          My Signup
        </h1>
        <p className="text-stone-500 text-sm mb-6">
          Enter your email or mobile to view or cancel your registration.
        </p>

        <form onSubmit={handleLookup} className="flex gap-2 mb-8">
          <input
            type="text"
            placeholder="Email or mobile number"
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
            required
            className="flex-1 border border-stone-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-lg font-semibold text-white text-sm disabled:opacity-50"
            style={{ backgroundColor: 'var(--fc-green)' }}
          >
            {loading ? '…' : 'Look Up'}
          </button>
        </form>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {searched && signups.length === 0 && (
          <p className="text-stone-500 text-sm text-center py-8">
            No active signups found for that email or number.
          </p>
        )}

        <div className="space-y-4">
          {signups.map((signup) => {
            const myGroup = findMyGroup(signup.event.id, signup.player?.id ?? '')
            const isOpen = signup.event.status === 'open'
            const isNotified = signup.event.status === 'notified'

            return (
              <div
                key={signup.id}
                className="bg-white rounded-xl border border-stone-200 shadow-sm p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold" style={{ color: 'var(--fc-green)' }}>
                      {formatEventDate(signup.event.event_date)}
                    </p>
                    <p className="text-sm text-stone-500">{TEE_LABELS[signup.tee_preference]}</p>
                  </div>
                  <StatusBadge status={signup.status} />
                </div>

                {isNotified && myGroup && (
                  <div
                    className="rounded-lg p-3 mb-3 text-sm"
                    style={{ backgroundColor: '#f0f7ee' }}
                  >
                    <p className="font-semibold mb-1" style={{ color: 'var(--fc-green)' }}>
                      Tee Time: {formatTeeTime(myGroup.tee_time)} — Group {myGroup.group_number}
                    </p>
                    <p className="text-stone-600">
                      {myGroup.members
                        .map((m) => `${m.player.first_name} ${m.player.last_name}`)
                        .join(', ')}
                    </p>
                  </div>
                )}

                {isOpen && signup.status === 'confirmed' && (
                  <button
                    onClick={() => handleCancel(signup)}
                    disabled={cancelLoading === signup.id}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    {cancelLoading === signup.id ? 'Cancelling…' : 'Cancel signup'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </main>
      <Footer />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-800',
    waitlist: 'bg-amber-100 text-amber-800',
    cancelled: 'bg-stone-100 text-stone-500',
  }
  const labels: Record<string, string> = {
    confirmed: 'Confirmed',
    waitlist: 'Waitlist',
    cancelled: 'Cancelled',
  }
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${styles[status] ?? ''}`}>
      {labels[status] ?? status}
    </span>
  )
}
