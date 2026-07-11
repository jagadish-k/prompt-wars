export default async (_req: Request, context: { geo?: { city?: string; latitude?: number; longitude?: number } }) => {
  const { city, latitude, longitude } = context.geo ?? {}
  if (!city || latitude == null) return new Response('unknown', { status: 404 })
  return Response.json({ city, lat: latitude, lng: longitude })
}
