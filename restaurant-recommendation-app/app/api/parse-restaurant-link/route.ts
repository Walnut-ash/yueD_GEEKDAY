import { z } from "zod"

const requestSchema = z.object({
  url: z.string().url(),
  city: z.string().optional(),
})

const llmExtractSchema = z.object({
  restaurantName: z.string().min(1),
  recommendedDishes: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  addressHint: z.string().optional(),
  avgPriceHint: z.number().optional(),
})

function detectSource(url: string) {
  const lower = url.toLowerCase()
  if (lower.includes("xiaohongshu") || lower.includes("xhs")) return "小红书"
  if (lower.includes("douyin") || lower.includes("tiktok")) return "抖音"
  return "未知"
}

function stripHtmlToText(html: string) {
  // 简单的 HTML 文本抽取：去除 script/style，保留可见文本供 LLM 参考
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
  const text = withoutScripts
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return text
}

function extractScriptHints(html: string) {
  // 小红书/抖音的正文、简介、部分评论常以 JSON 形式嵌在 script 中，这里只抽取可疑片段给 LLM
  const scripts: string[] = []
  const re = /<script[^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html))) {
    const raw = match[1] ?? ""
    const snippet = raw.replace(/\s+/g, " ").trim()
    if (!snippet) continue

    const lower = snippet.toLowerCase()
    const hit =
      lower.includes("description") ||
      lower.includes("desc") ||
      lower.includes("comment") ||
      lower.includes("content") ||
      lower.includes("note") ||
      lower.includes("title") ||
      lower.includes("poi") ||
      lower.includes("address")

    if (hit) scripts.push(snippet.slice(0, 4000))
    if (scripts.length >= 6) break
  }

  return scripts.join("\n")
}

function extractMeta(html: string) {
  // 提取页面 meta 信息（标题、摘要、封面图），便于在内容被反爬截断时仍有可用上下文
  const getMeta = (propertyOrName: string) => {
    const re1 = new RegExp(`<meta[^>]+property=["']${propertyOrName}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i")
    const re2 = new RegExp(`<meta[^>]+name=["']${propertyOrName}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i")
    const m1 = html.match(re1)
    if (m1?.[1]) return m1[1]
    const m2 = html.match(re2)
    if (m2?.[1]) return m2[1]
    return undefined
  }

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch?.[1]?.trim()

  return {
    title,
    ogTitle: getMeta("og:title"),
    description: getMeta("description") ?? getMeta("og:description"),
    ogImage: getMeta("og:image"),
  }
}

async function fetchPageText(url: string) {
  // 服务器侧抓取链接页面文本（实际业务中可替换为更稳健的抓取/解析服务）
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    })

    const html = await res.text()
    const meta = extractMeta(html)
    const visibleText = stripHtmlToText(html)
    const scriptHints = extractScriptHints(html)
    const text = [visibleText, scriptHints].filter(Boolean).join("\n\n")
    return { ok: true as const, meta, text }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "fetch_failed" }
  } finally {
    clearTimeout(timeout)
  }
}

