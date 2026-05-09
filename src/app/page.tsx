import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { supabaseAdmin } from '@/lib/supabase'
import { getUpcomingFriday, formatEventDate } from '@/lib/events'
import { format } from 'date-fns'

async function getEventStats() {
  const friday = getUpcomingFriday()
  if (!friday) return null

  const dateStr = format(friday, 'yyyy-MM-dd')

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, status')
    .eq('event_date', dateStr)
    .single()

  if (!event) return { dateStr, confirmed: 0, waitlist: 0, spotsLeft: 28, eventStatus: 'open' }

  const { count: confirmed } = await supabaseAdmin
    .from('signups')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .eq('status', 'confirmed')

  const { count: waitlist } = await supabaseAdmin
    .from('signups')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .eq('status', 'waitlist')

  const confirmedCount = confirmed ?? 0
  return {
    dateStr,
    eventStatus: event.status,
    confirmed: confirmedCount,
    waitlist: waitlist ?? 0,
    spotsLeft: Math.max(0, 28 - confirmedCount),
  }
}

export default async function HomePage() {
  const stats = await getEventStats()

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Hero */}
      <section
        style={{ backgroundColor: 'var(--fc-green)' }}
        className="text-white py-16 px-4 text-center"
      >
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Friday Golf at Frost Creek
        </h1>
        <p className="text-lg opacity-90 mb-8">
          Every Friday · 12:00 – 1:00 PM · Eagle, Colorado
        </p>

        {stats ? (
          <div className="max-w-md mx-auto bg-white/10 rounded-xl p-6 mb-8 text-left">
            <p className="text-sm uppercase tracking-widest opacity-70 mb-1">Next Round</p>
            <p className="text-2xl font-bold mb-4">{formatEventDate(stats.dateStr)}</p>

            {stats.eventStatus === 'notified' ? (
              <p className="font-semibold" style={{ color: 'var(--fc-gold)' }}>
                Groups have been sent out for this week. Check your email and texts!
              </p>
            ) : (
              <div className="flex gap-8">
                <div>
                  <p className="text-3xl font-bold" style={{ color: 'var(--fc-gold)' }}>
                    {stats.confirmed}
                  </p>
                  <p className="text-sm opacity-80">Signed Up</p>
                </div>
                <div>
                  <p className="text-3xl font-bold" style={{ color: 'var(--fc-gold)' }}>
                    {stats.spotsLeft}
                  </p>
                  <p className="text-sm opacity-80">Spots Left</p>
                </div>
                {stats.waitlist > 0 && (
                  <div>
                    <p className="text-3xl font-bold text-yellow-300">{stats.waitlist}</p>
                    <p className="text-sm opacity-80">On Waitlist</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-md mx-auto bg-white/10 rounded-xl p-6 mb-8">
            <p className="text-lg">Signup opens each Saturday for the coming Friday.</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="inline-block px-8 py-3 rounded-lg font-bold text-lg transition-all"
            style={{ backgroundColor: 'var(--fc-gold)', color: '#1a1a1a' }}
          >
            Sign Up to Play
          </Link>
          <Link
            href="/my-signup"
            className="inline-block px-8 py-3 rounded-lg font-bold text-lg border-2 border-white text-white hover:bg-white hover:text-blue-900 transition-all"
          >
            View My Signup
          </Link>
        </div>
      </section>

      {/* Info cards */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 w-full">
        <div className="grid md:grid-cols-3 gap-6">
          <InfoCard
            title="How It Works"
            items={[
              'Sign up by Thursday at 5:00 PM',
              'Groups drawn randomly Thursday evening',
              'Tee times & groups sent by 6:15 PM',
              'Tee times: 12:00 – 1:00 PM (10 min intervals)',
            ]}
          />
          <InfoCard
            title="Tee Options"
            items={[
              'Copper',
              'Creek (Blue)',
              'Creek/Frost Combo (Blue/White)',
              'Frost (White)',
              'Frost/Gold Combo (White/Gold)',
              'Gold',
            ]}
          />
          <InfoCard
            title="Good to Know"
            items={[
              '12–28 players per week',
              'Groups of 3, 4, or 5',
              'Profile saved week to week',
              'Cancel by Thursday at 5:00 PM',
            ]}
          />
        </div>
      </main>

      <Footer />
    </div>
  )
}

function InfoCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
      <h3 className="font-bold text-lg mb-3" style={{ color: 'var(--fc-green)' }}>
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-stone-700">
            <span style={{ color: 'var(--fc-gold)' }} className="mt-0.5 shrink-0">▸</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
