import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getUpcomingFriday, formatEventDate, formatTeeTime } from '@/lib/events'
import { format } from 'date-fns'
import GroupEditor from './GroupEditor'

async function getGroupData() {
  const friday = getUpcomingFriday()
  if (!friday) return null

  const dateStr = format(friday, 'yyyy-MM-dd')
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('event_date', dateStr)
    .maybeSingle()

  if (!event) return null

  const { data: groups } = await supabaseAdmin
    .from('groups')
    .select('*, members:group_members(id, player:players(id, first_name, last_name, ghin_number, phone, email))')
    .eq('event_id', event.id)
    .order('group_number', { ascending: true })

  return { event, groups: groups ?? [] }
}

export default async function GroupsPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin')

  const data = await getGroupData()

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--fc-cream)' }}>
      <header style={{ backgroundColor: 'var(--fc-green)' }} className="text-white px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs opacity-70 uppercase tracking-widest">Frost Creek Admin</p>
          <h1 className="font-bold text-lg">Groups Editor</h1>
        </div>
        <Link href="/admin/dashboard" className="text-sm hover:text-yellow-300">
          ← Dashboard
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {!data ? (
          <p className="text-center text-stone-500 py-16">No event or groups found.</p>
        ) : data.groups.length === 0 ? (
          <div className="text-center py-16 text-stone-500">
            <p>No groups generated yet.</p>
            <Link href="/admin/dashboard" className="text-blue-300 underline text-sm">
              Go to Dashboard to generate groups
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold" style={{ color: 'var(--fc-green)' }}>
                {formatEventDate(data.event.event_date)}
              </h2>
              <p className="text-sm text-stone-500">
                Drag players between groups to adjust before sending notifications.
              </p>
            </div>
            <GroupEditor groups={data.groups} eventId={data.event.id} />
          </>
        )}
      </main>
    </div>
  )
}
