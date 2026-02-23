"use client"

import { useState } from "react"
import type { Restaurant } from "@/types/restaurant"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Dices, MapPin, Clock, Star, PartyPopper } from "lucide-react"
import confetti from "canvas-confetti"

interface RandomPickerProps {
  restaurants: Restaurant[]
}

export function RandomPicker({ restaurants }: RandomPickerProps) {
  const [open, setOpen] = useState(false)
  const [picking, setPicking] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [result, setResult] = useState<Restaurant | null>(null)

  const availableRestaurants = restaurants.filter((r) => !r.excluded)

  const handlePick = () => {
    if (availableRestaurants.length === 0) return

    setPicking(true)
    setResult(null)

    // 动画效果：快速切换
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

          // 撒花效果
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          })
        }
      },
      100 - count * 3,
    ) // 逐渐减速
  }

  const currentRestaurant = picking ? availableRestaurants[currentIndex] : result

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" disabled={availableRestaurants.length < 2}>
          <Dices className="w-4 h-4 mr-2" />
          随机抽取
          {availableRestaurants.length > 0 && (
            <span className="ml-1 text-xs opacity-70">({availableRestaurants.length}家可选)</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dices className="w-5 h-5" />
            到了饭点，吃哪家？
          </DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {availableRestaurants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>没有可选的餐厅</p>
              <p className="text-sm">请先添加餐厅或取消排除</p>
            </div>
          ) : (
            <>
              {/* 抽取卡片 */}
              <div
                className={`relative overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                  result ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                {currentRestaurant ? (
                  <div className="p-6">
                    {result && (
                      <div className="absolute top-2 right-2">
                        <PartyPopper className="w-6 h-6 text-primary animate-bounce" />
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      <img
                        src={
                          currentRestaurant.imageUrl ||
                          `/placeholder.svg?height=100&width=100&query=${encodeURIComponent(currentRestaurant.name)}`
                        }
                        alt={currentRestaurant.name}
                        className={`w-20 h-20 rounded-lg object-cover transition-transform ${
                          picking ? "animate-pulse" : ""
                        }`}
                      />
                      <div className="flex-1">
                        <h3 className={`font-bold text-xl transition-all ${picking ? "blur-sm" : ""}`}>
                          {currentRestaurant.name}
                        </h3>
                        <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="text-sm truncate">{currentRestaurant.address}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-sm">
                          <span className="font-semibold text-primary">¥{currentRestaurant.avgPrice}/人</span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            {currentRestaurant.openTime}-{currentRestaurant.closeTime}
                          </span>
                          {currentRestaurant.rating && (
                            <span className="flex items-center gap-1 text-amber-500">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              {currentRestaurant.rating}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {result && currentRestaurant.dishes.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-2">推荐菜品：</p>
                        <div className="flex flex-wrap gap-2">
                          {currentRestaurant.dishes.map((dish) => (
                            <span key={dish} className="px-2 py-1 bg-muted rounded-md text-sm">
                              {dish}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-12 text-center text-muted-foreground">
                    <Dices className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>点击按钮开始抽取</p>
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3 mt-6">
                <Button onClick={handlePick} disabled={picking} className="flex-1" size="lg">
                  {picking ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      抽取中...
                    </>
                  ) : result ? (
                    <>
                      <Dices className="w-4 h-4 mr-2" />
                      再抽一次
                    </>
                  ) : (
                    <>
                      <Dices className="w-4 h-4 mr-2" />
                      开始抽取
                    </>
                  )}
                </Button>
              </div>

              {result && (
                <p className="text-center text-sm text-muted-foreground mt-4">就决定是你了！去吃 {result.name} 吧！</p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
