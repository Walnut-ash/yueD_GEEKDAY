
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client for Doubao (Ark)
const client = new OpenAI({
  apiKey: process.env.DOUBAO_API_KEY,
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
})

export async function POST(request: Request) {
  try {
    const { url } = await request.json()
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // 1. Prompt engineering
    const prompt = `
    请分析以下关于餐厅的文本或链接： "${url}"
    
    请提取或推断以下详细信息，并以 JSON 格式返回：
    {
      "name": "餐厅名称",
      "address": "详细地址（包括城市、区、街道）",
      "city": "城市名称（例如：北京、上海、普宁）",
      "avgPrice": 数字（人均消费，人民币）,
      "openTime": "HH:MM",
      "closeTime": "HH:MM",
      "dishes": ["推荐菜1", "推荐菜2"],
      "tags": ["标签1", "标签2"],
      "rating": 数字（0-5分）
    }

    规则：
    - 如果输入只是一个 URL，请尝试从 URL 结构猜测或返回通用的“未知餐厅”，但提示用户提供更多文本。
    - 如果输入包含中文字符（例如复制的分享文案），请优先使用这些信息。
    - 如果未提及城市，请尝试根据上下文（例如著名地标）进行推断。如果无法确定，请留空。
    - 对于标签（tags），请尝试对餐厅进行分类（例如“川菜”、“火锅”、“约会”、“家庭聚餐”）。
    - 仅返回 JSON 格式的数据，不要包含 markdown 代码块。
    `

    const completion = await client.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a helpful assistant that extracts restaurant info as JSON.' },
        { role: 'user', content: prompt }
      ],
      model: process.env.DOUBAO_MODEL_ID || 'doubao-pro-4k', 
    })

    const content = completion.choices[0]?.message?.content
    console.log(`[Doubao] Response: ${content}`)
    
    // Parse JSON
    let parsedData
    try {
      const jsonStr = content?.replace(/```json/g, '').replace(/```/g, '').trim()
      if (jsonStr) parsedData = JSON.parse(jsonStr)
    } catch (e) {
      console.error('JSON Parse Error', e)
    }

    if (!parsedData) {
       return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    // 2. Geocoding / POI Search
    // Use Amap Web Service Place Search API (v3/place/text) to find the POI
    // This is better than Geocoding API for finding specific shops/restaurants by name.
    let lat = 23.30324 // Default Puning
    let lng = 116.16147

    if (parsedData.name || parsedData.address) {
      const city = parsedData.city || ''
      // Combine city + name + address for best search result
      // e.g. "Beijing Haidilao (Sanlitun)"
      const keywords = [city, parsedData.name, parsedData.address].filter(Boolean).join(' ')
      
      // Use Web Service Key for backend API calls
      const key = process.env.AMAP_WEB_SERVICE_KEY || process.env.NEXT_PUBLIC_AMAP_KEY
      
      try {
        // Use Place Search API with extensions=all to get detailed info (price, rating, opening hours)
        const poiUrl = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(keywords)}&city=${encodeURIComponent(city)}&offset=1&page=1&extensions=all&key=${key}`
        const poiRes = await fetch(poiUrl)
        const poiData = await poiRes.json()

        if (poiData.status === '1' && poiData.pois && poiData.pois.length > 0) {
          // Take the first result
          const poi = poiData.pois[0]
          const location = poi.location
          const [l, t] = location.split(',')
          lng = parseFloat(l)
          lat = parseFloat(t)
          
          // Always use the POI address/name as it is more accurate than AI's guess
          parsedData.address = poi.address || poi.name
          parsedData.name = poi.name // Also update name to the official one
          
          // Enrich data with POI info if missing from AI
           if (poi.biz_ext) {
              // Price
              if (!parsedData.avgPrice && poi.biz_ext.cost) {
                  const cost = parseFloat(poi.biz_ext.cost)
                  if (!isNaN(cost)) parsedData.avgPrice = cost
              }
              // Rating
              if (!parsedData.rating && poi.biz_ext.rating) {
                  const rating = parseFloat(poi.biz_ext.rating)
                  if (!isNaN(rating)) parsedData.rating = rating
              }
              // Open time
              if (!parsedData.openTime && poi.biz_ext.open_time) {
                  // Format might be "09:00-22:00" or complex text
                  const timeStr = poi.biz_ext.open_time
                  if (timeStr.includes('-')) {
                      const [open, close] = timeStr.split('-')
                      parsedData.openTime = open
                      parsedData.closeTime = close
                  }
              }
           }
          
          if (poi.type) {
             // Append POI type to tags if not present
             const poiTypes = poi.type.split(';')
             // Filter out generic types
             const validTypes = poiTypes.filter((t: string) => !t.includes('餐饮') && !t.includes('餐厅'))
             parsedData.tags = [...new Set([...(parsedData.tags || []), ...validTypes])].slice(0, 5)
          }

          // Image handling
          if (poi.photos && poi.photos.length > 0) {
              parsedData.imageUrl = poi.photos[0].url
          }
        } else {
           console.warn('[POI Search] Failed or no results:', poiData)
           // Fallback to Geocoding if POI search fails but we have an address
           if (parsedData.address) {
             const geoUrl = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(parsedData.address)}&city=${encodeURIComponent(city)}&key=${key}`
             const geoRes = await fetch(geoUrl)
             const geoData = await geoRes.json()
             if (geoData.status === '1' && geoData.geocodes?.length > 0) {
                const location = geoData.geocodes[0].location
                const [l, t] = location.split(',')
                lng = parseFloat(l)
                lat = parseFloat(t)
             }
           }
        }
      } catch (e) {
        console.error('Location Search Error', e)
      }
    }

    return NextResponse.json({
      ...parsedData,
      lat,
      lng,
      source: 'Doubao AI',
      sourceUrl: url,
      imageUrl: parsedData.imageUrl || '/placeholder.svg'
    })

  } catch (error) {
    console.error('[API Error]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}