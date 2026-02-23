export interface Restaurant {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  avgPrice: number
  openTime: string
  closeTime: string
  dishes: string[]
  tags: string[]
  rating?: number
  source?: string
  sourceUrl?: string
  imageUrl?: string
  createdAt: string
  excluded?: boolean
}

export interface RestaurantList {
  id: string
  name: string
  restaurants: Restaurant[]
  createdAt: string
  shareCode?: string
}
