
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')
  const city = searchParams.get('city')
  const multiple = searchParams.get('multiple') === 'true'
  const location = searchParams.get('location') // e.g. "116.123,23.456"

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 })
  }

  const key = process.env.AMAP_WEB_SERVICE_KEY || process.env.NEXT_PUBLIC_AMAP_KEY
  if (!key) {
    return NextResponse.json({ error: 'AMap Key is missing' }, { status: 500 })
  }

  // Helper for distance calculation (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in meters
  }

  try {
    // 1. Try Place Search (POI) first - better for business names
    const keywords = address
    // If multiple is requested, maybe increase page size slightly (default is 20, usually enough)
    let poiUrl = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(keywords)}&city=${encodeURIComponent(city || '')}&offset=${multiple ? 10 : 1}&page=1&extensions=all&key=${key}`
    
    // If location is provided, sort by distance (search around)
    if (location) {
        // AMap v3 place/text doesn't support strict "location" param for sorting, 
        // but v3/place/around does. However, we want to search by keyword.
        // Actually v3/place/text supports `location` parameter to bias results, 
        // but sorting by distance isn't guaranteed unless we use `place/around` which requires center.
        // But let's check documentation... 
        // For text search, location is just a bias.
        // Let's add it anyway.
        poiUrl += `&location=${encodeURIComponent(location)}`
        // Note: AMap Web Service API "place/text" doesn't strictly sort by distance with just `location`.
        // But it helps to find nearby POIs.
    }

    const poiRes = await fetch(poiUrl)
    const poiData = await poiRes.json()

    if (poiData.status === '1' && poiData.pois && poiData.pois.length > 0) {
      if (multiple) {
         let candidates = poiData.pois.map((poi: any) => {
            const [lng, lat] = poi.location.split(',').map(Number)
            let imageUrl = null
            if (poi.photos && poi.photos.length > 0) {
              imageUrl = poi.photos[0].url
            }
            
            let distance = null;
            if (location) {
                const [userLng, userLat] = location.split(',').map(Number);
                distance = calculateDistance(userLat, userLng, lat, lng);
            }

            return {
              lat,
              lng,
              formattedAddress: poi.address || poi.name,
              province: poi.pname,
              city: poi.cityname,
              district: poi.adname,
              name: poi.name,
              imageUrl,
              type: poi.type,
              distance // Return distance
            }
         })

         // Sort by distance if available
         if (location) {
             candidates.sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0));
         }

         return NextResponse.json({ candidates })
      }

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
      
      const result = { 
        lat, 
        lng,
        formattedAddress: data.geocodes[0].formatted_address,
        province: data.geocodes[0].province,
        city: data.geocodes[0].city,
        district: data.geocodes[0].district,
        name: address // Fallback name
      }

      if (multiple) {
          return NextResponse.json({ candidates: [result] })
      }

      return NextResponse.json(result)
    } else {
      return NextResponse.json({ error: 'Location not found', details: { poi: poiData, geo: data } }, { status: 404 })
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
