// 解析社交媒体链接获取餐厅信息（后端 + LLM + 地图补全）
// 前端只负责把用户粘贴的链接传给后端，并接收结构化结果

export interface ParsedRestaurant {
  name: string
  address: string
  avgPrice: number
  openTime: string
  closeTime: string
  dishes: string[]
  tags: string[]
  rating: number
  lat: number
  lng: number
  source: string
  sourceUrl: string
  imageUrl: string
}

export async function parseRestaurantLink(url: string): Promise<ParsedRestaurant | null> {
  if (!url?.trim()) return null

  try {
    const res = await fetch("/api/parse-restaurant-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    })

    if (!res.ok) return null
    const data = (await res.json()) as ParsedRestaurant

    if (!data?.name) return null
    return data
  } catch {
    return null
  }
}
