/**
 * Run once to create the initial admin account.
 * Usage: node supabase/seed-admin.js
 *
 * Make sure SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL are set
 * in your environment (copy from .env.local).
 */

const bcrypt = require('bcryptjs')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.')
  process.exit(1)
}

const USERNAME = 'frostcreekadmin'
const PASSWORD = 'ChangeMe2024!'

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const hash = await bcrypt.hash(PASSWORD, 12)

  const { error } = await supabase
    .from('admins')
    .upsert({ username: USERNAME, password_hash: hash }, { onConflict: 'username' })

  if (error) {
    console.error('Failed:', error.message)
    process.exit(1)
  }

  console.log(`Admin created: username="${USERNAME}"  password="${PASSWORD}"`)
  console.log('IMPORTANT: Change the password after first login.')
}

main()
