import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, setSessionCookie } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit'
import { createAuditLog } from '@/lib/audit'

function getClientRedirectUrl(req: NextRequest, destination: string): URL {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '192.168.1.159:3000'
  const proto = req.headers.get('x-forwarded-proto') || 'http'
  const cleanPath = destination.startsWith('/') ? destination : `/${destination}`
  return new URL(cleanPath, `${proto}://${host}`)
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local'
    const rateCheck = checkRateLimit(`login_${ip}`, 25, 60 * 1000)

    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait 1 minute before trying again.' },
        { status: 429 }
      )
    }

    let employeeId = ''
    let password = ''
    let redirectParam = ''
    let isFormData = false

    const contentType = req.headers.get('content-type') || ''
    if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      isFormData = true
      const formData = await req.formData()
      employeeId = (formData.get('employeeId') as string) || ''
      password = (formData.get('password') as string) || ''
      redirectParam = (formData.get('redirect') as string) || ''
    } else {
      try {
        const body = await req.json()
        employeeId = body.employeeId || ''
        password = body.password || ''
        redirectParam = body.redirect || ''
      } catch {
        try {
          const formData = await req.formData()
          employeeId = (formData.get('employeeId') as string) || ''
          password = (formData.get('password') as string) || ''
          redirectParam = (formData.get('redirect') as string) || ''
        } catch {
          // ignore
        }
      }
    }

    const validation = loginSchema.safeParse({ employeeId, password })

    if (!validation.success) {
      const issue = validation.error.issues[0]
      if (isFormData) {
        return NextResponse.redirect(
          getClientRedirectUrl(req, `/login?error=${encodeURIComponent(issue.message)}`),
          303
        )
      }
      return NextResponse.json({ error: issue.message }, { status: 400 })
    }

    const cleanId = validation.data.employeeId.trim()
    const rawPassword = validation.data.password

    // Match case-insensitively across uppercase, lowercase, and exact
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { employeeId: { equals: cleanId.toUpperCase() } },
          { employeeId: { equals: cleanId.toLowerCase() } },
          { employeeId: { equals: cleanId } },
        ],
      },
    })

    if (!user || !user.isActive) {
      if (isFormData) {
        return NextResponse.redirect(
          getClientRedirectUrl(req, '/login?error=Invalid%20Employee%20ID%20or%20account%20inactive'),
          303
        )
      }
      return NextResponse.json({ error: 'Invalid Employee ID/Username or account inactive' }, { status: 401 })
    }

    const isMatch = await verifyPassword(rawPassword, user.passwordHash)
    if (!isMatch) {
      if (isFormData) {
        return NextResponse.redirect(
          getClientRedirectUrl(req, '/login?error=Invalid%20Password%20or%20PIN'),
          303
        )
      }
      return NextResponse.json({ error: 'Invalid Password or PIN' }, { status: 401 })
    }

    // Reset rate limit on success
    resetRateLimit(`login_${ip}`)

    // Create session cookie
    await setSessionCookie({
      userId: user.id,
      employeeId: user.employeeId,
      name: user.name,
      role: user.role,
    })

    await createAuditLog('LOGIN', {
      userId: user.id,
      details: `User ${user.employeeId} (${user.role}) logged in successfully.`,
      ipAddress: ip,
    })

    if (isFormData) {
      const defaultDest = user.role === 'ADMIN' ? '/admin' : '/'
      const destination =
        redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
          ? redirectParam
          : defaultDest
      return NextResponse.redirect(getClientRedirectUrl(req, destination), 303)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        employeeId: user.employeeId,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred during login' }, { status: 500 })
  }
}
