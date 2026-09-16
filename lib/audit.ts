import { prisma } from './prisma'

export async function createAuditLog(
  action: string,
  options?: {
    userId?: string
    details?: string
    ipAddress?: string
  }
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId: options?.userId,
        details: options?.details,
        ipAddress: options?.ipAddress,
      },
    })
  } catch (error) {
    console.error('Failed to write audit log:', error)
  }
}
