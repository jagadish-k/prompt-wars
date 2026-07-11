import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../../db/client'
import { users, monitoredLocations, vulnerabilities } from '../../db/schema'
import { verifySession } from './auth/_session'

// Zod validation schema — exported for unit testing (see src/lib/__tests__/save-profile.test.ts).
export const Body = z.object({
  lat: z.number(),
  lng: z.number(),
  city: z.string(),
  dwellingType: z.enum(['ground_floor', 'high_rise', 'independent_house']),
  householdSize: z.number().int().min(1),
  vulnerabilityTypes: z.array(z.string()).default([]),
})

const json = (status: number, body: unknown): Response => Response.json(body, { status })

export default async (req: Request): Promise<Response> => {
  try {
    const session = await verifySession(req)
    if (!session) return new Response('unauthorized', { status: 401 })

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return json(400, { error: 'invalid request body' })
    }
    const parsed = Body.safeParse(raw)
    if (!parsed.success) return json(400, { error: 'bad request' })
    const b = parsed.data

    const db = getDb()
    // Single transaction: update profile, then replace location + vulnerabilities for this user.
    // Delete-then-insert keeps onboarding idempotent (re-submits don't accumulate rows).
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ dwellingType: b.dwellingType, householdSize: b.householdSize })
        .where(eq(users.id, session.sub))
      await tx.delete(monitoredLocations).where(eq(monitoredLocations.userId, session.sub))
      await tx.delete(vulnerabilities).where(eq(vulnerabilities.userId, session.sub))
      await tx.insert(monitoredLocations).values({
        userId: session.sub,
        locationName: b.city,
        latitude: String(b.lat),
        longitude: String(b.lng),
        isPrimary: true,
      })
      if (b.vulnerabilityTypes.length) {
        await tx
          .insert(vulnerabilities)
          .values(b.vulnerabilityTypes.map((type) => ({ userId: session.sub, type })))
      }
    })
    return Response.json({ ok: true })
  } catch (err) {
    console.error('save-profile failed', err)
    return json(500, { error: 'internal error' })
  }
}
