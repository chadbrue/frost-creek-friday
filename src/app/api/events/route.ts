import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUpcomingFriday } from '@/lib/events'
import { format } from 'date-fns'

// Get (or auto-create) the upcoming event
export async function GET() {
  const friday = getUpcomingFriday()
  if (!friday) {
    return NextResponse.json({ event: null, reason: 'signup_not_open' })
  }

  const dateStr = format(friday, 'yyyy-MM-dd')

  // Auto-create the event row if it doesn't exist yet
  const { data: existing } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('event_date', dateStr)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ event: existing })
  }

  const { data: created, error } = await supabaseAdmin
    .from('events')
    .insert({ event_date: dateStr, status: 'open' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: created })
}
