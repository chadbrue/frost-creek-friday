import Image from 'next/image'
import Link from 'next/link'

export default function Header() {
  return (
    <header style={{ backgroundColor: 'var(--fc-green)' }} className="shadow-md">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="https://frostcreek.com/wp-content/uploads/2015/07/fc-logo.png"
            alt="Frost Creek Golf Course"
            width={180}
            height={90}
            style={{ objectFit: 'contain' }}
            unoptimized
          />
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/"
            className="text-white hover:text-yellow-300 transition-colors font-semibold tracking-wide"
          >
            Home
          </Link>
          <Link
            href="/signup"
            className="text-white hover:text-yellow-300 transition-colors font-semibold tracking-wide"
          >
            Sign Up
          </Link>
          <Link
            href="/roster"
            className="text-white hover:text-yellow-300 transition-colors font-semibold tracking-wide"
          >
            Who&apos;s Playing
          </Link>
          <Link
            href="/my-signup"
            className="text-white hover:text-yellow-300 transition-colors font-semibold tracking-wide"
          >
            My Signup
          </Link>
        </nav>
      </div>
    </header>
  )
}
