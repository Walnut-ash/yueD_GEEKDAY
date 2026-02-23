"use client"

import { useState } from "react"
import type { Restaurant } from "@/types/restaurant"
import { Button } from "@/components/ui/button"
import { Dices, MapPin, Clock, Star, PartyPopper, Navigation } from "lucide-react"
import confetti from "canvas-confetti"

interface MobileRandomPickerProps {
  restaurants: Restaurant[]
}

export function MobileRandomPicker({ restaurants }: MobileRandomPickerProps) {
  const [picking, setPicking] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [result, setResult] = useState<Restaurant | null>(null)

  const availableRestaurants = restaurants.filter((r) => !r.excluded)

  const handlePick = () => {
    if (availableRestaurants.length === 0) return

    setPicking(true)
    setResult(null)

    let count = 0
    const maxCount = 20 + Math.floor(Math.random() * 10)
    const interval = setInterval(
      () => {
        setCurrentIndex(Math.floor(Math.random() * availableRestaurants.length))
        count++

        if (count >= maxCount) {
          clearInterval(interval)
          const finalIndex = Math.floor(Math.random() * availableRestaurants.length)
          setCurrentIndex(finalIndex)
          setResult(availableRestaurants[finalIndex])
          setPicking(false)

          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          })
        }
      },
      100 - count * 3,
    )
  }

  const currentRestaurant = picking ? availableRestaurants[currentIndex] : result

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 头部 */}
      <div className="flex-shrink-0 p-4 border-b text-center">
        <h1 className="text-xl font-bold">到了饭点，吃哪家？</h1>
        <p className="text-sm text-muted-foreground mt-1">{availableRestaurants.length} 家餐厅待选</p>
      </div>

      {/* 内容 */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {availableRestaurants.length === 0 ? (
          <div className="text-center text-muted-foreground">
            <Dices className="w-20 h-20 mx-auto mb-4 opacity-30" />
            <p className="font-medium">没有可选的餐厅</p>
            <p className="text-sm mt-1">请先添加餐厅或取消排除</p>
          </div>
        ) : (
          <>
            {/* 抽取卡片 */}
            <div
              className={`w-full max-w-sm rounded-3xl overflow-hidden transition-all duration-300 ${
                result ? "bg-primary/5 border-2 border-primary shadow-2xl" : "bg-muted/30 border-2 border-border"
              }`}
            >
              {currentRestaurant ? (
                <div className="relative">
                  {result && (
                    <div className="absolute top-4 right-4 z-10">
                      <PartyPopper className="w-8 h-8 text-primary animate-bounce" />
                    </div>
                  )}

                  {/* 图片 */}
                  <div className="h-48 relative">
                    <img
                      src={
                        currentRestaurant.imageUrl ||
                        `/placeholder.svg?height=200&width=400&query=${encodeURIComponent(currentRestaurant.name + " restaurant") || "/placeholder.svg"}`
                      }
                      alt={currentRestaurant.name}
                      className={`w-full h-full object-cover transition-all ${picking ? "blur-sm scale-105" : ""}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  </div>

                  {/* 信息 */}
                  <div className="p-5 -mt-12 relative">
                    <h3 className={`font-bold text-2xl transition-all ${picking ? "blur-sm" : ""}`}>
                      {currentRestaurant.name}
                    </h3>

                    <div className="flex items-center gap-3 mt-2 text-sm">
                      <span className="font-semibold text-primary text-lg">¥{currentRestaurant.avgPrice}/人</span>
                      {currentRestaurant.rating && (
                        <span className="flex items-center gap-1 text-amber-500">
                          <Star className="w-4 h-4 fill-current" />
                          {currentRestaurant.rating}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{currentRestaurant.address}</span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        {currentRestaurant.openTime}-{currentRestaurant.closeTime}
                      </span>
                    </div>

                    {result && currentRestaurant.dishes.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-2">推荐菜品</p>
                        <div className="flex flex-wrap gap-2">
                          {currentRestaurant.dishes.map((dish) => (
                            <span key={dish} className="px-3 py-1.5 bg-muted rounded-full text-sm">
                              {dish}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-muted-foreground">
                  <Dices className="w-20 h-20 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">点击按钮开始抽取</p>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="w-full max-w-sm mt-6 space-y-3">
              <Button onClick={handlePick} disabled={picking} className="w-full h-14 text-lg rounded-2xl" size="lg">
                {picking ? (
                  <>
                    <div className="w-5 h-5 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    抽取中...
                  </>
                ) : result ? (
                  <>
                    <Dices className="w-5 h-5 mr-2" />
                    再抽一次
                  </>
                ) : (
                  <>
                    <Dices className="w-5 h-5 mr-2" />
                    开始抽取
                  </>
                )}
              </Button>

              {result && (
                <Button variant="outline" className="w-full h-12 rounded-2xl bg-transparent">
                  <Navigation className="w-4 h-4 mr-2" />
                  导航到 {result.name}
                </Button>
              )}
            </div>

            {result && (
              <p className="text-center text-muted-foreground mt-4 animate-in fade-in">
                就决定是你了！去吃 <span className="text-primary font-semibold">{result.name}</span> 吧！
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
