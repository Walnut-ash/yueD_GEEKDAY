
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tag = searchParams.get('tag')
  const maxPrice = searchParams.get('maxPrice')
  
  try {
    const where: any = {}

    if (tag) {
      where.tags = {
        some: {
          name: {
            contains: tag
          }
        }
      }
    }

    if (maxPrice) {
      where.avgPrice = {
        lte: parseFloat(maxPrice)
      }
    }

    const restaurants = await prisma.restaurant.findMany({
      where,
      include: {
        tags: true,
        dishes: true
      }
    })

    // Transform data to match frontend expectations (flat arrays for tags/dishes)
    const formattedRestaurants = restaurants.map(r => ({
      ...r,
      tags: r.tags.map(t => t.name),
      dishes: r.dishes.map(d => d.name)
    }))

    return NextResponse.json(formattedRestaurants)
  } catch (error) {
    console.error('Error fetching restaurants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch restaurants' },
      { status: 500 }
    )
  }
}
