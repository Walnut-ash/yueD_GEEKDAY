import { z } from "zod"
import { updateRestaurantInList } from "@/app/api/_shared/restaurant-store"
import type { Restaurant } from "@/types/restaurant"

const requestSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
})

export async function PATCH(req: Request, ctx: { params: Promise<{ listId: string; restaurantId: string }> }) {
  // 用户在前端编辑卡片后同步更新到后端（可选能力）
  const { listId, restaurantId } = await ctx.params

  const body = await req.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 })
  }

  const updated = await updateRestaurantInList(listId, restaurantId, parsed.data as Partial<Restaurant>)
  if (!updated) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }

  return Response.json({ restaurant: updated })
}

