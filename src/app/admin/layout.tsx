'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  Image as ImageIcon, 
  MessageSquare, 
  Settings, 
  LogOut,
  Menu,
  X,
  Grid,
  Folder,
  Users,
  History
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Products', href: '/admin/products', icon: Package },
  { name: 'Categories', href: '/admin/categories', icon: Grid },
  { name: 'Brands', href: '/admin/brands', icon: Tags },
  { name: 'Gallery', href: '/admin/gallery', icon: ImageIcon },
  { name: 'Hero Banners', href: '/admin/hero', icon: ImageIcon },
  { name: 'Testimonials', href: '/admin/testimonials', icon: MessageSquare },
  { name: 'Leads', href: '/admin/leads', icon: MessageSquare },
  { name: 'Files', href: '/admin/files', icon: Folder },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Activity Logs', href: '/admin/logs', icon: History },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // If we are on the login page, don't show the sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-300 lg:translate-x-0 lg:static lg:block
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <span className="text-xl font-bold tracking-tight">Sangali Admin</span>
        </div>

        <nav className="p-4 flex flex-col gap-1 h-[calc(100vh-4rem)]">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors
                  ${isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }
                `}
              >
                <item.icon className="w-5 h-5 mr-3 shrink-0" />
                {item.name}
              </Link>
            )
          })}

          <div className="mt-auto pt-4 border-t border-gray-800 space-y-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-300 rounded-xl hover:bg-gray-800 hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3 shrink-0" />
              Logout
            </button>
          </div>
        </nav>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-white border-b border-gray-200 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-900"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-lg font-bold text-gray-900">Admin</span>
          <div className="w-6" /> {/* Spacer for centering */}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
