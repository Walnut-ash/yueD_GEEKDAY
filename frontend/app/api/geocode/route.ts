
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')
  const city = searchParams.get('city')

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 })
  }

  const key = process.env.AMAP_WEB_SERVICE_KEY || process.env.NEXT_PUBLIC_AMAP_KEY
  if (!key) {
    return NextResponse.json({ error: 'AMap Key is missing' }, { status: 500 })
  }

  try {
    // 1. Try Place Search (POI) first - better for business names
    const keywords = address
    const poiUrl = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(keywords)}&city=${encodeURIComponent(city || '')}&offset=1&page=1&extensions=all&key=${key}`
    const poiRes = await fetch(poiUrl)
    const poiData = await poiRes.json()

    if (poiData.status === '1' && poiData.pois && poiData.pois.length > 0) {
      const poi = poiData.pois[0]
      const location = poi.location
      const [lng, lat] = location.split(',').map(Number)
      
      // Get photos if available
      let imageUrl = null
      if (poi.photos && poi.photos.length > 0) {
        imageUrl = poi.photos[0].url
      }

      return NextResponse.json({ 
        lat, 
        lng,
        formattedAddress: poi.address || poi.name,
        province: poi.pname,
        city: poi.cityname,
        district: poi.adname,
        name: poi.name, // Also return name
        imageUrl // Return first photo URL
      })
    }

    // 2. Fallback to Geocoding API
    let geoUrl = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${key}`
    if (city) {
      geoUrl += `&city=${encodeURIComponent(city)}`
    }

    const res = await fetch(geoUrl)
    const data = await res.json()

    if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
      const location = data.geocodes[0].location
      const [lng, lat] = location.split(',').map(Number)
      return NextResponse.json({ 
        lat, 
        lng,
        formattedAddress: data.geocodes[0].formatted_address,
        province: data.geocodes[0].province,
        city: data.geocodes[0].city,
        district: data.geocodes[0].district
      })
    } else {
      return NextResponse.json({ error: 'Location not found', details: { poi: poiData, geo: data } }, { status: 404 })
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
