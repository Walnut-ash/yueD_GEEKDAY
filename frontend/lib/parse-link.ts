// 模拟解析社交媒体链接获取餐厅信息
// 在实际应用中，这里会调用豆包API进行智能识别

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
  try {
    const response = await fetch('/api/parse-xhs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    })

    if (!response.ok) {
      throw new Error('Failed to parse link')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Parse link error:', error)
    return null
  }
}
