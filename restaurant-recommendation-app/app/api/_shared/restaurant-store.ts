import { promises as fs } from "node:fs"
import path from "node:path"
import type { Restaurant, RestaurantList } from "@/types/restaurant"

type RestaurantInput = Omit<Restaurant, "id" | "createdAt">

function dataFilePath() {
  return path.join((globalThis as any).process.cwd(), ".data", "restaurant-lists.json")
}

async function ensureDataDir() {
  await fs.mkdir(path.dirname(dataFilePath()), { recursive: true })
}

export async function loadLists(): Promise<RestaurantList[]> {
  try {
    const raw = await fs.readFile(dataFilePath(), "utf8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as RestaurantList[]) : []
  } catch {
    return []
  }
}

export async function saveLists(lists: RestaurantList[]) {
  await ensureDataDir()
  await fs.writeFile(dataFilePath(), JSON.stringify(lists, null, 2), "utf8")
}

export async function createList(name: string) {
  const lists = await loadLists()
  const list: RestaurantList = {
    id: crypto.randomUUID(),
    name,
    restaurants: [],
    createdAt: new Date().toISOString(),
    shareCode: generateShareCode(),
  }
  lists.push(list)
  await saveLists(lists)
  return list
}

export async function addRestaurantToList(listId: string, restaurant: RestaurantInput) {
  const lists = await loadLists()
  const list = lists.find((l) => l.id === listId)
  if (!list) return null

  const created: Restaurant = {
    ...restaurant,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  list.restaurants.push(created)
  await saveLists(lists)
  return created
}

export async function updateRestaurantInList(listId: string, restaurantId: string, updates: Partial<Restaurant>) {
  const lists = await loadLists()
  const list = lists.find((l) => l.id === listId)
  if (!list) return null

  const restaurant = list.restaurants.find((r) => r.id === restaurantId)
  if (!restaurant) return null

  Object.assign(restaurant, updates)
  await saveLists(lists)
  return restaurant
}

function generateShareCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

