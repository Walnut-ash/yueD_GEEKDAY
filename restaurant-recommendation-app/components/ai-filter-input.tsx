"use client"

import { useState, useRef, useEffect } from "react"
import { Sparkles, Send, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AIFilterInputProps {
  onFilter: (query: string) => Promise<void>
  onClear: () => void
  isFiltering: boolean
  hasActiveFilter: boolean
  filterExplanation?: string
}

export function AIFilterInput({
  onFilter,
  onClear,
  isFiltering,
  hasActiveFilter,
  filterExplanation,
}: AIFilterInputProps) {
  const [query, setQuery] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isExpanded])

  const handleSubmit = async () => {
    if (!query.trim() || isFiltering) return
    await onFilter(query.trim())
    setQuery("")
    setIsExpanded(false)
  }

  const handleClear = () => {
    onClear()
    setQuery("")
  }

  // 显示当前筛选状态
  if (hasActiveFilter && !isExpanded) {
    return (
      <div className="bg-primary/10 rounded-2xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI 筛选已启用</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        {filterExplanation && <p className="text-xs text-muted-foreground leading-relaxed">{filterExplanation}</p>}
        <Button variant="outline" size="sm" onClick={() => setIsExpanded(true)} className="w-full text-xs">
          重新筛选
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 text-left hover:from-primary/15 hover:to-primary/10 transition-colors"
        >
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-sm text-foreground/80">用自然语言描述你想吃什么...</span>
        </button>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="例如：想吃便宜点的日料、适合约会的浪漫餐厅..."
              className="w-full px-4 py-3 pr-12 rounded-2xl border border-primary/30 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
              disabled={isFiltering}
            />
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={!query.trim() || isFiltering}
              className={cn(
                "absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl",
                query.trim() ? "bg-primary" : "bg-muted",
              )}
            >
              {isFiltering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="text-xs text-muted-foreground"
            >
              取消
            </Button>
            <div className="flex-1 flex gap-1 overflow-x-auto no-scrollbar">
              {["便宜实惠", "适合约会", "聚餐推荐", "深夜食堂"].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setQuery(suggestion)}
                  className="px-2.5 py-1 rounded-full bg-muted text-xs whitespace-nowrap hover:bg-muted/80"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
