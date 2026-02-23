import { generateObject } from "ai"
import { z } from "zod"

const filterResultSchema = z.object({
  matchedIds: z.array(z.string()).describe("符合用户描述的餐厅ID列表"),
  explanation: z.string().describe("简短解释为什么这些餐厅符合条件"),
})

export async function POST(req: Request) {
  const { query, restaurants } = await req.json()

  // 构建餐厅信息摘要供AI分析
  const restaurantSummaries = restaurants.map((r: any) => ({
    id: r.id,
    name: r.name,
    avgPrice: r.avgPrice,
    tags: r.tags,
    dishes: r.dishes,
    rating: r.rating,
    address: r.address,
  }))

  const { object } = await generateObject({
    model: "openai/gpt-4o-mini",
    schema: filterResultSchema,
    prompt: `你是一个餐厅推荐助手。用户想要筛选餐厅，请根据用户的描述，从以下餐厅列表中选出最符合条件的餐厅。

用户描述：${query}

餐厅列表：
${JSON.stringify(restaurantSummaries, null, 2)}

请分析用户的需求（价格偏好、口味偏好、场景需求等），返回符合条件的餐厅ID列表。如果没有完全匹配的，返回最接近的选项。`,
    maxOutputTokens: 1000,
  })

  return Response.json(object)
}
