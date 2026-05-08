import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { AdminSession } from '@/types'

const SECRET = process.env.JWT_SECRET ?? 'change-me-in-production'
const COOKIE = 'fc_admin'

export function signAdminToken(username: string): string {
  return jwt.sign({ username }, SECRET, { expiresIn: '12h' })
}

export function verifyAdminToken(token: string): AdminSession | null {
  try {
    return jwt.verify(token, SECRET) as AdminSession
  } catch {
    return null
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE)?.value
  if (!token) return null
  return verifyAdminToken(token)
}

export { COOKIE as ADMIN_COOKIE }
