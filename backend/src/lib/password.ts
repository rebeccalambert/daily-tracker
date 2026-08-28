import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const KEY_LENGTH = 64

// Stored as "salt:hash", both hex — no external dependency, no native binary.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer
  return `${salt}:${derivedKey.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(':')
  if (!salt || !hashHex) return false

  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer
  const storedKey = Buffer.from(hashHex, 'hex')

  // Lengths must match before timingSafeEqual — it throws on mismatched buffers.
  if (derivedKey.length !== storedKey.length) return false
  return timingSafeEqual(derivedKey, storedKey)
}
