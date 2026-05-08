import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Look up player by email or phone
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')?.toLowerCase().trim()
  const phone = searchParams.get('phone')?.replace(/\D/g, '')

  if (!email && !phone) {
    return NextResponse.json({ error: 'Provide email or phone' }, { status: 400 })
  }

  let query = supabaseAdmin.from('players').select('*')
  if (email) query = query.eq('email', email)
  else if (phone) query = query.ilike('phone', `%${phone}%`)

  const { data, error } = await query.maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ player: null })
  return NextResponse.json({ player: data })
}

// Create or update player profile
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { first_name, last_name, email, phone, ghin_number } = body

  if (!first_name || !last_name || !email || !phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const normalized = {
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone.replace(/\D/g, ''),
    ghin_number: ghin_number?.trim() || null,
  }

  const { data, error } = await supabaseAdmin
    .from('players')
    .upsert(normalized, { onConflict: 'email' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ player: data })
}

// Update existing player profile
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, first_name, last_name, email, phone, ghin_number } = body

  if (!id) return NextResponse.json({ error: 'Missing player id' }, { status: 400 })

  const updates: Record<string, string | null> = {}
  if (first_name) updates.first_name = first_name.trim()
  if (last_name) updates.last_name = last_name.trim()
  if (email) updates.email = email.toLowerCase().trim()
  if (phone) updates.phone = phone.replace(/\D/g, '')
  if (ghin_number !== undefined) updates.ghin_number = ghin_number?.trim() || null

  const { data, error } = await supabaseAdmin
    .from('players')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ player: data })
}
