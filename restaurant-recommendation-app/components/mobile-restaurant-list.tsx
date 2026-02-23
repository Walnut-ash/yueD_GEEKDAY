"use client"

import { useState } from "react"
import type { Restaurant } from "@/types/restaurant"
import type { FilterOptions } from "@/components/filter-panel"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, SlidersHorizontal, MapPin, Clock, Star, X, Check, Utensils } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { AIFilterInput } from "@/components/ai-filter-input"

interface MobileRestaurantListProps {
  restaurants: Restaurant[]
  allRestaurants: Restaurant[]
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  onToggleExclude: (id: string) => void
  onDelete: (id: string) => void
  aiFilteredIds?: string[] | null
  onAIFilter: (ids: string[] | null, explanation?: string) => void
  aiFilterExplanation?: string
}

export function MobileRestaurantList({
  restaurants,
  allRestaurants,
  filters,
  onFiltersChange,
  onToggleExclude,
  onDelete,
  aiFilteredIds,
  onAIFilter,
  aiFilterExplanation,
}: MobileRestaurantListProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [isAIFiltering, setIsAIFiltering] = useState(false)

  const allTags = Array.from(new Set(allRestaurants.flatMap((r) => r.tags)))

  const handleAIFilter = async (query: string) => {
    setIsAIFiltering(true)
    try {
      const response = await fetch("/api/filter-restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          restaurants: allRestaurants.filter((r) => !r.excluded),
        }),
      })
      const result = await response.json()
      onAIFilter(result.matchedIds, result.explanation)
    } catch (error) {
      console.error("AI filter error:", error)
    } finally {
      setIsAIFiltering(false)
    }
  }

  const displayRestaurants = aiFilteredIds ? restaurants.filter((r) => aiFilteredIds.includes(r.id)) : restaurants

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 顶部搜索和筛选 */}
      <div className="flex-shrink-0 p-4 space-y-3 border-b">
        <AIFilterInput
          onFilter={handleAIFilter}
          onClear={() => onAIFilter(null)}
          isFiltering={isAIFiltering}
          hasActiveFilter={!!aiFilteredIds}
          filterExplanation={aiFilterExplanation}
        />

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索餐厅名称或地址"
              value={filters.searchText}
              onChange={(e) => onFiltersChange({ ...filters, searchText: e.target.value })}
              className="pl-9 rounded-full"
            />
          </div>
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full shrink-0 bg-transparent">
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>筛选条件</SheetTitle>
              </SheetHeader>
              <div className="py-6 space-y-6">
                {/* 价格范围 */}
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    价格范围：¥{filters.priceRange[0]} - ¥{filters.priceRange[1]}
                  </label>
                  <Slider
                    value={filters.priceRange}
                    onValueChange={(value) => onFiltersChange({ ...filters, priceRange: value as [number, number] })}
                    max={500}
                    step={10}
                    className="mt-2"
                  />
                </div>

                {/* 标签筛选 */}
                <div>
                  <label className="text-sm font-medium mb-3 block">餐厅类型</label>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={filters.tags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          const newTags = filters.tags.includes(tag)
                            ? filters.tags.filter((t) => t !== tag)
                            : [...filters.tags, tag]
                          onFiltersChange({ ...filters, tags: newTags })
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button onClick={() => setShowFilters(false)} className="w-full">
                  应用筛选
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>共 {displayRestaurants.length} 家餐厅</span>
          {(filters.tags.length > 0 || filters.searchText || aiFilteredIds) && (
            <button
              onClick={() => {
                onFiltersChange({ priceRange: [0, 500], tags: [], searchText: "" })
                onAIFilter(null)
              }}
              className="text-primary"
            >
              清除所有筛选
            </button>
          )}
        </div>
      </div>

      {/* 餐厅列表 */}
      <div className="flex-1 overflow-y-auto">
        {displayRestaurants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
            <Utensils className="w-16 h-16 mb-4 opacity-30" />
            <p className="font-medium">没有找到餐厅</p>
            <p className="text-sm mt-1">试试调整筛选条件</p>
          </div>
        ) : (
          <div className="divide-y">
            {displayRestaurants.map((restaurant) => (
              <div key={restaurant.id} className={`flex gap-3 p-4 ${restaurant.excluded ? "opacity-50" : ""}`}>
                {/* 图片 */}
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 relative">
                  <img
                    src={
                      restaurant.imageUrl ||
                      `/placeholder.svg?height=80&width=80&query=${encodeURIComponent(restaurant.name + " food") || "/placeholder.svg"}`
                    }
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                  {restaurant.excluded && (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                      <span className="text-xs font-medium">已排除</span>
                    </div>
                  )}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold truncate">{restaurant.name}</h3>
                    <span className="text-primary font-semibold text-sm shrink-0">¥{restaurant.avgPrice}</span>
                  </div>

                  {/* 标签移到名称下方更明显的位置 */}
                  {restaurant.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {restaurant.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary border-0"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {restaurant.tags.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{restaurant.tags.length - 3}</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[120px]">{restaurant.address}</span>
                    </span>
                    {restaurant.rating && (
                      <span className="flex items-center gap-0.5 text-amber-500">
                        <Star className="w-3 h-3 fill-current" />
                        {restaurant.rating}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>
                      {restaurant.openTime}-{restaurant.closeTime}
                    </span>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => onToggleExclude(restaurant.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                        restaurant.excluded ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {restaurant.excluded ? (
                        <>
                          <Check className="w-3 h-3" />
                          恢复
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3" />
                          排除
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => onDelete(restaurant.id)}
                      className="px-2 py-1 rounded-full text-xs bg-destructive/10 text-destructive"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
