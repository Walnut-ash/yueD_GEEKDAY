"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Filter, X } from "lucide-react"
import type { Restaurant } from "@/types/restaurant"

export interface FilterOptions {
  priceRange: [number, number]
  tags: string[]
  searchText: string
}

interface FilterPanelProps {
  restaurants: Restaurant[]
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
}

export function FilterPanel({ restaurants, filters, onFiltersChange }: FilterPanelProps) {
  const [open, setOpen] = useState(false)

  // 获取所有标签
  const allTags = Array.from(new Set(restaurants.flatMap((r) => r.tags))).sort()

  // 获取价格范围
  const prices = restaurants.map((r) => r.avgPrice)
  const minPrice = Math.min(...prices, 0)
  const maxPrice = Math.max(...prices, 500)

  const handlePriceChange = (value: number[]) => {
    onFiltersChange({
      ...filters,
      priceRange: [value[0], value[1]],
    })
  }

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag) ? filters.tags.filter((t) => t !== tag) : [...filters.tags, tag]
    onFiltersChange({ ...filters, tags: newTags })
  }

  const clearFilters = () => {
    onFiltersChange({
      priceRange: [minPrice, maxPrice],
      tags: [],
      searchText: "",
    })
  }

  const hasActiveFilters =
    filters.tags.length > 0 ||
    filters.searchText ||
    filters.priceRange[0] > minPrice ||
    filters.priceRange[1] < maxPrice

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative bg-transparent">
          <Filter className="w-4 h-4 mr-2" />
          筛选
          {hasActiveFilters && <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>筛选条件</span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                清除
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* 搜索 */}
          <div className="space-y-2">
            <Label>搜索餐厅</Label>
            <Input
              placeholder="餐厅名称或地址..."
              value={filters.searchText}
              onChange={(e) => onFiltersChange({ ...filters, searchText: e.target.value })}
            />
          </div>

          {/* 价格范围 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>人均价格</Label>
              <span className="text-sm text-muted-foreground">
                ¥{filters.priceRange[0]} - ¥{filters.priceRange[1]}
              </span>
            </div>
            <Slider
              value={filters.priceRange}
              onValueChange={handlePriceChange}
              min={minPrice}
              max={maxPrice}
              step={10}
              className="w-full"
            />
          </div>

          {/* 标签筛选 */}
          <div className="space-y-3">
            <Label>餐厅类型</Label>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={filters.tags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
            {allTags.length === 0 && <p className="text-sm text-muted-foreground">暂无标签</p>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
