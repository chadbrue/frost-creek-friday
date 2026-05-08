'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminActions({
  eventId,
  eventStatus,
}: {
  eventId: string
  eventStatus: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function generateGroups() {
    if (!confirm('Randomly generate groups for this event? This will overwrite any existing groups.')) return
    setLoading(true)
    setMsg('')

    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setMsg(`Error: ${data.error}`)
      return
    }

    setMsg(
      data.proShopAlert
        ? '⚠️ Groups generated. Pro shop has been notified about an extra player.'
        : '✓ Groups generated successfully.'
    )
    router.refresh()
  }

  async function sendNotifications() {
    if (
      !confirm(
        'Send tee times and groups to all players via email and text? This cannot be undone.'
      )
    )
      return

    setLoading(true)
    setMsg('')

    const res = await fetch('/api/cron/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ''}`,
      },
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setMsg(`Error: ${data.error}`)
      return
    }

    setMsg(`✓ Notifications sent to all players.`)
    router.refresh()
  }

  async function logout() {
    await fetch('/api/admin', { method: 'DELETE' })
    window.location.href = '/admin'
  }

  const canGenerate = eventStatus === 'open' || eventStatus === 'closed' || eventStatus === 'groups_generated'
  const canSend = eventStatus === 'groups_generated'

  return (
    <div className="mt-4 flex flex-wrap gap-3 items-center">
      {canGenerate && (
        <button
          onClick={generateGroups}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--fc-green)' }}
        >
          {loading ? 'Working…' : '🎲 Generate Groups'}
        </button>
      )}

      {canSend && (
        <button
          onClick={sendNotifications}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
        >
          {loading ? 'Sending…' : '📧 Send Notifications Now'}
        </button>
      )}

      <button
        onClick={logout}
        className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold border border-stone-300 hover:bg-stone-50"
      >
        Sign Out
      </button>

      {msg && (
        <p className="w-full text-sm mt-1 text-stone-700">{msg}</p>
      )}
    </div>
  )
}
