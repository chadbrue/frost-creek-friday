'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatTeeTime } from '@/lib/events'

interface Member {
  id: string
  player: {
    id: string
    first_name: string
    last_name: string
    ghin_number: string | null
  }
}

interface Group {
  id: string
  tee_time: string
  group_number: number
  members: Member[]
}

export default function GroupEditor({
  groups: initialGroups,
  eventId,
}: {
  groups: Group[]
  eventId: string
}) {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>(initialGroups)
  const [dragging, setDragging] = useState<{ memberId: string; fromGroupId: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  function onDragStart(memberId: string, fromGroupId: string) {
    setDragging({ memberId, fromGroupId })
  }

  function onDrop(toGroupId: string) {
    if (!dragging || dragging.fromGroupId === toGroupId) return

    setGroups((prev) => {
      const next = prev.map((g) => ({ ...g, members: [...g.members] }))
      const fromGroup = next.find((g) => g.id === dragging.fromGroupId)
      const toGroup = next.find((g) => g.id === toGroupId)
      if (!fromGroup || !toGroup) return prev

      const memberIndex = fromGroup.members.findIndex((m) => m.id === dragging.memberId)
      if (memberIndex === -1) return prev

      const [member] = fromGroup.members.splice(memberIndex, 1)
      toGroup.members.push(member)
      return next
    })

    setDragging(null)
  }

  async function saveChanges() {
    setSaving(true)
    setMsg('')

    // Persist all member group assignments
    const promises = groups.flatMap((g) =>
      g.members.map((m) =>
        fetch('/api/groups', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ member_id: m.id, new_group_id: g.id }),
        })
      )
    )

    await Promise.all(promises)
    setSaving(false)
    setMsg('✓ Changes saved.')
    router.refresh()
  }

  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {groups.map((g) => (
          <div
            key={g.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(g.id)}
            className="bg-white rounded-xl border-2 border-stone-200 p-4 min-h-[120px] transition-colors"
            style={dragging && dragging.fromGroupId !== g.id ? { borderColor: 'var(--fc-gold)' } : {}}
          >
            <p className="font-semibold text-sm mb-3" style={{ color: 'var(--fc-green)' }}>
              {formatTeeTime(g.tee_time)} — Group {g.group_number}
              <span className="ml-2 text-xs text-stone-400 font-normal">
                ({g.members.length} players)
              </span>
            </p>
            <ul className="space-y-1.5">
              {g.members.map((m) => (
                <li
                  key={m.id}
                  draggable
                  onDragStart={() => onDragStart(m.id, g.id)}
                  className="flex items-center gap-2 text-sm cursor-grab active:cursor-grabbing bg-stone-50 rounded-lg px-3 py-1.5 select-none"
                >
                  <span className="text-stone-400 text-xs">⣿</span>
                  <span>
                    {m.player.first_name} {m.player.last_name}
                    {m.player.ghin_number && (
                      <span className="text-stone-400 text-xs ml-1">({m.player.ghin_number})</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={saveChanges}
          disabled={saving}
          className="px-6 py-2.5 rounded-lg font-semibold text-white text-sm disabled:opacity-50"
          style={{ backgroundColor: 'var(--fc-green)' }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {msg && <p className="text-sm text-stone-600">{msg}</p>}
      </div>

      <p className="mt-3 text-xs text-stone-400">
        Drag and drop players between groups. Click &ldquo;Save Changes&rdquo; to persist before sending notifications.
      </p>
    </div>
  )
}
