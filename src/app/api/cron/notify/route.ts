import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { buildGroups } from '@/lib/grouping'
import { sendNotifications } from '@/lib/notifications'
import { format } from 'date-fns'
import { getUpcomingFriday } from '@/lib/events'
import { Player, Signup } from '@/types'

// Called by Vercel Cron at 6:15 PM MT Thursday
// Also callable manually by admin via POST with secret header
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return runNotifications()
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return runNotifications()
}

async function runNotifications() {
  const friday = getUpcomingFriday()
  if (!friday) {
    return NextResponse.json({ error: 'No upcoming event' }, { status: 400 })
  }

  const dateStr = format(friday, 'yyyy-MM-dd')

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('event_date', dateStr)
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  if (event.status === 'notified') {
    return NextResponse.json({ error: 'Notifications already sent' }, { status: 409 })
  }

  // Close signups
  await supabaseAdmin
    .from('events')
    .update({ status: 'closed' })
    .eq('id', event.id)

  // Fetch confirmed signups
  const { data: signups } = await supabaseAdmin
    .from('signups')
    .select('*, player:players(*)')
    .eq('event_id', event.id)
    .eq('status', 'confirmed')
    .order('signed_up_at', { ascending: true })

  const players = (signups ?? []).map((s: Signup & { player: Player }) => ({
    ...s.player,
    signup: s,
  }))

  const result = buildGroups(players)

  // Persist groups
  for (const g of result.groups) {
    const { data: group } = await supabaseAdmin
      .from('groups')
      .insert({ event_id: event.id, tee_time: g.tee_time, group_number: g.group_number })
      .select()
      .single()

    if (!group) continue

    await supabaseAdmin.from('group_members').insert(
      g.players.map((p) => ({
        group_id: group.id,
        player_id: p.id,
        signup_id: p.signup.id,
      }))
    )
  }

  // Send all emails and texts
  await sendNotifications(dateStr, result)

  // Mark event as notified
  await supabaseAdmin
    .from('events')
    .update({ status: 'notified' })
    .eq('id', event.id)

  return NextResponse.json({ success: true, groups: result.groups.length })
}
