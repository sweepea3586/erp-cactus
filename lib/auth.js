import crypto from 'crypto'
import { cookies } from 'next/headers'
import { getDb } from './db.js'

const SESSION_COOKIE = 'cls_session'
const SECRET = process.env.SESSION_SECRET || 'cactus-secret'

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  if (!stored) return false
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const test = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return test === hash
}

function sign(value) {
  const sig = crypto.createHmac('sha256', SECRET).update(value).digest('hex')
  return `${value}.${sig}`
}

function unsign(signed) {
  if (!signed) return null
  const idx = signed.lastIndexOf('.')
  if (idx < 0) return null
  const value = signed.slice(0, idx)
  const sig = signed.slice(idx + 1)
  const expected = crypto.createHmac('sha256', SECRET).update(value).digest('hex')
  if (expected !== sig) return null
  return value
}

export function setSessionCookie(userId) {
  const signed = sign(userId)
  cookies().set(SESSION_COOKIE, signed, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
}

export async function getCurrentUser() {
  const cookieStore = cookies()
  const signed = cookieStore.get(SESSION_COOKIE)?.value
  const userId = unsign(signed)
  if (!userId) return null
  const db = await getDb()
  const user = await db.collection('users').findOne({ id: userId })
  if (!user) return null
  const { password_hash, _id, ...rest } = user
  return rest
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    const err = new Error('Unauthorized')
    err.status = 401
    throw err
  }
  return user
}
