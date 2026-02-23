"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import type { Restaurant, RestaurantList } from "@/types/restaurant"
import {
  getLists,
  createList,
  addRestaurant,
  updateRestaurant,
  deleteRestaurant,
  deleteList,
} from "@/lib/storage"
import { mockRestaurants } from "@/lib/mock-restaurants"
import type { FilterOptions } from "@/components/filter-panel"
import { Map, List, User } from "lucide-react"
import { MobileMapView } from "@/components/mobile-map-view"
import { MobileRestaurantList } from "@/components/mobile-restaurant-list"
import { MobileAddRestaurant } from "@/components/mobile-add-restaurant"
import { MobileRandomPicker } from "@/components/mobile-random-picker"
import { MobileProfile } from "@/components/mobile-profile"
import { MobileAIChat } from "@/components/mobile-ai-chat"
import { Dice3D, DiceRollOverlay } from "@/components/dice-3d"
import confetti from "canvas-confetti"

type TabType = "map" | "list" | "add" | "random" | "profile" | "ai-chat"

export default function HomePage() {
  const [lists, setLists] = useState<RestaurantList[]>([])
  const [currentListId, setCurrentListId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>("map")
  const [prevTab, setPrevTab] = useState<TabType>("map")
  const [filters, setFilters] = useState<FilterOptions>({
    priceRange: [0, 500],
    tags: [],
    searchText: "",
  })
  const [aiFilteredIds, setAiFilteredIds] = useState<string[] | null>(null)
  const [aiFilterExplanation, setAiFilterExplanation] = useState<string>("")
  const [isDiceRolling, setIsDiceRolling] = useState(false)
  const [showDiceResult, setShowDiceResult] = useState(false)
  const [diceResult, setDiceResult] = useState<Restaurant | null>(null)

  useEffect(() => {
    let storedLists = getLists()
    if (storedLists.length === 0) {
      const defaultList = createList("我的收藏")
      storedLists = getLists()
      mockRestaurants.forEach((restaurant) => {
        addRestaurant(defaultList.id, restaurant)
      })
      storedLists = getLists()
    }
    setLists(storedLists)
    setCurrentListId(storedLists[0]?.id || null)
  }, [])

  const currentList = lists.find((l) => l.id === currentListId)
  const restaurants = currentList?.restaurants || []

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      if (r.avgPrice < filters.priceRange[0] || r.avgPrice > filters.priceRange[1]) return false
      if (filters.tags.length > 0 && !filters.tags.some((tag) => r.tags.includes(tag))) return false
      if (filters.searchText) {
        const search = filters.searchText.toLowerCase()
        return (
          r.name.toLowerCase().includes(search) || r.address.toLowerCase().includes(search)
        )
      }
      return true
    })
  }, [restaurants, filters])

  const handleCreateList = (name: string) => {
    const newList = createList(name)
    setLists(getLists())
    setCurrentListId(newList.id)
  }

  const handleDeleteList = (id: string) => {
    deleteList(id)
    const updatedLists = getLists()
    setLists(updatedLists)
    setCurrentListId(updatedLists[0]?.id || null)
  }

  const handleAddRestaurant = (restaurant: Omit<Restaurant, "id" | "createdAt">) => {
    if (currentListId) {
      addRestaurant(currentListId, restaurant)
      setLists(getLists())
      setActiveTab("list")
    }
  }

  const handleToggleExclude = (restaurantId: string) => {
    if (currentListId) {
      const restaurant = restaurants.find((r) => r.id === restaurantId)
      if (restaurant) {
        updateRestaurant(currentListId, restaurantId, { excluded: !restaurant.excluded })
        setLists(getLists())
      }
    }
  }

  const handleDeleteRestaurant = (restaurantId: string) => {
    if (currentListId) {
      deleteRestaurant(currentListId, restaurantId)
      setLists(getLists())
    }
  }

  const handleAIFilter = (ids: string[] | null, explanation?: string) => {
    setAiFilteredIds(ids)
    setAiFilterExplanation(explanation || "")
  }

  const handleChangeTab = (tab: TabType) => {
    if (tab === activeTab) return
    setPrevTab(activeTab)
    setActiveTab(tab)
  }

  // Dice long press: start 3D rolling animation
  const handleDiceLongPress = useCallback(() => {
    const available = filteredRestaurants.filter((r) => !r.excluded)
    if (available.length === 0) return
    setIsDiceRolling(true)
    setShowDiceResult(false)
    setDiceResult(null)
  }, [filteredRestaurants])

  // Dice tap: go to AI chat
  const handleDiceTap = useCallback(() => {
    handleChangeTab("ai-chat")
  }, [])

  const tabs = [
    { id: "map" as const, icon: Map, label: "地图" },
    { id: "list" as const, icon: List, label: "列表" },
    { id: "dice" as const, icon: null, label: "骰子" },
    { id: "add" as const, icon: null, label: "添加" },
    { id: "profile" as const, icon: User, label: "我的" },
  ]

  const showBottomBar = activeTab !== "ai-chat"

  return (
    <div className="mx-auto max-w-[430px] h-screen bg-background flex flex-col relative shadow-2xl overflow-hidden">
      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === "map" && (
          <MobileMapView
            restaurants={filteredRestaurants}
            onToggleExclude={handleToggleExclude}
          />
        )}
        {activeTab === "list" && (
          <MobileRestaurantList
            restaurants={filteredRestaurants}
            allRestaurants={restaurants}
            filters={filters}
            onFiltersChange={setFilters}
            onToggleExclude={handleToggleExclude}
            onDelete={handleDeleteRestaurant}
            aiFilteredIds={aiFilteredIds}
            onAIFilter={handleAIFilter}
            aiFilterExplanation={aiFilterExplanation}
          />
        )}
        {activeTab === "add" && <MobileAddRestaurant onAdd={handleAddRestaurant} />}
        {activeTab === "random" && (
          <MobileRandomPicker restaurants={filteredRestaurants} />
        )}
        {activeTab === "profile" && (
          <MobileProfile
            lists={lists}
            currentListId={currentListId}
            onSelectList={setCurrentListId}
            onCreateList={handleCreateList}
            onDeleteList={handleDeleteList}
            currentList={currentList}
          />
        )}
        {activeTab === "ai-chat" && (
          <MobileAIChat
            restaurants={restaurants}
            onBack={() => handleChangeTab(prevTab)}
          />
        )}
      </main>

      {/* 3D Dice rolling overlay */}
      {isDiceRolling && (
        <DiceRollOverlay
          onFinish={() => {
            const available = filteredRestaurants.filter((r) => !r.excluded)
            if (available.length > 0) {
              const picked = available[Math.floor(Math.random() * available.length)]
              setDiceResult(picked)
              setShowDiceResult(true)
              confetti({ particleCount: 120, spread: 80, origin: { y: 0.7 } })
            }
            setIsDiceRolling(false)
          }}
        />
      )}

      {/* Result card overlay */}
      {showDiceResult && diceResult && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          onClick={() => {
            setShowDiceResult(false)
            setDiceResult(null)
          }}
        >
          <div className="absolute inset-0 bg-foreground/50 backdrop-blur-md" />
          <div className="relative z-10 flex flex-col items-center gap-4 px-6">
            <div className="animate-in zoom-in-75 fade-in duration-500 w-full max-w-sm">
              <div className="rounded-3xl overflow-hidden bg-card border-2 border-primary shadow-2xl">
                <div className="h-44 relative">
                  <img
                    src={
                      diceResult.imageUrl ||
                      `/placeholder.svg?height=200&width=400&query=${encodeURIComponent(diceResult.name)}`
                    }
                    alt={diceResult.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-lg">
                    就是这家!
                  </div>
                </div>
                <div className="p-5 -mt-8 relative">
                  <h3 className="font-bold text-2xl">{diceResult.name}</h3>
                  {diceResult.tags.length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {diceResult.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs rounded-full bg-primary/15 text-primary font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-primary font-bold text-lg">
                      ¥{diceResult.avgPrice}/人
                    </span>
                    {diceResult.rating && (
                      <span className="flex items-center gap-1 text-amber-500 text-sm">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        {diceResult.rating}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 truncate">
                    {diceResult.address}
                  </p>
                  {diceResult.dishes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex flex-wrap gap-1.5">
                        {diceResult.dishes.slice(0, 4).map((d) => (
                          <span
                            key={d}
                            className="px-2 py-1 bg-muted rounded-lg text-xs"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-center text-sm mt-4 drop-shadow" style={{ color: "oklch(0.95 0 0)" }}>
                点击任意位置关闭
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Glass bottom tab bar */}
      {showBottomBar && (
        <nav className="flex-shrink-0 relative">
          {/* Glass background */}
          <div className="absolute inset-0 glass-tab-bar" />

          <div className="relative flex items-end justify-around h-20 pb-safe px-2">
            {/* Map tab */}
            <button
              onClick={() => handleChangeTab("map")}
              className={`tab-item flex flex-col items-center justify-center w-16 pb-2 pt-3 transition-all duration-300 ${
                activeTab === "map" ? "tab-active" : ""
              }`}
            >
              <Map
                className={`w-6 h-6 transition-all duration-300 ${
                  activeTab === "map"
                    ? "text-primary stroke-[2.5px] scale-110"
                    : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] mt-1 transition-all duration-300 ${
                  activeTab === "map"
                    ? "text-primary font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                地图
              </span>
            </button>

            {/* List tab */}
            <button
              onClick={() => handleChangeTab("list")}
              className={`tab-item flex flex-col items-center justify-center w-16 pb-2 pt-3 transition-all duration-300 ${
                activeTab === "list" ? "tab-active" : ""
              }`}
            >
              <List
                className={`w-6 h-6 transition-all duration-300 ${
                  activeTab === "list"
                    ? "text-primary stroke-[2.5px] scale-110"
                    : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] mt-1 transition-all duration-300 ${
                  activeTab === "list"
                    ? "text-primary font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                列表
              </span>
            </button>

            {/* Center Dice button */}
            <div className="flex flex-col items-center -mt-5 relative z-10">
              <div className="w-[60px] h-[60px] rounded-full glass-dice-bg flex items-center justify-center shadow-lg">
                <Dice3D
                  onTap={handleDiceTap}
                  onLongPress={handleDiceLongPress}
                  isRolling={isDiceRolling}
                />
              </div>
              <span className="text-[10px] mt-1 text-muted-foreground">骰子</span>
            </div>

            {/* Add tab */}
            <button
              onClick={() => handleChangeTab("add")}
              className={`tab-item flex flex-col items-center justify-center w-16 pb-2 pt-3 transition-all duration-300 ${
                activeTab === "add" ? "tab-active" : ""
              }`}
            >
              <svg
                className={`w-6 h-6 transition-all duration-300 ${
                  activeTab === "add"
                    ? "text-primary scale-110"
                    : "text-muted-foreground"
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={activeTab === "add" ? 2.5 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span
                className={`text-[10px] mt-1 transition-all duration-300 ${
                  activeTab === "add"
                    ? "text-primary font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                添加
              </span>
            </button>

            {/* Profile tab */}
            <button
              onClick={() => handleChangeTab("profile")}
              className={`tab-item flex flex-col items-center justify-center w-16 pb-2 pt-3 transition-all duration-300 ${
                activeTab === "profile" ? "tab-active" : ""
              }`}
            >
              <User
                className={`w-6 h-6 transition-all duration-300 ${
                  activeTab === "profile"
                    ? "text-primary stroke-[2.5px] scale-110"
                    : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] mt-1 transition-all duration-300 ${
                  activeTab === "profile"
                    ? "text-primary font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                我的
              </span>
            </button>
          </div>
        </nav>
      )}
    </div>
  )
}
