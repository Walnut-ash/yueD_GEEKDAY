"use client"

import { useState, useRef, useCallback } from "react"
import type { Restaurant, RestaurantList } from "@/types/restaurant"
import type { FilterOptions } from "@/components/filter-panel"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Clock,
  Star,
  X,
  Check,
  Utensils,
  Plus,
  FolderHeart,
} from "lucide-react"
import { Slider } from "@/components/ui/slider"

interface MobileRestaurantListProps {
  restaurants: Restaurant[]
  allRestaurants: Restaurant[]
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  onToggleExclude: (id: string) => void
  onDelete: (id: string) => void
  lists: RestaurantList[]
  currentListId: string | null
  onSelectList: (id: string) => void
  onCreateList: (name: string) => void
}

export function MobileRestaurantList({
  restaurants,
  allRestaurants,
  filters,
  onFiltersChange,
  onToggleExclude,
  onDelete,
  lists,
  currentListId,
  onSelectList,
  onCreateList,
}: MobileRestaurantListProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [showNewList, setShowNewList] = useState(false)
  const [newListName, setNewListName] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const scrollChipToCenter = useCallback((chipId: string) => {
    const container = scrollRef.current
    const chip = chipRefs.current.get(chipId)
    if (!container || !chip) return

    const containerRect = container.getBoundingClientRect()
    const chipRect = chip.getBoundingClientRect()
    const chipCenter = chipRect.left + chipRect.width / 2 - containerRect.left
    const containerCenter = containerRect.width / 2
    container.scrollTo({
      left: container.scrollLeft + chipCenter - containerCenter,
      behavior: "smooth",
    })
  }, [])

  const allTags = Array.from(new Set(allRestaurants.flatMap((r) => r.tags)))

  const handleCreateList = () => {
    const name = newListName.trim()
    if (!name) return
    onCreateList(name)
    setNewListName("")
    setShowNewList(false)
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Collection tabs - swipeable with snap & auto-center */}
      <div className="flex-shrink-0 border-b bg-background/80 backdrop-blur-sm relative">
        <div className="flex items-center">
          <div
            ref={scrollRef}
            className="flex-1 overflow-x-auto"
            style={{
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              scrollSnapType: "x proximity",
            }}
          >
            <style>{`.list-chip-scroll::-webkit-scrollbar { display: none; }`}</style>
            <div
              className="list-chip-scroll flex items-center gap-2.5"
              style={{ paddingLeft: 16, paddingRight: 8, paddingTop: 12, paddingBottom: 12 }}
            >
              {lists.map((list) => {
                const isActive = list.id === currentListId
                return (
                  <button
                    key={list.id}
                    ref={(el) => {
                      if (el) chipRefs.current.set(list.id, el)
                      else chipRefs.current.delete(list.id)
                    }}
                    onClick={() => {
                      onSelectList(list.id)
                      scrollChipToCenter(list.id)
                    }}
                    style={{ scrollSnapAlign: "center" }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm whitespace-nowrap shrink-0 transition-all duration-250 border ${
                      isActive
                        ? "bg-foreground text-background font-semibold shadow-md border-foreground scale-105"
                        : "bg-background text-foreground/70 font-medium shadow-sm border-border/30 active:scale-[0.96]"
                    }`}
                  >
                    <FolderHeart className={`w-3.5 h-3.5 ${isActive ? "fill-background/30" : ""}`} />
                    <span>{list.name}</span>
                    <span
                      className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? "bg-background/20 text-background"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {list.restaurants.length}
                    </span>
                  </button>
                )
              })}

              {/* Inline new collection input */}
              {showNewList && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Input
                    autoFocus
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateList()
                      if (e.key === "Escape") {
                        setShowNewList(false)
                        setNewListName("")
                      }
                    }}
                    placeholder="收藏夹名称"
                    className="w-28 h-9 text-sm rounded-full"
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateList}
                    disabled={!newListName.trim()}
                    className="h-9 rounded-full px-3"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowNewList(false)
                      setNewListName("")
                    }}
                    className="h-9 w-9 rounded-full p-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Fixed "new" button */}
          {!showNewList && (
            <div className="shrink-0 pr-4 pl-1 py-3 bg-gradient-to-l from-background via-background to-transparent">
              <button
                onClick={() => {
                  setShowNewList(true)
                  setTimeout(() => {
                    if (scrollRef.current) {
                      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
                    }
                  }, 50)
                }}
                style={{ scrollSnapAlign: "center" }}
                className="flex items-center gap-1 px-3 py-2 rounded-full text-sm text-muted-foreground border border-dashed border-muted-foreground/30 whitespace-nowrap shrink-0 active:border-foreground active:text-foreground transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                新建
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search and filter */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索餐厅名称或地址"
              value={filters.searchText}
              onChange={(e) =>
                onFiltersChange({ ...filters, searchText: e.target.value })
              }
              className="pl-9 rounded-full"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={`rounded-full shrink-0 bg-transparent ${showFilters ? "border-foreground text-foreground" : ""}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>共 {restaurants.length} 家餐厅</span>
          {(filters.tags.length > 0 || filters.searchText) && (
            <button
              onClick={() =>
                onFiltersChange({
                  priceRange: [0, 500],
                  tags: [],
                  searchText: "",
                })
              }
              className="text-foreground font-medium"
            >
              清除筛选
            </button>
          )}
        </div>
      </div>

      {/* Inline filter panel - constrained within mobile container */}
      {showFilters && (
        <div className="flex-shrink-0 border-b bg-muted/30">
          {/* Drag handle */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-8 h-1 rounded-full bg-border" />
          </div>

          <div className="px-4 pb-4 space-y-4">
            {/* Price range */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                价格范围：¥{filters.priceRange[0]} - ¥{filters.priceRange[1]}
              </label>
              <Slider
                value={filters.priceRange}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    priceRange: value as [number, number],
                  })
                }
                max={500}
                step={10}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                餐厅类型
              </label>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      const newTags = filters.tags.includes(tag)
                        ? filters.tags.filter((t) => t !== tag)
                        : [...filters.tags, tag]
                      onFiltersChange({ ...filters, tags: newTags })
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      filters.tags.includes(tag)
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background text-foreground/70 border-border/50 active:scale-95"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Apply button */}
            <Button
              onClick={() => setShowFilters(false)}
              className="w-full rounded-full"
              size="sm"
            >
              完成
            </Button>
          </div>
        </div>
      )}

      {/* Restaurant list */}
      <div className="flex-1 overflow-y-auto">
        {restaurants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
            <Utensils className="w-16 h-16 mb-4 opacity-30" />
            <p className="font-medium">没有找到餐厅</p>
            <p className="text-sm mt-1">试试调整筛选条件或添加新餐厅</p>
          </div>
        ) : (
          <div className="divide-y">
            {restaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                className={`flex gap-3 p-4 ${restaurant.excluded ? "opacity-50" : ""}`}
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 relative">
                  <img
                    src={
                      restaurant.imageUrl ||
                      `/placeholder.svg?height=80&width=80&query=${encodeURIComponent(restaurant.name + " food")}`
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

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold truncate">
                      {restaurant.name}
                    </h3>
                    <span className="text-primary font-semibold text-sm shrink-0">
                      ¥{restaurant.avgPrice}
                    </span>
                  </div>

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
                        <span className="text-[10px] text-muted-foreground">
                          +{restaurant.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[120px]">
                        {restaurant.address}
                      </span>
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

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => onToggleExclude(restaurant.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                        restaurant.excluded
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
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
