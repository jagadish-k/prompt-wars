import { SignJWT, jwtVerify } from 'jose'

const secret = (): Uint8Array => {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET missing')
  return new TextEncoder().encode(s)
}

export async function makeSession(payload: { sub: string; email: string }) {
  const token = await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d').sign(secret())
  return token
}

export async function verifySession(req: Request): Promise<{ sub: string; email: string } | null> {
  const cookie = req.headers.get('cookie') ?? ''
  const match = cookie.match(/session=([^;]+)/)
  if (!match) return null
  try {
    const { payload } = await jwtVerify(match[1], secret())
    return { sub: String(payload.sub), email: String(payload.email) }
  } catch {
    return null
  }
}

export const sessionCookie = (token: string) =>
  `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`
