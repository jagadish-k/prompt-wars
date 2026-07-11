import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
// NOTE: this file lives at netlify/functions/locations.ts, so db/ is two levels up
// (../../db/*), NOT ../db/* — that path resolves to netlify/db/* which does not exist.
// The brief had '../db/...'; corrected here (same bug that save-profile.ts caught).
import { getDb } from '../../db/client'
import { monitoredLocations } from '../../db/schema'
import { verifySession } from './auth/_session'

// Maximum monitored locations per user.
const MAX = 5

// Zod validation schema — exported for unit testing (see src/lib/__tests__/locations.test.ts),
// mirroring the save-profile.ts pattern.
// lat/lng must be finite numbers (rejects NaN/Infinity even if zod's default ever loosens).
export const Body = z.object({
  locationName: z.string().min(1),
  lat: z.number().finite(),
  lng: z.number().finite(),
  isPrimary: z.boolean().default(false),
})

// Shape stored rows into the API response contract (text lat/lng → numbers).
const mapRow = (r: typeof monitoredLocations.$inferSelect) => ({
  id: r.id,
  locationName: r.locationName,
  lat: Number(r.latitude),
  lng: Number(r.longitude),
  isPrimary: r.isPrimary,
})

const json = (status: number, body: unknown): Response => Response.json(body, { status })

export default async (req: Request): Promise<Response> => {
  try {
    const session = await verifySession(req)
    if (!session) return json(401, { error: 'unauthorized' })

    const db = getDb()
    const url = new URL(req.url)

    if (req.method === 'GET') {
      const rows = await db
        .select()
        .from(monitoredLocations)
        .where(eq(monitoredLocations.userId, session.sub))
      return Response.json(rows.map(mapRow))
    }

    if (req.method === 'POST') {
      // Enforce the per-user cap before accepting a new location.
      const owned = await db
        .select()
        .from(monitoredLocations)
        .where(eq(monitoredLocations.userId, session.sub))
      if (owned.length >= MAX) return json(409, { error: 'max 5 locations' })

      let raw: unknown
      try {
        raw = await req.json()
      } catch {
        return json(400, { error: 'invalid request body' })
      }
      const parsed = Body.safeParse(raw)
      if (!parsed.success) return json(400, { error: 'bad request' })
      const b = parsed.data

      const [row] = await db
        .insert(monitoredLocations)
        .values({
          userId: session.sub,
          locationName: b.locationName,
          latitude: String(b.lat),
          longitude: String(b.lng),
          isPrimary: b.isPrimary,
        })
        .returning()
      return Response.json(mapRow(row))
    }

    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id')
      if (!id) return json(400, { error: 'missing id' })
      // Scoped to the current user: the AND on userId means a caller can never
      // delete another user's location, even with a guessed/leaked id.
      await db
        .delete(monitoredLocations)
        .where(and(eq(monitoredLocations.id, id), eq(monitoredLocations.userId, session.sub)))
      return new Response(null, { status: 204 })
    }

    return new Response('method not allowed', { status: 405 })
  } catch (err) {
    console.error('locations failed', err)
    return json(500, { error: 'internal error' })
  }
}
