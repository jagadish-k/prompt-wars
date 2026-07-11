import { SignJWT, jwtVerify } from 'jose'

const enc = () => new TextEncoder().encode(process.env.SESSION_SECRET!)

export async function makeSession(payload: { sub: string; email: string }) {
  const token = await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d').sign(enc())
  return token
}

export async function verifySession(req: Request): Promise<{ sub: string; email: string } | null> {
  const cookie = req.headers.get('cookie') ?? ''
  const match = cookie.match(/session=([^;]+)/)
  if (!match) return null
  try {
    const { payload } = await jwtVerify(match[1], enc())
    return { sub: String(payload.sub), email: String(payload.email) }
  } catch {
    return null
  }
}

export const sessionCookie = (token: string) =>
  `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`
