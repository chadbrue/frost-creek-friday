import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isSignupOpen } from '@/lib/events'
import { TeePreference } from '@/types'

// Get signups for an event (with player info)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('event_id')
  const playerId = searchParams.get('player_id')

  if (!eventId && !playerId) {
    return NextResponse.json({ error: 'Provide event_id or player_id' }, { status: 400 })
  }

  let query = supabaseAdmin
    .from('signups')
    .select('*, player:players(*)')
    .order('signed_up_at', { ascending: true })

  if (eventId) query = query.eq('event_id', eventId)
  if (playerId) query = query.eq('player_id', playerId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ signups: data })
}

// Create a new signup
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { player_id, event_id, tee_preference, event_date } = body

  if (!player_id || !event_id || !tee_preference) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (event_date && !isSignupOpen(event_date)) {
    return NextResponse.json({ error: 'Signup is not currently open' }, { status: 400 })
  }

  // Check for existing signup
  const { data: existing } = await supabaseAdmin
    .from('signups')
    .select('id, status')
    .eq('player_id', player_id)
    .eq('event_id', event_id)
    .maybeSingle()

  if (existing && existing.status !== 'cancelled') {
    return NextResponse.json({ error: 'Already signed up for this week' }, { status: 409 })
  }

  // Count confirmed signups to determine status
  const { count: confirmedCount } = await supabaseAdmin
    .from('signups')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event_id)
    .eq('status', 'confirmed')

  const totalConfirmed = confirmedCount ?? 0
  // Spots 1-28 confirmed, 29-30 as fivesomes are allowed, 31+ waitlisted
  const status = totalConfirmed < 30 ? 'confirmed' : 'waitlist'

  if (existing && existing.status === 'cancelled') {
    // Re-activate cancelled signup
    const { data, error } = await supabaseAdmin
      .from('signups')
      .update({
        tee_preference: tee_preference as TeePreference,
        status,
        signed_up_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ signup: data, status })
  }

  const { data, error } = await supabaseAdmin
    .from('signups')
    .insert({
      player_id,
      event_id,
      tee_preference: tee_preference as TeePreference,
      status,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ signup: data, status }, { status: 201 })
}

// Cancel a signup
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const signupId = searchParams.get('signup_id')
  const playerId = searchParams.get('player_id')

  if (!signupId || !playerId) {
    return NextResponse.json({ error: 'Missing signup_id or player_id' }, { status: 400 })
  }

  // Get signup + event date for deadline check
  const { data: signup } = await supabaseAdmin
    .from('signups')
    .select('*, event:events(event_date, status)')
    .eq('id', signupId)
    .eq('player_id', playerId)
    .single()

  if (!signup) return NextResponse.json({ error: 'Signup not found' }, { status: 404 })

  const eventDate = (signup.event as { event_date: string }).event_date
  if (!isSignupOpen(eventDate)) {
    return NextResponse.json({ error: 'Cancellation deadline has passed' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('signups')
    .update({ status: 'cancelled' })
    .eq('id', signupId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Promote first waitlisted player to confirmed
  const { data: waitlisted } = await supabaseAdmin
    .from('signups')
    .select('id')
    .eq('event_id', signup.event_id)
    .eq('status', 'waitlist')
    .order('signed_up_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (waitlisted) {
    await supabaseAdmin
      .from('signups')
      .update({ status: 'confirmed' })
      .eq('id', waitlisted.id)
  }

  return NextResponse.json({ success: true })
}
