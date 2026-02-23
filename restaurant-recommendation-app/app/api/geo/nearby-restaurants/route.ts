import { z } from "zod"
import { loadLists } from "@/app/api/_shared/restaurant-store"
import type { Restaurant } from "@/types/restaurant"

const querySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radius: z.coerce.number().default(2000), // 米
  listId: z.string().optional(),
  listIds: z.string().optional(),
})

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function GET(req: Request) {
  // 根据用户当前位置与半径返回附近餐馆，用于“附近已收藏/添加的餐馆”展示
  const url = new URL(req.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()))
  if (!parsed.success) {
    return Response.json({ error: "invalid_query", details: parsed.error.flatten() }, { status: 400 })
  }

  const { lat, lng, radius, listId, listIds } = parsed.data
  const lists = await loadLists()

  const allowIds = new Set<string>()
  if (listId) allowIds.add(listId)
  if (listIds) listIds.split(",").map((s) => s.trim()).filter(Boolean).forEach((id) => allowIds.add(id))

  const selectedLists = allowIds.size > 0 ? lists.filter((l) => allowIds.has(l.id)) : lists
  const all: Restaurant[] = selectedLists.flatMap((l) => l.restaurants || [])
  const nearby = all.filter((r) => haversine(lat, lng, r.lat, r.lng) <= radius)

  const markers = nearby
    .map((r) => ({
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
      distance: haversine(lat, lng, r.lat, r.lng),
    }))
    .sort((a, b) => a.distance - b.distance)

  return Response.json({ markers })
}

