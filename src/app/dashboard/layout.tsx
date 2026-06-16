import { Sidebar } from '@/components/layout/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8 overflow-x-hidden">{children}</main>
    </div>
  )
}
