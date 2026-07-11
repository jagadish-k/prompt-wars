import { OAuth2Client } from 'google-auth-library'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../db/client'
import { users } from '../../../db/schema'
import { makeSession, sessionCookie } from './_session'

const json = (status: number, body: unknown): Response =>
  Response.json(body, { status })

export default async (req: Request): Promise<Response> => {
  try {
    let credential: string | undefined
    try {
      ;({ credential } = (await req.json()) as { credential?: string })
    } catch {
      return json(400, { error: 'invalid request body' })
    }
    if (!credential) return json(400, { error: 'missing credential' })

    const clientId = process.env.VITE_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID
    const oauth = new OAuth2Client(clientId)
    let ticket
    try {
      ticket = await oauth.verifyIdToken({ idToken: credential, audience: clientId })
    } catch {
      return json(401, { error: 'invalid token' })
    }
    const payload = ticket.getPayload()
    if (!payload || !payload.email) return json(400, { error: 'missing email' })
    const email = payload.email

    const db = getDb()
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)
    let user = existing[0]
    if (!user) {
      const [created] = await db.insert(users).values({ email }).returning()
      user = created
    }

    const token = await makeSession({ sub: user.id, email })
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie(token) },
    })
  } catch (err) {
    console.error('callback failed', err)
    return json(500, { error: 'internal error' })
  }
}
