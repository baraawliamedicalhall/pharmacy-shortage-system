import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { Role } from '@prisma/client'
import { getLocalNetworkInterfaces } from '@/lib/network'
import QRCode from 'qrcode'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const port = parseInt(process.env.PORT || '3000', 10)
    const interfaces = getLocalNetworkInterfaces(port)
    const primaryUrl = interfaces[0]?.url || `http://localhost:${port}`

    // Generate offline QR code Data URL for instant phone camera scanning
    let qrDataUrl = ''
    try {
      qrDataUrl = await QRCode.toDataURL(primaryUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
    } catch (qrErr) {
      console.error('QR code generation error:', qrErr)
    }

    return NextResponse.json({
      port,
      interfaces,
      primaryUrl,
      qrDataUrl,
    })
  } catch (error) {
    console.error('Network info error:', error)
    return NextResponse.json({ error: 'Failed to detect network info' }, { status: 500 })
  }
}
