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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-slate-50 flex flex-col justify-between">
          <div>{children}</div>
          <footer className="mt-12 pt-4 border-t border-slate-200 text-center text-xs text-slate-400 no-print">
            <p>
              Designed &amp; Developed by{' '}
              <a
                href="https://3s-soft.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 font-semibold hover:underline"
              >
                3s-Soft (3s-soft.com)
              </a>
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}
