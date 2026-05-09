'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { TEE_LABELS, TeePreference } from '@/types'
import { formatEventDate, formatTeeTime } from '@/lib/events'

interface PlayerSignup {
  id: string
  status: string
  tee_preference: TeePreference
  signed_up_at: string
  player: {
    first_name: string
    last_name: string
    ghin_number: string | null
  }
}

interface GroupMember {
  player: {
    first_name: string
    last_name: string
    ghin_number: string | null
  }
}

interface Group {
  id: string
  tee_time: string
  group_number: number
  members: GroupMember[]
}

export default function RosterPage() {
  const [event, setEvent] = useState<{ id: string; event_date: string; status: string } | null>(null)
  const [signups, setSignups] = useState<PlayerSignup[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const eventRes = await fetch('/api/events')
      const eventData = await eventRes.json()
      if (!eventData.event) { setLoading(false); return }

      setEvent(eventData.event)

      const signupRes = await fetch(`/api/signups?event_id=${eventData.event.id}`)
      const signupData = await signupRes.json()
      setSignups(signupData.signups ?? [])

      if (eventData.event.status === 'notified' || eventData.event.status === 'groups_generated') {
        const groupRes = await fetch(`/api/groups?event_id=${eventData.event.id}`)
        const groupData = await groupRes.json()
        setGroups(groupData.groups ?? [])
      }

      setLoading(false)
    }
    load()
  }, [])

  const confirmed = signups.filter((s) => s.status === 'confirmed')
  const waitlist = signups.filter((s) => s.status === 'waitlist')
  const spotsLeft = Math.max(0, 28 - confirmed.length)
  const groupsReleased = event?.status === 'notified' || event?.status === 'groups_generated'

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto px-4 py-10 w-full">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--fc-green)' }}>
          Who&apos;s Playing
        </h1>

        {loading ? (
          <p className="text-stone-400 py-12 text-center">Loading…</p>
        ) : !event ? (
          <div className="text-center py-16 text-stone-500">
            <p className="text-lg font-semibold mb-2">No upcoming signup open</p>
            <p className="text-sm">Signup opens each Saturday for the coming Friday.</p>
          </div>
        ) : (
          <>
            <p className="text-stone-500 text-sm mb-6">{formatEventDate(event.event_date)}</p>

            {/* Stats bar */}
            <div className="flex gap-6 mb-8 p-4 bg-white rounded-xl border border-stone-200 shadow-sm">
              <Stat label="Signed Up" value={confirmed.length} />
              <Stat label="Spots Left" value={spotsLeft} />
              {waitlist.length > 0 && (
                <Stat label="Waitlist" value={waitlist.length} highlight />
              )}
            </div>

            {/* Groups view (after Thursday notifications) */}
            {groupsReleased && groups.length > 0 ? (
              <>
                <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--fc-green)' }}>
                  Tee Times &amp; Groups
                </h2>
                <div className="space-y-3 mb-10">
                  {groups.map((g) => (
                    <div
                      key={g.id}
                      className="bg-white rounded-xl border border-stone-200 shadow-sm p-4"
                    >
                      <p className="font-bold text-sm mb-2" style={{ color: 'var(--fc-green)' }}>
                        {formatTeeTime(g.tee_time)} — Group {g.group_number}
                      </p>
                      <ul className="space-y-1">
                        {g.members.map((m, i) => (
                          <li key={i} className="text-sm text-stone-700 flex items-center gap-2">
                            <span style={{ color: 'var(--fc-gold)' }}>▸</span>
                            {m.player.first_name} {m.player.last_name}
                            {m.player.ghin_number && (
                              <span className="text-stone-400 text-xs">({m.player.ghin_number})</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Player list before groups are released */}
                <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--fc-green)' }}>
                  Confirmed ({confirmed.length})
                </h2>
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden mb-6">
                  {confirmed.length === 0 ? (
                    <p className="text-stone-400 text-sm p-6 text-center">No signups yet — be the first!</p>
                  ) : (
                    <ul className="divide-y divide-stone-100">
                      {confirmed.map((s, i) => (
                        <li key={s.id} className="flex items-center justify-between px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-stone-300 text-sm w-5 text-right">{i + 1}</span>
                            <span className="font-medium text-sm">
                              {s.player.first_name} {s.player.last_name}
                            </span>
                          </div>
                          <span className="text-xs text-stone-400">
                            {TEE_LABELS[s.tee_preference]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {waitlist.length > 0 && (
                  <>
                    <h2 className="font-bold text-lg mb-4 text-amber-700">
                      Waitlist ({waitlist.length})
                    </h2>
                    <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden mb-6">
                      <ul className="divide-y divide-stone-100">
                        {waitlist.map((s, i) => (
                          <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                            <span className="text-stone-300 text-sm w-5 text-right">{i + 1}</span>
                            <span className="font-medium text-sm">
                              {s.player.first_name} {s.player.last_name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {event.status !== 'notified' && (
                  <p className="text-xs text-stone-400 text-center">
                    Groups and tee times will appear here after 6:15 PM Thursday.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}

function Stat({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="text-center">
      <p
        className={`text-3xl font-bold ${highlight ? 'text-amber-600' : ''}`}
        style={!highlight ? { color: 'var(--fc-green)' } : {}}
      >
        {value}
      </p>
      <p className="text-xs text-stone-500 mt-0.5">{label}</p>
    </div>
  )
}
