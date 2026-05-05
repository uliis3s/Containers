'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import type { Rol } from '@/types'
import {
  LayoutDashboard,
  ClipboardList,
  Truck,
  ShieldCheck,
  Bell,
  FileText,
  LogOut,
  Package,
  ChevronRight,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles?: Rol[]
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/solicitudes', label: 'Solicitudes', icon: ClipboardList },
  { href: '/movimientos', label: 'Movimientos', icon: Truck },
  { href: '/inspecciones', label: 'Inspecciones', icon: ShieldCheck, roles: ['SEGURIDAD', 'LOGISTICA', 'ADMIN'] },
  { href: '/alertas', label: 'Alertas', icon: Bell, roles: ['LOGISTICA', 'SEGURIDAD', 'ADMIN'] },
  { href: '/invoices', label: 'Invoices', icon: FileText, roles: ['ENVIOS', 'VENTAS', 'LOGISTICA', 'ADMIN'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const visible = NAV.filter((item) => !item.roles || (user && item.roles.includes(user.rol)))

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <Package className="h-6 w-6 text-blue-600" />
        <span className="text-base font-bold text-gray-900">ContainerTrack</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {visible.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
              {active && <ChevronRight className="ml-auto h-4 w-4" />}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-gray-200 p-3">
        {user && (
          <div className="mb-2 px-3 py-2">
            <p className="truncate text-sm font-medium text-gray-900">{user.nombre}</p>
            <p className="truncate text-xs text-gray-500">{user.rol}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
