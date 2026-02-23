"use client"

import { useState, useRef, useEffect } from "react"
import type { Restaurant } from "@/types/restaurant"
import { ArrowLeft, Send, Sparkles, MapPin, Clock, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  restaurants?: Restaurant[]
}

interface MobileAIChatProps {
  restaurants: Restaurant[]
  onBack: () => void
}

export function MobileAIChat({ restaurants, onBack }: MobileAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "你好！我是你的美食助手。告诉我你的需求，我来帮你从收藏的餐厅中找到最合适的选择。比如：\n\n- 今天想吃点辣的\n- 预算 100 以内的聚餐\n- 适合约会的安静餐厅\n- 离我最近的深夜食堂",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const smartFilter = (query: string): { results: Restaurant[]; explanation: string } => {
    const q = query.toLowerCase()
    let filtered = restaurants.filter((r) => !r.excluded)
    let explanation = ""

    // Price-based filtering
    if (q.includes("便宜") || q.includes("实惠") || q.includes("经济")) {
      filtered = filtered.filter((r) => r.avgPrice <= 80)
      explanation = "为你筛选了人均 80 元以下的实惠餐厅"
    } else if (q.includes("贵") || q.includes("高档") || q.includes("奢华")) {
      filtered = filtered.filter((r) => r.avgPrice >= 150)
      explanation = "为你筛选了高档餐厅"
    }

    // Budget extraction
    const budgetMatch = q.match(/(\d+)\s*(元|块|以内|以下)/)
    if (budgetMatch) {
      const budget = parseInt(budgetMatch[1])
      filtered = filtered.filter((r) => r.avgPrice <= budget)
      explanation = `为你筛选了人均 ${budget} 元以内的餐厅`
    }

    // Cuisine/tag based
    const tagKeywords: Record<string, string[]> = {
      "辣": ["川菜", "湘菜", "火锅", "麻辣"],
      "日料": ["日料", "日式", "寿司", "拉面"],
      "火锅": ["火锅"],
      "烧烤": ["烧烤", "BBQ"],
      "面": ["面", "面食", "拉面"],
      "约会": ["浪漫", "精致", "西餐", "日料", "法餐"],
      "聚餐": ["火锅", "烧烤", "聚餐", "大排档"],
      "深夜": ["深夜", "夜宵", "烧烤", "小龙虾"],
    }

    for (const [keyword, tags] of Object.entries(tagKeywords)) {
      if (q.includes(keyword)) {
        const tagFiltered = filtered.filter(
          (r) =>
            r.tags.some((t) => tags.some((tag) => t.includes(tag))) ||
            r.name.toLowerCase().includes(keyword) ||
            r.dishes.some((d) => d.toLowerCase().includes(keyword))
        )
        if (tagFiltered.length > 0) {
          filtered = tagFiltered
          if (!explanation) explanation = `为你筛选了与「${keyword}」相关的餐厅`
        }
      }
    }

    // Late night filter
    if (q.includes("深夜") || q.includes("夜宵") || q.includes("宵夜")) {
      const lateNight = filtered.filter((r) => {
        const closeHour = parseInt(r.closeTime.split(":")[0])
        return closeHour >= 22 || closeHour <= 4
      })
      if (lateNight.length > 0) {
        filtered = lateNight
        explanation = explanation || "为你筛选了深夜还在营业的餐厅"
      }
    }

    if (!explanation) {
      explanation = `根据「${query}」为你从 ${restaurants.length} 家餐厅中筛选了 ${filtered.length} 家`
    }

    return { results: filtered, explanation }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    // Simulate AI processing delay
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 600))

    const { results, explanation } = smartFilter(userMsg.content)

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content:
        results.length > 0
          ? `${explanation}，共找到 ${results.length} 家：`
          : `抱歉，没有找到完全匹配「${userMsg.content}」的餐厅。试试换个描述？你的收藏里有 ${restaurants.length} 家餐厅等着你探索。`,
      restaurants: results.length > 0 ? results.slice(0, 5) : undefined,
    }
    setMessages((prev) => [...prev, aiMsg])
    setIsLoading(false)
  }

  const quickSuggestions = ["想吃辣的", "100元以内聚餐", "适合约会", "深夜还开的店"]

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b bg-background/80 backdrop-blur-xl">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">美食AI助手</h1>
            <p className="text-xs text-muted-foreground leading-tight">
              基于你的 {restaurants.length} 家收藏
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              )}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>

              {/* Restaurant cards in AI response */}
              {msg.restaurants && msg.restaurants.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.restaurants.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-xl bg-background/80 backdrop-blur border border-border/50 overflow-hidden"
                    >
                      <div className="flex gap-3 p-3">
                        <img
                          src={
                            r.imageUrl ||
                            `/placeholder.svg?height=60&width=60&query=${encodeURIComponent(r.name)}`
                          }
                          alt={r.name}
                          className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{r.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-medium text-primary">
                              ¥{r.avgPrice}/人
                            </span>
                            {r.rating && (
                              <span className="flex items-center gap-0.5 text-xs text-amber-500">
                                <Star className="w-3 h-3 fill-current" />
                                {r.rating}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{r.address}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span>
                              {r.openTime}-{r.closeTime}
                            </span>
                          </div>
                          {r.tags.length > 0 && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {r.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* Quick suggestions when messages is just the welcome */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {quickSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setInput(s)
                  setTimeout(() => inputRef.current?.focus(), 50)
                }}
                className="px-3 py-2 rounded-full border border-border bg-background text-sm hover:bg-muted transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3 pb-2 border-t bg-background/80 backdrop-blur-xl">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="描述你想吃什么..."
            className="flex-1 px-4 py-3 rounded-2xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-12 w-12 rounded-2xl flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