async function doubaoExtract(args: { source: string; url: string; meta: { title?: string; ogTitle?: string; description?: string }; pageText: string }) {
  // 调用豆包（火山方舟）对话接口进行结构化信息抽取
  const apiKey = (globalThis as any).process?.env?.DOUBAO_ARK_API_KEY
  const model = (globalThis as any).process?.env?.DOUBAO_ARK_MODEL ?? "doubao-1.5-pro-32k-250115"

  if (!apiKey) {
    throw new Error("Missing DOUBAO_ARK_API_KEY")
  }

  const userPayload = {
    source: args.source,
    url: args.url,
    title: args.meta.ogTitle ?? args.meta.title,
    description: args.meta.description,
    pageText: args.pageText.slice(0, 20_000),
  }

  const prompt = `你是一个餐馆信息抽取助手。请从给定的社交媒体链接内容中抽取餐馆信息。

要求：
1) 只输出严格 JSON，不要输出任何额外文字。
2) dish/tag 都是字符串数组，去重、去空、不要超过 10 个。
3) restaurantName 必填；如果有多个候选，选最像店名的那个（含分店名也可以）。
4) addressHint 可选：只写你能从内容里确定的片段，不要编造门牌号。
5) avgPriceHint 可选：如果能推断人均，输出数字（人民币）。

输出 JSON schema：
{
  "restaurantName": "string",
  "recommendedDishes": ["string"],
  "tags": ["string"],
  "addressHint": "string (optional)",
  "avgPriceHint": 0 (optional)
}

输入：
${JSON.stringify(userPayload)}`

  const res = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You extract restaurant info and output strict JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Doubao request failed: ${res.status} ${text}`)
  }

  const data = (await res.json()) as any
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Doubao returned empty content")
  }

  const jsonText = (() => {
    const trimmed = content.trim()
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed
    const first = trimmed.indexOf("{")
    const last = trimmed.lastIndexOf("}")
    if (first >= 0 && last > first) return trimmed.slice(first, last + 1)
    return trimmed
  })()

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error("Failed to parse Doubao JSON output")
  }

  const obj = llmExtractSchema.parse(parsed)
  return {
    restaurantName: obj.restaurantName.trim(),
    recommendedDishes: Array.from(new Set(obj.recommendedDishes.map((s) => s.trim()).filter(Boolean))).slice(0, 10),
    tags: Array.from(new Set(obj.tags.map((s) => s.trim()).filter(Boolean))).slice(0, 10),
    addressHint: obj.addressHint?.trim() || undefined,
    avgPriceHint: typeof obj.avgPriceHint === "number" && Number.isFinite(obj.avgPriceHint) ? obj.avgPriceHint : undefined,
  }
}

async function amapEnrich(args: { name: string; city?: string; addressHint?: string }) {
  // 使用高德 Web 服务关键字搜索补全 POI 信息：地址、经纬度、人均、评分、营业时间等
  const key = (globalThis as any).process?.env?.AMAP_KEY
  if (!key) {
    return null
  }

  const keywords = [args.name, args.addressHint].filter(Boolean).join(" ")
  const url = new URL("https://restapi.amap.com/v3/place/text")
  url.searchParams.set("key", key)
  url.searchParams.set("keywords", keywords)
  url.searchParams.set("offset", "10")
  url.searchParams.set("page", "1")
  url.searchParams.set("extensions", "all")
  if (args.city) url.searchParams.set("city", args.city)

  const res = await fetch(url.toString(), { method: "GET" })
  const data = (await res.json()) as any

  const poi = Array.isArray(data?.pois) ? data.pois[0] : undefined
  if (!poi) return null

  const [lng, lat] = typeof poi.location === "string" ? poi.location.split(",").map((v: string) => Number(v)) : [undefined, undefined]
  const rating = Number(poi?.biz_ext?.rating)
  const cost = Number(poi?.biz_ext?.cost)

  const openTimeRaw = typeof poi?.biz_ext?.opentime2 === "string" ? poi.biz_ext.opentime2 : typeof poi?.biz_ext?.open_time === "string" ? poi.biz_ext.open_time : undefined
  const openTimeParsed =
    typeof openTimeRaw === "string" && openTimeRaw.includes("-")
      ? openTimeRaw
          .split("-")
          .map((s: string) => s.trim())
          .slice(0, 2)
      : undefined

  return {
    name: typeof poi.name === "string" ? poi.name : undefined,
    address: typeof poi.address === "string" ? poi.address : undefined,
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    rating: Number.isFinite(rating) ? rating : undefined,
    avgPrice: Number.isFinite(cost) ? cost : undefined,
    openTime: openTimeParsed?.[0],
    closeTime: openTimeParsed?.[1],
  }
}

function getMapProvider() {
  const p = (process.env.MAP_PROVIDER ?? "").toLowerCase()
  if (p === "google") return "google"
  return "amap"
}

function mapGooglePriceLevelToAvg(priceLevel?: number) {
  // price_level: 0–4（Google 约定），简单映射到人均（人民币）
  switch (priceLevel) {
    case 0:
      return 30
    case 1:
      return 60
    case 2:
      return 100
    case 3:
      return 200
    case 4:
      return 300
    default:
      return undefined
  }
}

async function googleEnrich(args: { name: string; addressHint?: string }) {
  // 使用 Google Places Text Search 补全：地址、经纬度、评分、价格等级、营业时间粗略
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) return null

  const query = [args.name, args.addressHint].filter(Boolean).join(" ")
  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json")
  url.searchParams.set("query", query)
  url.searchParams.set("key", key)
  url.searchParams.set("language", "zh-CN")

  const res = await fetch(url.toString(), { method: "GET" })
  const data = (await res.json()) as any
  const place = Array.isArray(data?.results) ? data.results[0] : undefined
  if (!place) return null

  const lat = place?.geometry?.location?.lat
  const lng = place?.geometry?.location?.lng

  const rating = typeof place?.rating === "number" ? place.rating : undefined
  const priceLevel = typeof place?.price_level === "number" ? place.price_level : undefined
  const avgPrice = mapGooglePriceLevelToAvg(priceLevel)

  let openTime: string | undefined
  let closeTime: string | undefined
  const openingHours = place?.opening_hours
  if (openingHours?.weekday_text && Array.isArray(openingHours.weekday_text)) {
    const sample = String(openingHours.weekday_text[0] ?? "")
    const m = sample.match(/(\d{1,2}:\d{2}).*?(\d{1,2}:\d{2})/)
    if (m) {
      openTime = m[1]
      closeTime = m[2]
    }
  }

  return {
    name: typeof place?.name === "string" ? place.name : undefined,
    address: typeof place?.formatted_address === "string" ? place.formatted_address : undefined,
    lat: typeof lat === "number" ? lat : undefined,
    lng: typeof lng === "number" ? lng : undefined,
    rating,
    avgPrice,
    openTime,
    closeTime,
  }
}

export async function POST(req: Request) {
  // 1) 接收用户粘贴的小红书/抖音链接
  const body = await req.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 })
  }

  const { url, city } = parsed.data
  const source = detectSource(url)

  // 2) 抓取页面文本（受反爬影响时可能不完整，但仍可用 title/description 辅助）
  const page = await fetchPageText(url)
  if (!page.ok) {
    return Response.json({ error: "fetch_failed", message: page.error }, { status: 400 })
  }

  // 3) 调用 LLM 识别餐馆名称、推荐菜品、标签等
  let extracted: Awaited<ReturnType<typeof doubaoExtract>>
  try {
    extracted = await doubaoExtract({ source, url, meta: page.meta, pageText: page.text })
  } catch (error) {
    return Response.json(
      {
        error: "llm_failed",
        message: error instanceof Error ? error.message : "llm_failed",
      },
      { status: 500 },
    )
  }

  // 4) 调用地图服务补全：地址、均价、评分、营业时间、经纬度
  const provider = getMapProvider()
  const enriched =
    provider === "google"
      ? await googleEnrich({ name: extracted.restaurantName, addressHint: extracted.addressHint })
      : await amapEnrich({ name: extracted.restaurantName, city, addressHint: extracted.addressHint })

  const openTime = enriched?.openTime ?? "10:00"
  const closeTime = enriched?.closeTime ?? "22:00"
  const avgPrice = enriched?.avgPrice ?? extracted.avgPriceHint ?? 50

  return Response.json({
    name: enriched?.name ?? extracted.restaurantName,
    address: enriched?.address ?? extracted.addressHint ?? "",
    avgPrice,
    openTime,
    closeTime,
    dishes: extracted.recommendedDishes,
    tags: extracted.tags,
    rating: enriched?.rating,
    lat: enriched?.lat ?? 39.9,
    lng: enriched?.lng ?? 116.4,
    source,
    sourceUrl: url,
    imageUrl: page.meta.ogImage,
  })
}
