import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getUpcomingFriday, formatEventDate, formatTeeTime } from '@/lib/events'
import { TEE_LABELS, TeePreference } from '@/types'
import { format } from 'date-fns'
import AdminActions from './AdminActions'

async function getEventData() {
  const friday = getUpcomingFriday()
  if (!friday) return null

  const dateStr = format(friday, 'yyyy-MM-dd')
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('event_date', dateStr)
    .maybeSingle()

  if (!event) return null

  const { data: signups } = await supabaseAdmin
    .from('signups')
    .select('*, player:players(*)')
    .eq('event_id', event.id)
    .neq('status', 'cancelled')
    .order('signed_up_at', { ascending: true })

  const { data: groups } = await supabaseAdmin
    .from('groups')
    .select('*, members:group_members(*, player:players(*))')
    .eq('event_id', event.id)
    .order('group_number', { ascending: true })

  return { event, signups: signups ?? [], groups: groups ?? [] }
}

export default async function AdminDashboard() {
  const session = await getAdminSession()
  if (!session) redirect('/admin')

  const data = await getEventData()

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--fc-cream)' }}>
      {/* Admin header */}
      <header style={{ backgroundColor: 'var(--fc-green)' }} className="text-white px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs opacity-70 uppercase tracking-widest">Frost Creek Admin</p>
          <h1 className="font-bold text-lg">Friday Golf Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/groups" className="text-sm hover:text-yellow-300">
            Groups View →
          </Link>
          <LogoutBtn />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {!data ? (
          <div className="text-center py-16 text-stone-500">
            <p className="text-lg">No upcoming event found.</p>
            <p className="text-sm mt-2">Signup opens each Saturday for the coming Friday.</p>
          </div>
        ) : (
          <>
            {/* Event summary */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--fc-green)' }}>
                    {formatEventDate(data.event.event_date)}
                  </h2>
                  <p className="text-sm text-stone-500 capitalize">Status: {data.event.status}</p>
                </div>
                <div className="flex gap-6 text-center">
                  {['confirmed', 'waitlist'].map((s) => (
                    <div key={s}>
                      <p className="text-2xl font-bold" style={{ color: 'var(--fc-green)' }}>
                        {data.signups.filter((sig: { status: string }) => sig.status === s).length}
                      </p>
                      <p className="text-xs text-stone-500 capitalize">{s}</p>
                    </div>
                  ))}
                  <div>
                    <p className="text-2xl font-bold" style={{ color: 'var(--fc-green)' }}>
                      {Math.max(0, 28 - data.signups.filter((sig: { status: string }) => sig.status === 'confirmed').length)}
                    </p>
                    <p className="text-xs text-stone-500">Spots Left</p>
                  </div>
                </div>
              </div>

              <AdminActions eventId={data.event.id} eventStatus={data.event.status} />
            </div>

            {/* Signups table */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-stone-100">
                <h3 className="font-semibold" style={{ color: 'var(--fc-green)' }}>
                  Signups ({data.signups.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Mobile</th>
                      <th className="px-4 py-3 text-left">GHIN</th>
                      <th className="px-4 py-3 text-left">Tees</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Signed Up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.signups.map((s: {
                      id: string
                      status: string
                      tee_preference: TeePreference
                      signed_up_at: string
                      player: { first_name: string; last_name: string; email: string; phone: string; ghin_number: string | null }
                    }, i: number) => (
                      <tr key={s.id} className="border-t border-stone-100 hover:bg-stone-50">
                        <td className="px-4 py-3 text-stone-400">{i + 1}</td>
                        <td className="px-4 py-3 font-medium">
                          {s.player?.first_name} {s.player?.last_name}
                        </td>
                        <td className="px-4 py-3 text-stone-600">{s.player?.email}</td>
                        <td className="px-4 py-3 text-stone-600">{s.player?.phone}</td>
                        <td className="px-4 py-3 text-stone-600">{s.player?.ghin_number ?? '—'}</td>
                        <td className="px-4 py-3 text-stone-600">{TEE_LABELS[s.tee_preference]}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            s.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            s.status === 'waitlist' ? 'bg-amber-100 text-amber-800' :
                            'bg-stone-100 text-stone-500'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-stone-400 text-xs">
                          {new Date(s.signed_up_at).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Groups preview */}
            {data.groups.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
                <h3 className="font-semibold mb-4" style={{ color: 'var(--fc-green)' }}>
                  Groups Preview
                </h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {data.groups.map((g: {
                    id: string
                    tee_time: string
                    group_number: number
                    members: { player: { first_name: string; last_name: string; ghin_number: string | null } }[]
                  }) => (
                    <div key={g.id} className="border border-stone-200 rounded-lg p-4">
                      <p className="font-semibold text-sm mb-2" style={{ color: 'var(--fc-green)' }}>
                        {formatTeeTime(g.tee_time)} — Group {g.group_number}
                      </p>
                      <ul className="text-sm text-stone-700 space-y-1">
                        {g.members.map((m, i) => (
                          <li key={i}>
                            {m.player?.first_name} {m.player?.last_name}
                            {m.player?.ghin_number && (
                              <span className="text-stone-400 text-xs"> ({m.player.ghin_number})</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function LogoutBtn() {
  return (
    <form action="/api/admin" method="POST">
      {/* Client-side logout handled in AdminActions */}
      <Link
        href="/api/admin"
        onClick={async (e) => {
          e.preventDefault()
          await fetch('/api/admin', { method: 'DELETE' })
          window.location.href = '/admin'
        }}
        className="text-sm opacity-70 hover:opacity-100"
      >
        Sign Out
      </Link>
    </form>
  )
}
