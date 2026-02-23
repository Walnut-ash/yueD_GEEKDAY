"use client"

import type { Restaurant } from "@/types/restaurant"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, Star, ExternalLink, X, Check, Utensils } from "lucide-react"

interface RestaurantCardProps {
  restaurant: Restaurant
  onToggleExclude: (id: string) => void
  onDelete: (id: string) => void
  isSelected?: boolean
}

export function RestaurantCard({ restaurant, onToggleExclude, onDelete, isSelected }: RestaurantCardProps) {
  const isExcluded = restaurant.excluded

  return (
    <Card
      className={`overflow-hidden transition-all duration-300 ${
        isSelected ? "ring-2 ring-primary shadow-lg" : isExcluded ? "opacity-50" : "hover:shadow-md"
      }`}
    >
      {/* 图片 */}
      <div className="relative h-32 bg-muted">
        <img
          src={
            restaurant.imageUrl ||
            `/placeholder.svg?height=200&width=300&query=${encodeURIComponent(restaurant.name + " restaurant food")}`
          }
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        {/* 价格标签 */}
        <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-background/90 backdrop-blur text-sm font-semibold">
          ¥{restaurant.avgPrice}/人
        </div>
        {/* 来源标签 */}
        {restaurant.source && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-primary/90 text-primary-foreground text-xs">
            {restaurant.source}
          </div>
        )}
        {/* 排除遮罩 */}
        {isExcluded && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <span className="text-muted-foreground font-medium">已排除</span>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {/* 标题和评分 */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-base leading-tight line-clamp-1">{restaurant.name}</h3>
          {restaurant.rating && (
            <div className="flex items-center gap-1 text-amber-500 shrink-0">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm font-medium">{restaurant.rating}</span>
            </div>
          )}
        </div>

        {/* 地址 */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="line-clamp-1">{restaurant.address}</span>
        </div>

        {/* 营业时间 */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>
            {restaurant.openTime} - {restaurant.closeTime}
          </span>
        </div>

        {/* 推荐菜品 */}
        {restaurant.dishes.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <Utensils className="w-3 h-3" />
              <span>推荐菜品</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {restaurant.dishes.slice(0, 3).map((dish) => (
                <Badge key={dish} variant="secondary" className="text-xs">
                  {dish}
                </Badge>
              ))}
              {restaurant.dishes.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{restaurant.dishes.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* 标签 */}
        <div className="flex flex-wrap gap-1 mb-3">
          {restaurant.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <Button
            variant={isExcluded ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => onToggleExclude(restaurant.id)}
          >
            {isExcluded ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                恢复
              </>
            ) : (
              <>
                <X className="w-4 h-4 mr-1" />
                排除
              </>
            )}
          </Button>
          {restaurant.sourceUrl && (
            <Button variant="ghost" size="sm" asChild>
              <a href={restaurant.sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(restaurant.id)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
