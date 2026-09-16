import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { EmployeeShortageClient } from '@/components/EmployeeShortageClient'

export default async function EmployeeShortagePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <EmployeeShortageClient
      user={{
        id: user.userId,
        employeeId: user.employeeId,
        name: user.name,
        role: user.role,
      }}
    />
  )
}
