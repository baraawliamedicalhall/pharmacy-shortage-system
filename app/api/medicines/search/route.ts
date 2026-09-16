import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { fastSearchMedicines } from '@/lib/medicine-search'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const rawQuery = searchParams.get('q') || ''
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)))

    const results = await fastSearchMedicines(rawQuery, limit)

    return NextResponse.json(
      { medicines: results },
      {
        headers: {
          'Cache-Control': 'private, max-age=5',
        },
      }
    )
  } catch (error) {
    console.error('Medicine search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
