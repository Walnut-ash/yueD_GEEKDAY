import { z } from "zod"
import { loadLists } from "@/app/api/_shared/restaurant-store"
import type { Restaurant } from "@/types/restaurant"

const querySchema = z.object({
  neLat: z.coerce.number(),
  neLng: z.coerce.number(),
  swLat: z.coerce.number(),
  swLng: z.coerce.number(),
  listId: z.string().optional(),
  listIds: z.string().optional(),
})

function inBounds(r: Restaurant, neLat: number, neLng: number, swLat: number, swLng: number) {
  const withinLat = r.lat <= neLat && r.lat >= swLat
  const withinLng = r.lng <= neLng && r.lng >= swLng
  return withinLat && withinLng
}

export async function GET(req: Request) {
  // 根据地图视野（东北角/西南角）返回可见范围内的餐馆标记
  const url = new URL(req.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()))
  if (!parsed.success) {
    return Response.json({ error: "invalid_query", details: parsed.error.flatten() }, { status: 400 })
  }

  const { neLat, neLng, swLat, swLng, listId, listIds } = parsed.data
  const lists = await loadLists()

  const allowIds = new Set<string>()
  if (listId) allowIds.add(listId)
  if (listIds) listIds.split(",").map((s) => s.trim()).filter(Boolean).forEach((id) => allowIds.add(id))

  const selectedLists = allowIds.size > 0 ? lists.filter((l) => allowIds.has(l.id)) : lists
  const all: Restaurant[] = selectedLists.flatMap((l) => l.restaurants || [])
  const visible = all.filter((r) => inBounds(r, neLat, neLng, swLat, swLng))

  const markers = visible.map((r) => ({
    id: r.id,
    name: r.name,
    lat: r.lat,
    lng: r.lng,
    avgPrice: r.avgPrice,
    openTime: r.openTime,
    closeTime: r.closeTime,
    dishes: r.dishes,
    address: r.address,
    rating: r.rating,
    phone: r.phone,
    note: r.note,
    imageUrl: r.imageUrl,
  }))

  return Response.json({ markers })
}

