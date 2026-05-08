'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { TEE_LABELS, TeePreference, Player } from '@/types'
import { formatEventDate } from '@/lib/events'

type Step = 'lookup' | 'profile' | 'tee' | 'confirm' | 'done'

export default function SignupPage() {
  const [step, setStep] = useState<Step>('lookup')
  const [lookup, setLookup] = useState('')
  const [player, setPlayer] = useState<Player | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    ghin_number: '',
  })
  const [teePreference, setTeePreference] = useState<TeePreference>('creek')
  const [event, setEvent] = useState<{ id: string; event_date: string; status: string } | null>(null)
  const [signupStatus, setSignupStatus] = useState<'confirmed' | 'waitlist' | null>(null)
  const [confirmedCount, setConfirmedCount] = useState(0)
  const [waitlistCount, setWaitlistCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((d) => {
        if (d.event) setEvent(d.event)
      })
  }, [])

  useEffect(() => {
    if (!event) return
    fetch(`/api/signups?event_id=${event.id}`)
      .then((r) => r.json())
      .then((d) => {
        const signups = d.signups ?? []
        setConfirmedCount(signups.filter((s: { status: string }) => s.status === 'confirmed').length)
        setWaitlistCount(signups.filter((s: { status: string }) => s.status === 'waitlist').length)
      })
  }, [event])

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const isEmail = lookup.includes('@')
    const param = isEmail
      ? `email=${encodeURIComponent(lookup.trim())}`
      : `phone=${encodeURIComponent(lookup.replace(/\D/g, ''))}`

    const res = await fetch(`/api/players?${param}`)
    const data = await res.json()
    setLoading(false)

    if (data.player) {
      setPlayer(data.player)
      setProfile({
        first_name: data.player.first_name,
        last_name: data.player.last_name,
        email: data.player.email,
        phone: data.player.phone,
        ghin_number: data.player.ghin_number ?? '',
      })
      setStep('profile')
    } else {
      // New player
      const isEmail2 = lookup.includes('@')
      setProfile((p) => ({
        ...p,
        email: isEmail2 ? lookup.trim() : '',
        phone: !isEmail2 ? lookup.trim() : '',
      }))
      setStep('profile')
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/players', {
      method: player ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...(player ? { id: player.id } : {}), ...profile }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Failed to save profile')
      return
    }

    setPlayer(data.player)
    setIsEditing(false)
    setStep('tee')
  }

  async function handleSubmit() {
    if (!player || !event) return
    setError('')
    setLoading(true)

    const res = await fetch('/api/signups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id: player.id,
        event_id: event.id,
        tee_preference: teePreference,
        event_date: event.event_date,
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Signup failed')
      return
    }

    setSignupStatus(data.status)
    setStep('done')
  }

  if (!event) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--fc-green)' }}>
              Signup Not Open Yet
            </h2>
            <p className="text-stone-600">
              Signup opens each Saturday for the coming Friday and closes Thursday at 5:00 PM.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (event.status === 'notified') {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--fc-green)' }}>
              Signup Closed
            </h2>
            <p className="text-stone-600">
              Groups for {formatEventDate(event.event_date)} have already been sent out. See you next week!
            </p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 max-w-lg mx-auto px-4 py-10 w-full">
        {/* Event header */}
        <div className="text-center mb-8">
          <p className="text-sm uppercase tracking-widest text-stone-500 mb-1">Signing up for</p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fc-green)' }}>
            {formatEventDate(event.event_date)}
          </h1>
          <div className="flex justify-center gap-6 mt-3 text-sm text-stone-600">
            <span>{confirmedCount} signed up</span>
            <span>{Math.max(0, 28 - confirmedCount)} spots left</span>
            {waitlistCount > 0 && <span>{waitlistCount} on waitlist</span>}
          </div>
        </div>

        {/* Step indicator */}
        <StepIndicator current={step} />

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step: Lookup */}
        {step === 'lookup' && (
          <Card title="Find Your Profile">
            <p className="text-sm text-stone-500 mb-4">
              Enter your email or mobile number to look up your saved profile.
            </p>
            <form onSubmit={handleLookup} className="space-y-4">
              <input
                type="text"
                placeholder="Email or mobile number"
                value={lookup}
                onChange={(e) => setLookup(e.target.value)}
                required
                className="w-full border border-stone-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-700"
              />
              <Btn loading={loading}>Continue</Btn>
            </form>
          </Card>
        )}

        {/* Step: Profile */}
        {step === 'profile' && (
          <Card title={player && !isEditing ? 'Confirm Your Profile' : player ? 'Edit Profile' : 'Create Profile'}>
            {player && !isEditing ? (
              <div className="space-y-3">
                <ProfileRow label="Name" value={`${player.first_name} ${player.last_name}`} />
                <ProfileRow label="Email" value={player.email} />
                <ProfileRow label="Mobile" value={player.phone} />
                <ProfileRow label="GHIN" value={player.ghin_number ?? '—'} />
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 border border-stone-300 rounded-lg py-2 text-sm hover:bg-stone-50 transition-colors"
                  >
                    Edit Profile
                  </button>
                  <Btn onClick={() => setStep('tee')} className="flex-1">
                    This is me →
                  </Btn>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="First Name"
                    value={profile.first_name}
                    onChange={(v) => setProfile((p) => ({ ...p, first_name: v }))}
                    required
                  />
                  <Field
                    label="Last Name"
                    value={profile.last_name}
                    onChange={(v) => setProfile((p) => ({ ...p, last_name: v }))}
                    required
                  />
                </div>
                <Field
                  label="Email"
                  type="email"
                  value={profile.email}
                  onChange={(v) => setProfile((p) => ({ ...p, email: v }))}
                  required
                />
                <Field
                  label="Mobile Number"
                  type="tel"
                  value={profile.phone}
                  onChange={(v) => setProfile((p) => ({ ...p, phone: v }))}
                  required
                />
                <Field
                  label="GHIN Number (optional)"
                  value={profile.ghin_number}
                  onChange={(v) => setProfile((p) => ({ ...p, ghin_number: v }))}
                />
                <Btn loading={loading}>Save & Continue</Btn>
              </form>
            )}
          </Card>
        )}

        {/* Step: Tee preference */}
        {step === 'tee' && (
          <Card title="Select Your Tees">
            <div className="space-y-3 mb-6">
              {(Object.entries(TEE_LABELS) as [TeePreference, string][]).map(([key, label]) => (
                <label
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    teePreference === key
                      ? 'border-green-700 bg-green-50'
                      : 'border-stone-200 hover:border-stone-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="tee"
                    value={key}
                    checked={teePreference === key}
                    onChange={() => setTeePreference(key)}
                    className="accent-green-800"
                  />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </div>
            <Btn onClick={() => setStep('confirm')}>Review & Submit</Btn>
          </Card>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && player && (
          <Card title="Confirm Signup">
            <div className="space-y-3 mb-6">
              <ProfileRow label="Name" value={`${player.first_name} ${player.last_name}`} />
              <ProfileRow label="Date" value={formatEventDate(event.event_date)} />
              <ProfileRow label="Tees" value={TEE_LABELS[teePreference]} />
              <ProfileRow label="Mobile" value={player.phone} />
              <ProfileRow label="Email" value={player.email} />
            </div>
            <p className="text-xs text-stone-500 mb-4">
              You&apos;ll receive your tee time and group by 6:15 PM on Thursday via email and text.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('tee')}
                className="flex-1 border border-stone-300 rounded-lg py-2 text-sm hover:bg-stone-50 transition-colors"
              >
                ← Back
              </button>
              <Btn loading={loading} onClick={handleSubmit} className="flex-1">
                Confirm Signup
              </Btn>
            </div>
          </Card>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <Card title="">
            <div className="text-center py-4">
              <div className="text-5xl mb-4">{signupStatus === 'confirmed' ? '⛳' : '⏳'}</div>
              {signupStatus === 'confirmed' ? (
                <>
                  <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--fc-green)' }}>
                    You&apos;re In!
                  </h2>
                  <p className="text-stone-600 text-sm">
                    You&apos;re signed up for {formatEventDate(event.event_date)}. Your tee time and group
                    will be sent Thursday evening by 6:15 PM.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold mb-2 text-amber-700">
                    You&apos;re on the Waitlist
                  </h2>
                  <p className="text-stone-600 text-sm">
                    All spots are currently filled. You&apos;re on the waitlist and we&apos;ll notify you
                    if a spot opens up.
                  </p>
                </>
              )}
            </div>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  )
}

// ── Small shared UI helpers ──────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'lookup', label: 'Find' },
    { key: 'profile', label: 'Profile' },
    { key: 'tee', label: 'Tees' },
    { key: 'confirm', label: 'Confirm' },
  ]
  const index = steps.findIndex((s) => s.key === current)

  return (
    <div className="flex items-center justify-center mb-8 gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i <= index
                ? 'text-white'
                : 'bg-stone-200 text-stone-400'
            }`}
            style={i <= index ? { backgroundColor: 'var(--fc-green)' } : {}}
          >
            {i + 1}
          </div>
          <span className={`text-xs ${i <= index ? 'text-green-800 font-semibold' : 'text-stone-400'}`}>
            {s.label}
          </span>
          {i < steps.length - 1 && <div className="w-4 h-px bg-stone-300" />}
        </div>
      ))}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
      {title && (
        <h2 className="text-lg font-bold mb-5" style={{ color: 'var(--fc-green)' }}>
          {title}
        </h2>
      )}
      {children}
    </div>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs text-stone-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
      />
    </div>
  )
}

function Btn({
  children,
  loading,
  onClick,
  className = '',
}: {
  children: React.ReactNode
  loading?: boolean
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={loading}
      className={`w-full py-2.5 rounded-lg font-semibold text-white transition-opacity disabled:opacity-50 ${className}`}
      style={{ backgroundColor: 'var(--fc-green)' }}
    >
      {loading ? 'Loading…' : children}
    </button>
  )
}
