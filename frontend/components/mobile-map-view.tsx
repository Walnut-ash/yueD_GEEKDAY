
"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import Script from "next/script"
import type { Restaurant, RestaurantList } from "@/types/restaurant"
import { Clock, Star, X, Navigation, Search, ChevronDown, Crosshair, MapPin, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface MobileMapViewProps {
  restaurants: Restaurant[]
  onToggleExclude: (id: string) => void
  lists: RestaurantList[]
  currentListId: string | null
  onSelectList: (id: string) => void
}

/* Map a restaurant's tags to a food emoji */
function getTagEmoji(tags: string[]): string {
  const joined = tags.join(",")
  if (joined.includes("火锅")) return "\uD83C\uDF72"
  if (joined.includes("川菜") || joined.includes("辣")) return "\uD83C\uDF36\uFE0F"
  if (joined.includes("粤菜") || joined.includes("点心")) return "\uD83E\uDD5F"
  if (joined.includes("日料") || joined.includes("寿司")) return "\uD83C\uDF63"
  if (joined.includes("西北") || joined.includes("面食")) return "\uD83C\uDF5C"
  if (joined.includes("烧烤") || joined.includes("串")) return "\uD83C\uDF56"
  if (joined.includes("小吃")) return "\uD83E\uDD68"
  if (joined.includes("北京")) return "\uD83E\uDD6E"
  if (joined.includes("龙虾") || joined.includes("海鲜")) return "\uD83E\uDD90"
  if (joined.includes("台湾")) return "\uD83E\uDD5F"
  if (joined.includes("创意")) return "\uD83C\uDF74"
  if (joined.includes("家常")) return "\uD83C\uDF73"
  return "\uD83C\uDF74"
}

const CATEGORIES = [
  { id: "all", label: "全部", emoji: "\uD83C\uDF7D\uFE0F" },
  { id: "火锅", label: "火锅", emoji: "\uD83C\uDF72" },
  { id: "川菜", label: "川菜", emoji: "\uD83C\uDF36\uFE0F" },
  { id: "粤菜", label: "粤菜", emoji: "\uD83E\uDD5F" },
  { id: "日料", label: "日料", emoji: "\uD83C\uDF63" },
  { id: "西北菜", label: "西北", emoji: "\uD83C\uDF5C" },
  { id: "小吃", label: "小吃", emoji: "\uD83E\uDD68" },
  { id: "烧烤", label: "烧烤", emoji: "\uD83C\uDF56" },
  { id: "海鲜", label: "海鲜", emoji: "\uD83E\uDD90" },
  { id: "家常", label: "家常", emoji: "\uD83C\uDF73" },
  { id: "创意", label: "创意", emoji: "\uD83C\uDF74" },
]

export function MobileMapView({
  restaurants,
  onToggleExclude,
  lists,
  currentListId,
  onSelectList,
}: MobileMapViewProps) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [activeCategory, setActiveCategory] = useState("all")
  const [showListDropdown, setShowListDropdown] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchText, setSearchText] = useState("")
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading")
  const [mapError, setMapError] = useState<string>("")
  const [isLocating, setIsLocating] = useState(false)
  const mapRef = useRef<any>(null)
  const amapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const userMarkerRef = useRef<any>(null)
  
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const chipScrollRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  // Scroll selected chip to center of the scroll container
  const scrollChipToCenter = useCallback((chipId: string) => {
    const container = chipScrollRef.current
    const chip = chipRefs.current.get(chipId)
    if (!container || !chip) return

    const containerRect = container.getBoundingClientRect()
    const chipRect = chip.getBoundingClientRect()

    const chipCenter = chipRect.left + chipRect.width / 2 - containerRect.left
    const containerCenter = containerRect.width / 2

    const scrollTarget = container.scrollLeft + chipCenter - containerCenter

    container.scrollTo({
      left: scrollTarget,
      behavior: "smooth",
    })
  }, [])

  const currentList = lists.find((l) => l.id === currentListId)
  const currentListName = currentList?.name || "我的收藏"

  const displayedRestaurants = useMemo(() => {
    let filtered = restaurants
    if (activeCategory !== "all") {
      filtered = filtered.filter((r) => r.tags.some((t) => t.includes(activeCategory)))
    }
    if (searchText.trim()) {
      const s = searchText.toLowerCase()
      filtered = filtered.filter(
        (r) => r.name.toLowerCase().includes(s) || r.tags.some((t) => t.includes(s))
      )
    }
    return filtered
  }, [restaurants, activeCategory, searchText])

  const { toast } = useToast()

  // Initialize AMap using Script tag approach with onLoad callback
  const initMap = useCallback(() => {
    if (typeof window === "undefined" || !(window as any).AMap || !mapContainerRef.current || mapRef.current) return

    try {
      // @ts-ignore
    const AMap = (window as any).AMap
    amapRef.current = AMap

    const map = new AMap.Map(mapContainerRef.current, {
      viewMode: "2D",
      zoom: 13,
      center: [116.16147, 23.30324], // Puning City center
    })

    // @ts-ignore
    mapRef.current = map

    // Ensure user marker is cleared on init
    userMarkerRef.current = null

    map.plugin(["AMap.Scale", "AMap.ToolBar"], function () {
        map.addControl(new AMap.Scale())
        map.addControl(new AMap.ToolBar({ position: "RB" }))
      })

      // Force resize to ensure map renders correctly
      setTimeout(() => {
        map.resize()
        map.setFitView(null, false, [50, 50, 50, 50])
      }, 500)

      setMapStatus("ready")
    } catch (e) {
      console.error("Map init error:", e)
      setMapStatus("error")
      setMapError(String(e))
    }
  }, [])

  const locateUser = useCallback(() => {
    const map = mapRef.current
    const AMap = amapRef.current
    if (!map || !AMap || isLocating) return

    setIsLocating(true)

    map.plugin("AMap.Geolocation", function () {
      const geolocation = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
        zoomToAccuracy: false, // Don't auto zoom too much
        position: 'RB',
        showMarker: false, // Use custom marker instead
        showCircle: true,
        panToLocation: true,
      })
      
      geolocation.getCurrentPosition(function(status: string, result: any) {
        setIsLocating(false)
        if(status === 'complete'){
            console.log('Located successfully', result)
            
            // 1. Add custom pulse marker
            if (userMarkerRef.current) {
                map.remove(userMarkerRef.current)
            }
            
            const content = `
                <div class="user-location-marker">
                    <div class="user-location-pulse"></div>
                    <div class="user-location-dot"></div>
                </div>
            `
            
            const marker = new AMap.Marker({
                position: result.position,
                content: content,
                offset: new AMap.Pixel(-24, -24), // Center the 48x48 marker
                zIndex: 100 // Ensure it's above other markers
            })
            
            map.add(marker)
            userMarkerRef.current = marker

            // Calculate distance to nearest restaurant
            let nearestDist = Infinity
            let nearbyCount = 0
            const userPos = result.position // AMap.LngLat
            
            // Check if we have restaurants
            if (markersRef.current && markersRef.current.length > 0) {
              markersRef.current.forEach(marker => {
                const markerPos = marker.getPosition()
                const dist = userPos.distance(markerPos) // meters
                if (dist < nearestDist) nearestDist = dist
                if (dist < 10000) nearbyCount++ // within 10km
              })

              let description = "已获取您的精确位置。"
              if (nearbyCount > 0) {
                description += ` 附近 10km 内有 ${nearbyCount} 家收藏餐厅。`
              } else {
                description += ` 附近暂无收藏餐厅（最近的在 ${(nearestDist / 1000).toFixed(1)}km 外）。`
              }

              // Always center on user location with appropriate zoom
              // Zoom 11 is roughly 10km view range
              setTimeout(() => {
                 map.setZoomAndCenter(11, result.position)
              }, 100)

              toast({
                title: "定位成功",
                description: description,
              })
            } else {
               // No restaurants case
               setTimeout(() => {
                 map.setZoomAndCenter(11, result.position)
               }, 100)
               
               toast({
                title: "定位成功",
                description: "已获取您的精确位置，但当前没有展示的餐厅。",
              })
            }

        } else {
            console.error('Location failed', status, result)
            
            let errorMsg = '未知错误'
            if (result.message) errorMsg = result.message
            else if (typeof result === 'string') errorMsg = result

            // 如果是 HTTPS 问题，提示更明确
            if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                errorMsg += " (非HTTPS环境无法精确定位)"
            }
            
            toast({
              variant: "destructive",
              title: "无法获取精确位置",
              description: `原因：${errorMsg}。尝试切换到城市定位。`,
            })
            
            // Fallback to City Location immediately on any error
            console.log('Attempting fallback to CitySearch...')
            map.plugin("AMap.CitySearch", function () {
                const citySearch = new AMap.CitySearch()
                citySearch.getLocalCity(function (status: string, result: any) {
                  if (status === 'complete' && result.info === 'OK') {
                    if (result && result.city && result.bounds) {
                      const citybounds = result.bounds
                      map.setBounds(citybounds)
                      console.log('Fallback to city:', result.city)
                      toast({
                        title: `已定位到：${result.city}`,
                        description: "由于精确位置获取失败，仅显示城市范围。",
                      })
                    }
                  } else {
                      console.error('City fallback failed', result)
                      toast({
                        variant: "destructive",
                        title: "定位完全失败",
                        description: "无法获取位置信息，请检查网络或权限。",
                      })
                  }
                })
            })
        }
      })
    })
  }, [toast])

  // Auto locate when map is ready
  useEffect(() => {
    if (mapStatus === 'ready') {
      // Small delay to ensure map is fully rendered
      setTimeout(() => {
        locateUser()
      }, 500)
    }
  }, [mapStatus, locateUser])

  useEffect(() => {
    // If AMap is already loaded (from previous navigation), init immediately
    if ((window as any).AMap) {
      initMap()
    }

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.destroy()
        mapRef.current = null
      }
    }
  }, [initMap])

  // Update markers when restaurants change
  useEffect(() => {
    const map = mapRef.current
    const AMap = amapRef.current
    if (!map || !AMap) return

    // Clear existing markers
    if (markersRef.current.length > 0) {
      try {
        map.remove(markersRef.current)
      } catch {
      }
      markersRef.current = []
    }
    
    // Don't clear user marker here!

    const newMarkers: any[] = []

    displayedRestaurants.forEach((restaurant) => {
      const emoji = getTagEmoji(restaurant.tags)
      
      // Create custom content marker
      const content = `
        <div class="custom-marker" style="
          background-color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          border: 2px solid ${restaurant.id === selectedRestaurant?.id ? '#f97316' : '#fff'};
          transform: ${restaurant.id === selectedRestaurant?.id ? 'scale(1.2)' : 'scale(1)'};
          transition: all 0.2s;
        ">
          <span style="font-size: 20px;">${emoji}</span>
        </div>
      `

      const marker = new AMap.Marker({
        position: [restaurant.lng, restaurant.lat],
        content: content,
        offset: new AMap.Pixel(-18, -18),
        extData: { id: restaurant.id }
      })

      marker.on('click', () => {
        setSelectedRestaurant(restaurant)
        // Center map on click
        map.setZoomAndCenter(15, [restaurant.lng, restaurant.lat])
      })

      newMarkers.push(marker)
    })

    if (newMarkers.length > 0) {
      map.add(newMarkers)
      markersRef.current = newMarkers
      // Fit view to show all markers
      map.setFitView(newMarkers, false, [50, 50, 50, 50])
    }

  }, [displayedRestaurants, selectedRestaurant])

  // Search nearby functionality removed


  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f6f7f9]">
      {/* Inject security config immediately to ensure it runs before AMap loads */}
      <script
        dangerouslySetInnerHTML={{
          __html: `window._AMapSecurityConfig = { securityJsCode: "${process.env.NEXT_PUBLIC_AMAP_SECURITY_JS_CODE}" };`,
        }}
      />
      <Script
        src={`https://webapi.amap.com/maps?v=2.0&key=${process.env.NEXT_PUBLIC_AMAP_KEY}`}
        strategy="afterInteractive"
        onLoad={initMap}
      />
      <style jsx global>{`
        .amap-logo, .amap-copyright {
           display: none !important;
        }
        
        @keyframes pulse-ring {
          0% {
            width: 16px;
            height: 16px;
            opacity: 0.8;
          }
          100% {
            width: 48px;
            height: 48px;
            opacity: 0;
          }
        }
        
        .user-location-marker {
          position: relative;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .user-location-dot {
          width: 16px;
          height: 16px;
          background-color: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          z-index: 2;
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
        }
        
        .user-location-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: rgba(59, 130, 246, 0.4);
          border-radius: 50%;
          animation: pulse-ring 2s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
          z-index: 1;
        }
      `}</style>
      
      {/* Map Container */}
      <div 
        ref={mapContainerRef} 
        className="absolute inset-0 z-0 bg-gray-200" 
        style={{ minHeight: '100%', minWidth: '100%' }}
      />

      {mapStatus !== "ready" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#f6f7f9]">
          <div className="text-center px-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-background shadow-sm border border-border/30 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-foreground/60" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground/80">
              {mapStatus === "loading" ? "地图加载中..." : "地图加载失败"}
            </p>
            {mapStatus === "error" && (
              <p className="mt-1 text-xs text-muted-foreground break-all">{mapError}</p>
            )}
          </div>
        </div>
      )}

      {/* ====== Floating header ====== */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        {/* Title row */}
        <div className="px-5 pt-4 pb-1 flex items-start justify-between pointer-events-auto">
          <div className="relative">
            {/* Collection name dropdown trigger */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowListDropdown(!showListDropdown)
              }}
              className="flex items-center gap-1 active:opacity-70 transition-opacity bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm"
            >
              <h1 className="text-[18px] font-bold tracking-tight text-foreground">
                {currentListName}
              </h1>
              <ChevronDown
                className={`w-4 h-4 text-foreground/50 transition-transform duration-200 ${showListDropdown ? "rotate-180" : ""}`}
              />
            </button>
            <p className="text-xs text-muted-foreground mt-1 ml-1 bg-background/50 inline-block px-1 rounded">
              {displayedRestaurants.length} 家收藏餐厅
            </p>

            {/* Collection dropdown */}
            {showListDropdown && (
              <div
                className="absolute top-full left-0 mt-2 w-56 bg-background rounded-2xl shadow-xl border border-border/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="py-1 max-h-64 overflow-y-auto">
                  {lists.map((list) => {
                    const isActive = list.id === currentListId
                    return (
                      <button
                        key={list.id}
                        onClick={() => {
                          onSelectList(list.id)
                          setShowListDropdown(false)
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isActive ? "bg-primary/8" : "active:bg-muted/60"
                        }`}
                      >
                        <span className="text-lg">{"\uD83D\uDCC2"}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${isActive ? "font-semibold text-primary" : "text-foreground"}`}>
                            {list.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{list.restaurants.length} 家餐厅</p>
                        </div>
                        {isActive && (
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Search button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowSearch(!showSearch)
              setShowListDropdown(false)
            }}
            className="w-10 h-10 rounded-full bg-background shadow-sm border border-border/30 flex items-center justify-center active:scale-95 transition-transform"
          >
            <Search className="w-[18px] h-[18px] text-foreground/60" />
          </button>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="px-5 pb-2 pointer-events-auto animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 bg-background rounded-full px-4 py-2.5 shadow-sm border border-border/30">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜索餐厅名称..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                onClick={(e) => e.stopPropagation()}
              />
              {searchText && (
                <button onClick={() => setSearchText("")} className="p-0.5">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Category chips - swipeable with snap & auto-center */}
        <div
          ref={chipScrollRef}
          className="overflow-x-auto pb-3 pt-1 pointer-events-auto"
          style={{
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            scrollSnapType: "x proximity",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <style>{`
            .chip-scroll::-webkit-scrollbar { display: none; }
          `}</style>
          <div
            className="chip-scroll flex items-center gap-2.5"
            style={{ paddingLeft: 20, paddingRight: 20 }}
          >
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  ref={(el) => {
                    if (el) chipRefs.current.set(cat.id, el)
                    else chipRefs.current.delete(cat.id)
                  }}
                  onClick={() => {
                    setActiveCategory(cat.id)
                    scrollChipToCenter(cat.id)
                  }}
                  style={{ scrollSnapAlign: "center" }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] whitespace-nowrap shrink-0 transition-all duration-250 border ${
                    isActive
                      ? "bg-foreground text-background font-semibold shadow-md border-foreground scale-105"
                      : "bg-background/90 text-foreground/70 font-medium shadow-sm border-border/30 active:scale-[0.96]"
                  }`}
                >
                  <span className="text-[15px] leading-none">{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>



      {/* Locate button */}
      <button
        className="absolute right-4 z-10 w-10 h-10 rounded-full bg-background shadow-md border border-border/30 flex items-center justify-center active:scale-95 transition-transform"
        style={{ bottom: selectedRestaurant ? 260 : 100 }}
        onClick={locateUser}
        disabled={isLocating}
      >
        {isLocating ? (
          <Loader2 className="w-[18px] h-[18px] text-primary animate-spin" />
        ) : (
          <Crosshair className="w-[18px] h-[18px] text-foreground/50" />
        )}
      </button>

      {/* ====== Bottom detail card ====== */}
      {selectedRestaurant && (
        <div className="absolute bottom-20 left-0 right-0 z-30 p-3 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-background rounded-2xl shadow-xl overflow-hidden border border-border/30">
            <div className="flex">
              <div className="w-24 h-24 flex-shrink-0">
                <img
                  src={
                    selectedRestaurant.imageUrl ||
                    `/placeholder.svg?height=96&width=96&query=${encodeURIComponent(selectedRestaurant.name)}`
                  }
                  alt={selectedRestaurant.name}
                  className="w-full h-full object-cover rounded-l-2xl"
                />
              </div>

              <div className="flex-1 p-3 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <h3 className="font-semibold text-sm truncate">{selectedRestaurant.name}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedRestaurant(null)
                    }}
                    className="p-0.5 -mr-1 -mt-0.5 text-muted-foreground/50"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {selectedRestaurant.tags.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {selectedRestaurant.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 text-[10px] rounded-full bg-primary/8 text-primary font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-primary font-semibold text-xs">¥{selectedRestaurant.avgPrice}/人</span>
                  {selectedRestaurant.rating && (
                    <span className="flex items-center gap-0.5 text-amber-500 text-[11px]">
                      <Star className="w-3 h-3 fill-current" />
                      {selectedRestaurant.rating}
                    </span>
                  )}
                  <span className="flex items-center gap-0.5 text-muted-foreground text-[11px]">
                    <Clock className="w-3 h-3" />
                    {selectedRestaurant.openTime}-{selectedRestaurant.closeTime}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 px-3 pb-3 pt-1">
              <Button
                variant={selectedRestaurant.excluded ? "default" : "outline"}
                size="sm"
                className="flex-1 h-8 text-xs rounded-xl"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleExclude(selectedRestaurant.id)
                }}
              >
                {selectedRestaurant.excluded ? "恢复" : "排除"}
              </Button>
              <Button size="sm" className="flex-1 h-8 text-xs rounded-xl">
                <Navigation className="w-3.5 h-3.5 mr-1" />
                导航
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {displayedRestaurants.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center bg-background rounded-2xl p-8 shadow-sm border border-border/20 z-10">
            <p className="font-medium text-foreground/70">没有找到餐厅</p>
            <p className="text-sm text-muted-foreground mt-1">
              {activeCategory !== "all" ? "试试切换其他分类" : "点击底部添加你想去的餐厅"}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
