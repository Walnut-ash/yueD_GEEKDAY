"use client"

import type { Restaurant } from "@/types/restaurant"
import { MapPin, Clock, DollarSign } from "lucide-react"

interface MapViewProps {
  restaurants: Restaurant[]
  selectedId?: string
  onSelect: (restaurant: Restaurant) => void
}

export function MapView({ restaurants, selectedId, onSelect }: MapViewProps) {
  // 计算地图中心点
  const center =
    restaurants.length > 0
      ? {
          lat: restaurants.reduce((sum, r) => sum + r.lat, 0) / restaurants.length,
          lng: restaurants.reduce((sum, r) => sum + r.lng, 0) / restaurants.length,
        }
      : { lat: 39.9042, lng: 116.4074 } // 默认北京

  return (
    <div className="relative h-full w-full bg-muted/30 rounded-xl overflow-hidden">
      {/* 模拟地图背景 */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url('/city-map-satellite.png')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* 地图网格线 */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* 餐厅标记 */}
      <div className="absolute inset-0 p-8">
        {restaurants.map((restaurant, index) => {
          const isSelected = restaurant.id === selectedId
          const isExcluded = restaurant.excluded

          // 将经纬度映射到容器位置
          const x = 15 + (index % 4) * 20 + Math.random() * 10
          const y = 15 + Math.floor(index / 4) * 25 + Math.random() * 10

          return (
            <button
              key={restaurant.id}
              onClick={() => onSelect(restaurant)}
              className={`absolute transform -translate-x-1/2 -translate-y-full transition-all duration-300 group ${
                isExcluded ? "opacity-40" : ""
              }`}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              {/* 标记点 */}
              <div className={`relative ${isSelected ? "scale-125" : "hover:scale-110"}`}>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isExcluded
                        ? "bg-muted text-muted-foreground"
                        : "bg-background text-foreground hover:bg-primary hover:text-primary-foreground"
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                </div>

                {/* 价格标签 */}
                <div
                  className={`absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                    isSelected ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  ¥{restaurant.avgPrice}
                </div>
              </div>

              {/* 悬浮信息卡 */}
              <div
                className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-3 rounded-lg bg-card border shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 ${
                  isSelected ? "opacity-100" : ""
                }`}
              >
                <h4 className="font-semibold text-sm truncate">{restaurant.name}</h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>
                    {restaurant.openTime}-{restaurant.closeTime}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <DollarSign className="w-3 h-3" />
                  <span>人均 ¥{restaurant.avgPrice}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {restaurant.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 bg-muted rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* 空状态 */}
      {restaurants.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>还没有收藏餐厅</p>
            <p className="text-sm">添加你想去的餐厅吧</p>
          </div>
        </div>
      )}

      {/* 图例 */}
      <div className="absolute bottom-4 left-4 p-3 rounded-lg bg-card/90 backdrop-blur border text-xs">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>已选择</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-background border" />
          <span>待选</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-muted" />
          <span>已排除</span>
        </div>
      </div>
    </div>
  )
}
