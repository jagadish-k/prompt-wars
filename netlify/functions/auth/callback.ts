import { OAuth2Client } from 'google-auth-library'
import { eq } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { users } from '../../db/schema'
import { makeSession, sessionCookie } from './_session'

export default async (req: Request): Promise<Response> => {
  const { credential } = (await req.json()) as { credential?: string }
  if (!credential) return new Response('missing credential', { status: 400 })

  const clientId = process.env.VITE_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID
  const oauth = new OAuth2Client(clientId)
  const ticket = await oauth.verifyIdToken({ idToken: credential, audience: clientId })
  const payload = ticket.getPayload()!
  const email = payload.email!

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
}
