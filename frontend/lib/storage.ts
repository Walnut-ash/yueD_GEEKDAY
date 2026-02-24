import type { Restaurant, RestaurantList } from "@/types/restaurant"

const STORAGE_KEY = "restaurant-lists"

// Simple UUID generator for HTTP environments where crypto.randomUUID may not be available
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export function getLists(): RestaurantList[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(STORAGE_KEY)
  return data ? JSON.parse(data) : []
}

export function saveLists(lists: RestaurantList[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists))
}

export function createList(name: string): RestaurantList {
  const lists = getLists()
  const newList: RestaurantList = {
    id: generateUUID(),
    name,
    restaurants: [],
    createdAt: new Date().toISOString(),
    shareCode: generateShareCode(),
  }
  lists.push(newList)
  saveLists(lists)
  return newList
}

export function addRestaurant(listId: string, restaurant: Omit<Restaurant, "id" | "createdAt">) {
  const lists = getLists()
  const list = lists.find((l) => l.id === listId)
  if (list) {
    list.restaurants.push({
      ...restaurant,
      id: generateUUID(),
      createdAt: new Date().toISOString(),
    })
    saveLists(lists)
  }
  return lists
}

export function updateRestaurant(listId: string, restaurantId: string, updates: Partial<Restaurant>) {
  const lists = getLists()
  const list = lists.find((l) => l.id === listId)
  if (list) {
    const restaurant = list.restaurants.find((r) => r.id === restaurantId)
    if (restaurant) {
      Object.assign(restaurant, updates)
      saveLists(lists)
    }
  }
  return lists
}

export function deleteRestaurant(listId: string, restaurantId: string) {
  const lists = getLists()
  const list = lists.find((l) => l.id === listId)
  if (list) {
    list.restaurants = list.restaurants.filter((r) => r.id !== restaurantId)
    saveLists(lists)
  }
  return lists
}

export function deleteList(listId: string) {
  const lists = getLists().filter((l) => l.id !== listId)
  saveLists(lists)
  return lists
}

function generateShareCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}
