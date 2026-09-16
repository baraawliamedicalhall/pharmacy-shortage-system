import React from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { Role } from '@prisma/client'
import { Navbar } from '@/components/Navbar'
import { AdminSidebar } from '@/components/AdminSidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?redirect=/admin')
  }

  if (user.role !== Role.ADMIN) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar user={user} />
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto shadow-xs border-x border-slate-200">
        <AdminSidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  )
}
