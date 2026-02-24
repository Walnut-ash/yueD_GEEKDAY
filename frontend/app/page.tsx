"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import type { Restaurant, RestaurantList } from "@/types/restaurant"
import {
  getLists,
  saveLists, // Import saveLists to update local storage
  createList,
  addRestaurant,
  updateRestaurant,
  deleteRestaurant,
  deleteList,
} from "@/lib/storage"
import type { FilterOptions } from "@/components/filter-panel"
import { Map, List, User, Loader2 } from "lucide-react" // Add Loader2
import { MobileMapView } from "@/components/mobile-map-view"
import { MobileRestaurantList } from "@/components/mobile-restaurant-list"
import { MobileAddRestaurant } from "@/components/mobile-add-restaurant"
import { MobileRandomPicker } from "@/components/mobile-random-picker"
import { MobileProfile } from "@/components/mobile-profile"
import { MobileAIChat } from "@/components/mobile-ai-chat"
import { Dice3D, DiceRollOverlay } from "@/components/dice-3d"
import confetti from "canvas-confetti"

type TabType = "map" | "list" | "add" | "random" | "profile" | "ai-chat"

const API_URL = '' // Use internal API routes when deployed on Vercel

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
  const [isSyncing, setIsSyncing] = useState(false) // Sync status

  // 1. Initial Load & URL Handling (Join Room)
  useEffect(() => {
    const initData = async () => {
      let storedLists = getLists()
      
      // Check URL parameters for join action
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        const joinListId = urlParams.get('listId')
        const action = urlParams.get('action')
        
        if (joinListId && action === 'join') {
           try {
             setIsSyncing(true)
             // Fetch the shared list from backend
             const res = await fetch(`${API_URL}/api/lists/${joinListId}`)
             if (res.ok) {
               const sharedList = await res.json()
               
               // Merge into local storage
               const existingIndex = storedLists.findIndex(l => l.id === sharedList.id)
               if (existingIndex >= 0) {
                 storedLists[existingIndex] = sharedList
               } else {
                 storedLists.push(sharedList)
               }
               
               saveLists(storedLists)
               setLists(storedLists)
               setCurrentListId(sharedList.id)
               setActiveTab("list") // Go to list view to see shared content
               
               // Clean URL
               window.history.replaceState({}, '', '/')
               alert(`成功加入协作列表：${sharedList.name}`)
             }
           } catch (e) {
             console.error("Join list failed", e)
             alert("加入列表失败，请检查网络或链接是否正确")
           } finally {
             setIsSyncing(false)
           }
           return // Stop here, don't load default mock data if joining
        }
      }

      if (storedLists.length === 0) {
        try {
          const res = await fetch('/api/restaurants')
          if (!res.ok) throw new Error('Failed to fetch')
          const data: Restaurant[] = await res.json()
          
          const defaultList = createList("我的收藏")
          data.forEach((restaurant) => {
            // Remove id and createdAt from API response to let addRestaurant generate new ones
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, createdAt, ...rest } = restaurant
            addRestaurant(defaultList.id, rest)
          })
          storedLists = getLists()
        } catch (error) {
          console.error("Failed to load initial data:", error)
        }
      }
      setLists(storedLists)
      setCurrentListId(storedLists[0]?.id || null)
    }

    initData()
  }, [])

  // 2. Sync Effect (Polling)
  // Poll backend every 2 seconds if we are on a list
  useEffect(() => {
    if (!currentListId) return
    
    // Immediate sync on mount/id change
    const sync = async () => {
        try {
            const res = await fetch(`${API_URL}/api/lists/${currentListId}`)
            if (res.ok) {
                const remoteList = await res.json()
                setLists(prev => {
                    const next = [...prev]
                    const idx = next.findIndex(l => l.id === remoteList.id)
                    if (idx >= 0) {
                        if (JSON.stringify(next[idx].restaurants) !== JSON.stringify(remoteList.restaurants) || next[idx].name !== remoteList.name) {
                             console.log('Syncing update from backend (immediate)...')
                             next[idx] = { ...remoteList }
                             saveLists(next)
                             return next
                        }
                    }
                    return prev
                })
            } else if (res.status === 404) {
               // If list not found on backend (maybe created offline), sync it up!
               console.log('List not found on backend, syncing up...')
               // Use a functional update or ref to access latest state, but here we can just use lists directly
               // However, lists is stale in this closure if not in dependency array.
               // Let's just find it in the current render scope, BUT wait, this effect runs on mount.
               // To fix this properly, we need to access the LATEST lists.
               // A simple way is to use a ref for lists.
               if (listsRef.current) {
                   const localList = listsRef.current.find(l => l.id === currentListId)
                   if (localList) {
                       syncToBackend(localList)
                   }
               }
            }
        } catch (e) {}
    }
    sync()
    
    const interval = setInterval(async () => {
        try {
            // Only sync if we have a backend (hackathon mode)
            // Ideally check if this list is "shared" or just sync everything
            const res = await fetch(`${API_URL}/api/lists/${currentListId}`)
            if (res.ok) {
                const remoteList = await res.json()
                
                // Compare timestamps or just dumb overwrite for now
                // Ideally backend should handle "last modified" logic
                // Here we just update local state if remote has more items or changed name
                // Simple hack: just overwrite local list in state (and storage)
                
                // Update lists state
                setLists(prev => {
                    const next = [...prev]
                    const idx = next.findIndex(l => l.id === remoteList.id)
                    if (idx >= 0) {
                        // Only update if content is different (simple check)
                        // Deep compare is expensive, maybe just check length or updatedAt if available
                        // Let's do a JSON compare for now as lists are small
                        if (JSON.stringify(next[idx].restaurants) !== JSON.stringify(remoteList.restaurants) || next[idx].name !== remoteList.name) {
                             console.log('Syncing update from backend...')
                             next[idx] = { ...remoteList } // Replace with remote
                             saveLists(next) // Persist
                             return next
                        }
                    }
                    return prev
                })
            } else if (res.status === 404) {
               // If list not found on backend (maybe created offline), sync it up!
               // Use ref to access latest state
               if (listsRef.current) {
                   const localList = listsRef.current.find(l => l.id === currentListId)
                   if (localList) {
                       syncToBackend(localList)
                   }
               }
            }
        } catch (e) {
            // Backend might be down or list not on backend yet
        }
    }, 2000)
    
    return () => clearInterval(interval)
  }, [currentListId]) // We don't want to re-run on lists change, so we use ref

  // Ref to hold latest lists for sync effect
  const listsRef = useRef(lists)
  useEffect(() => {
      listsRef.current = lists
  }, [lists])

  // Helper to sync specific list to backend
  const syncToBackend = async (list: RestaurantList) => {
      try {
          console.log('Syncing to backend:', list.name, list.restaurants.length)
          await fetch(`${API_URL}/api/lists`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(list)
          })
      } catch (e) {
          console.error("Sync failed", e)
      }
  }

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
    
    // Sync creation
    syncToBackend(newList)
  }

  const handleDeleteList = (id: string) => {
    deleteList(id)
    const updatedLists = getLists()
    setLists(updatedLists)
    setCurrentListId(updatedLists[0]?.id || null)
  }

  const handleAddRestaurant = (restaurant: Omit<Restaurant, "id" | "createdAt">, listId?: string) => {
    const targetListId = listId || currentListId
    if (targetListId) {
      addRestaurant(targetListId, restaurant)
      
      const newLists = getLists()
      setLists(newLists)
      setCurrentListId(targetListId)
      setActiveTab("list")
      
      // Sync update
      const updatedList = newLists.find(l => l.id === targetListId)
      if (updatedList) syncToBackend(updatedList)
    }
  }

  const handleToggleExclude = (restaurantId: string) => {
    if (currentListId) {
      const restaurant = restaurants.find((r) => r.id === restaurantId)
      if (restaurant) {
        updateRestaurant(currentListId, restaurantId, { excluded: !restaurant.excluded })
        
        const newLists = getLists()
        setLists(newLists)
        
        // Sync update
        const updatedList = newLists.find(l => l.id === currentListId)
        if (updatedList) syncToBackend(updatedList)
      }
    }
  }

  const handleDeleteRestaurant = (restaurantId: string) => {
    if (currentListId) {
      deleteRestaurant(currentListId, restaurantId)
      
      const newLists = getLists()
      setLists(newLists)
      
      // Sync update
      const updatedList = newLists.find(l => l.id === currentListId)
      if (updatedList) syncToBackend(updatedList)
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
            lists={lists}
            currentListId={currentListId}
            onSelectList={setCurrentListId}
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
            lists={lists}
            currentListId={currentListId}
            onSelectList={setCurrentListId}
            onCreateList={handleCreateList}
          />
        )}
        {activeTab === "add" && (
          <MobileAddRestaurant
            onAdd={handleAddRestaurant}
            lists={lists}
            currentListId={currentListId}
          />
        )}
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
