
import { NextResponse } from 'next/server'
import { mockRestaurants } from '@/lib/mock-restaurants'

// Mock implementation to avoid Prisma/Database dependency for Vercel deployment
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tag = searchParams.get('tag')
  const maxPrice = searchParams.get('maxPrice')
  
  try {
    let restaurants = mockRestaurants.map(r => ({
      ...r,
      id: Math.random().toString(36).substring(7),
      createdAt: new Date(),
    }))

    if (tag) {
      restaurants = restaurants.filter(r => r.tags.some(t => t.includes(tag)))
    }

    if (maxPrice) {
      restaurants = restaurants.filter(r => r.avgPrice <= parseFloat(maxPrice))
    }

    return NextResponse.json(restaurants)
  } catch (error) {
    console.error('Error fetching restaurants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch restaurants' },
      { status: 500 }
    )
  }
}
