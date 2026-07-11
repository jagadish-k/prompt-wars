import { eq } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { users } from '../../db/schema'
import { verifySession } from './_session'

export default async (req: Request): Promise<Response> => {
  const session = await verifySession(req)
  if (!session) return new Response('unauthorized', { status: 401 })
  const db = getDb()
  const [u] = await db.select().from(users).where(eq(users.id, session.sub)).limit(1)
  if (!u) return new Response('not found', { status: 404 })
  return Response.json({
    id: u.id,
    email: u.email,
    preferredLanguage: u.preferredLanguage,
    householdSize: u.householdSize,
    dwellingType: u.dwellingType,
  })
}
