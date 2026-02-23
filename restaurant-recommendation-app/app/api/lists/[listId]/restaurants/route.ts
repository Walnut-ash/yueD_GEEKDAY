import { z } from "zod"
import { addRestaurantToList, loadLists } from "@/app/api/_shared/restaurant-store"

const restaurantSchema = z.object({
  name: z.string().min(1),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  avgPrice: z.number(),
  openTime: z.string(),
  closeTime: z.string(),
  dishes: z.array(z.string()),
  tags: z.array(z.string()),
  rating: z.number().optional(),
  phone: z.string().optional(),
  note: z.string().optional(),
  source: z.string().optional(),
  sourceUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  excluded: z.boolean().optional(),
})

const requestSchema = z.object({
  restaurant: restaurantSchema,
})

export async function POST(req: Request, ctx: { params: Promise<{ listId: string }> }) {
  // 用户确认/编辑后，把餐馆卡片写入指定收藏夹
  const { listId } = await ctx.params

  const body = await req.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 })
  }

  const created = await addRestaurantToList(listId, parsed.data.restaurant)
  if (!created) {
    return Response.json({ error: "list_not_found" }, { status: 404 })
  }

  return Response.json({ restaurant: created }, { status: 201 })
}

export async function GET(_req: Request, ctx: { params: Promise<{ listId: string }> }) {
  // 获取列表内所有餐馆（用于初始化地图或详情）
  const { listId } = await ctx.params
  const lists = await loadLists()
  const list = lists.find((l) => l.id === listId)
  if (!list) {
    return Response.json({ error: "list_not_found" }, { status: 404 })
  }
  return Response.json({ restaurants: list.restaurants ?? [] })
}
