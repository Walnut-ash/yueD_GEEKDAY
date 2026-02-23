"use client"

import { useState } from "react"
import type { Restaurant } from "@/types/restaurant"
import { MapPin, Clock, Star, X, Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface MobileMapViewProps {
  restaurants: Restaurant[]
  onToggleExclude: (id: string) => void
}

export function MobileMapView({ restaurants, onToggleExclude }: MobileMapViewProps) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)

  return (
    <div className="relative h-full w-full bg-muted/30">
      {/* 顶部搜索栏 */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 pb-0">
        <div className="bg-background/95 backdrop-blur rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">附近 {restaurants.length} 家收藏餐厅</span>
        </div>
      </div>

      {/* 模拟地图背景 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url('/city-map-streets-satellite-view.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* 地图网格线 */}
      <div className="absolute inset-0 opacity-5">
        <svg className="w-full h-full">
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* 餐厅标记 */}
      <div className="absolute inset-0 pt-20 pb-4 px-4">
        {restaurants.map((restaurant, index) => {
          const isSelected = selectedRestaurant?.id === restaurant.id
          const isExcluded = restaurant.excluded

          // 分布位置
          const col = index % 3
          const row = Math.floor(index / 3)
          const x = 15 + col * 35 + (Math.random() * 10 - 5)
          const y = 15 + row * 18 + (Math.random() * 5 - 2.5)

          return (
            <button
              key={restaurant.id}
              onClick={() => setSelectedRestaurant(restaurant)}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                isExcluded ? "opacity-40" : ""
              } ${isSelected ? "z-20 scale-125" : "z-10 hover:scale-110"}`}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div className={`relative flex flex-col items-center`}>
                {restaurant.tags[0] && !isExcluded && (
                  <span
                    className={`mb-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium whitespace-nowrap shadow-sm ${
                      isSelected ? "bg-primary text-primary-foreground" : "bg-background text-foreground"
                    }`}
                  >
                    {restaurant.tags[0]}
                  </span>
                )}
                <div
                  className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isExcluded
                        ? "bg-muted text-muted-foreground"
                        : "bg-background text-foreground"
                  }`}
                >
                  <MapPin className="w-6 h-6" />
                  {/* 价格标签 */}
                  <div
                    className={`absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isSelected ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
                    }`}
                  >
                    ¥{restaurant.avgPrice}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* 底部餐厅详情卡片 */}
      {selectedRestaurant && (
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 animate-in slide-in-from-bottom duration-300">
          <div className="bg-background rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex">
              {/* 图片 */}
              <div className="w-28 h-28 flex-shrink-0">
                <img
                  src={
                    selectedRestaurant.imageUrl ||
                    `/placeholder.svg?height=112&width=112&query=${encodeURIComponent(selectedRestaurant.name + " restaurant food") || "/placeholder.svg"}`
                  }
                  alt={selectedRestaurant.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 信息 */}
              <div className="flex-1 p-3 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base truncate">{selectedRestaurant.name}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedRestaurant(null)
                    }}
                    className="p-1 -mr-1 -mt-1 text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1 mt-1.5">
                  {selectedRestaurant.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary border-0"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-primary font-semibold">¥{selectedRestaurant.avgPrice}/人</span>
                  {selectedRestaurant.rating && (
                    <span className="flex items-center gap-0.5 text-amber-500 text-sm">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {selectedRestaurant.rating}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>
                    {selectedRestaurant.openTime}-{selectedRestaurant.closeTime}
                  </span>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2 p-3 pt-0">
              <Button
                variant={selectedRestaurant.excluded ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => onToggleExclude(selectedRestaurant.id)}
              >
                {selectedRestaurant.excluded ? "恢复选择" : "排除"}
              </Button>
              <Button size="sm" className="flex-1">
                <Navigation className="w-4 h-4 mr-1" />
                导航
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 空状态 */}
      {restaurants.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-muted-foreground bg-background/80 backdrop-blur rounded-2xl p-8">
            <MapPin className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="font-medium">还没有收藏餐厅</p>
            <p className="text-sm mt-1">点击下方「+」添加你想去的餐厅</p>
          </div>
        </div>
      )}
    </div>
  )
}
