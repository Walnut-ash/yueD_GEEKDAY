import { z } from "zod"
import { createList, loadLists } from "@/app/api/_shared/restaurant-store"

const createSchema = z.object({
  name: z.string().min(1),
})

export async function GET() {
  const lists = await loadLists()
  return Response.json({ lists })
}

export async function POST(req: Request) {
  // 创建一个新的收藏夹/朋友圈（用于后端持久化协同场景）
  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 })
  }

  const list = await createList(parsed.data.name)
  return Response.json({ list }, { status: 201 })
}

