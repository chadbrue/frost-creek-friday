import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { buildGroups } from '@/lib/grouping'
import { getAdminSession } from '@/lib/auth'
import { Player, Signup } from '@/types'

// Get groups for an event
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('event_id')
  if (!eventId) return NextResponse.json({ error: 'Missing event_id' }, { status: 400 })

  const { data: groups, error } = await supabaseAdmin
    .from('groups')
    .select('*, members:group_members(*, player:players(*))')
    .eq('event_id', eventId)
    .order('group_number', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ groups })
}

// Generate (or regenerate) random groups — admin only
export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { event_id } = body
  if (!event_id) return NextResponse.json({ error: 'Missing event_id' }, { status: 400 })

  // Fetch all confirmed signups with player data
  const { data: signups, error: signupsError } = await supabaseAdmin
    .from('signups')
    .select('*, player:players(*)')
    .eq('event_id', event_id)
    .eq('status', 'confirmed')
    .order('signed_up_at', { ascending: true })

  if (signupsError) return NextResponse.json({ error: signupsError.message }, { status: 500 })

  const players = (signups ?? []).map((s: Signup & { player: Player }) => ({
    ...s.player,
    signup: s,
  }))

  const result = buildGroups(players)

  // Clear existing groups for this event
  await supabaseAdmin.from('group_members').delete().in(
    'group_id',
    (await supabaseAdmin.from('groups').select('id').eq('event_id', event_id)).data?.map((g: { id: string }) => g.id) ?? []
  )
  await supabaseAdmin.from('groups').delete().eq('event_id', event_id)

  // Insert new groups and members
  for (const g of result.groups) {
    const { data: group, error: groupError } = await supabaseAdmin
      .from('groups')
      .insert({
        event_id,
        tee_time: g.tee_time,
        group_number: g.group_number,
      })
      .select()
      .single()

    if (groupError) continue

    const members = g.players.map((p) => ({
      group_id: group.id,
      player_id: p.id,
      signup_id: p.signup.id,
    }))

    await supabaseAdmin.from('group_members').insert(members)
  }

  // Update event status
  await supabaseAdmin
    .from('events')
    .update({ status: 'groups_generated' })
    .eq('id', event_id)

  return NextResponse.json({ success: true, proShopAlert: result.proShopAlert })
}

// Update a group member assignment (drag-and-drop swap) — admin only
export async function PATCH(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { member_id, new_group_id } = body

  if (!member_id || !new_group_id) {
    return NextResponse.json({ error: 'Missing member_id or new_group_id' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('group_members')
    .update({ group_id: new_group_id })
    .eq('id', member_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
