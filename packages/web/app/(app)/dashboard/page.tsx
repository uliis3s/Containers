'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { ClipboardList, Truck, Bell, ShieldCheck } from 'lucide-react'
import type { Solicitud, Movimiento, Alerta } from '@/types'

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  color = 'blue',
}: {
  label: string
  value: number | string
  icon: React.ElementType
  href: string
  color?: string
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="flex items-center gap-4 py-5">
          <div className={`rounded-xl p-3 ${colors[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

const statusVariant: Record<string, 'warning' | 'success' | 'danger' | 'info' | 'purple' | 'default'> = {
  PENDIENTE: 'warning',
  APROBADA: 'success',
  RECHAZADA: 'danger',
  AUTORIZADO: 'info',
  EN_PLANTA: 'info',
  CARGANDO: 'purple',
  LISTO: 'success',
  DESPACHADO: 'default',
}

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: solicitudes, isLoading: loadingS } = useQuery({
    queryKey: ['solicitudes'],
    queryFn: () => api.get('/solicitudes').then((r) => r.data.data as Solicitud[]),
  })

  const { data: movimientos, isLoading: loadingM } = useQuery({
    queryKey: ['movimientos'],
    queryFn: () => api.get('/movimientos').then((r) => r.data.data as Movimiento[]),
  })

  const { data: alertas } = useQuery({
    queryKey: ['alertas', 'active'],
    queryFn: () => api.get('/alertas?atendida=false').then((r) => r.data.data as Alerta[]),
    enabled: ['LOGISTICA', 'SEGURIDAD', 'ADMIN'].includes(user?.rol ?? ''),
  })

  const pendientes = solicitudes?.filter((s) => s.status === 'PENDIENTE').length ?? 0
  const enPlanta = movimientos?.filter((m) => !['DESPACHADO'].includes(m.status)).length ?? 0
  const alertasActivas = alertas?.length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Bienvenido, {user?.nombre}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Solicitudes pendientes" value={pendientes} icon={ClipboardList} href="/solicitudes?status=PENDIENTE" color="yellow" />
        <StatCard label="Movimientos activos" value={enPlanta} icon={Truck} href="/movimientos" color="blue" />
        {['LOGISTICA', 'SEGURIDAD', 'ADMIN'].includes(user?.rol ?? '') && (
          <StatCard label="Alertas activas" value={alertasActivas} icon={Bell} href="/alertas" color="red" />
        )}
        <StatCard label="Total solicitudes" value={solicitudes?.length ?? 0} icon={ShieldCheck} href="/solicitudes" color="green" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Solicitudes recientes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingS ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : (
              <div className="divide-y divide-gray-100">
                {solicitudes?.slice(0, 6).map((s) => (
                  <Link key={s.id} href={`/solicitudes/${s.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.transportista.nombre}</p>
                      <p className="text-xs text-gray-500">{s.tipoOperacion} · {formatDateTime(s.creadoEn)}</p>
                    </div>
                    <Badge variant={statusVariant[s.status] ?? 'default'}>{s.status}</Badge>
                  </Link>
                ))}
                {!solicitudes?.length && (
                  <p className="px-6 py-8 text-center text-sm text-gray-400">Sin solicitudes</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Movimientos en planta</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingM ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : (
              <div className="divide-y divide-gray-100">
                {movimientos?.filter((m) => m.status !== 'DESPACHADO').slice(0, 6).map((m) => (
                  <Link key={m.id} href={`/movimientos/${m.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {m.solicitud?.conductor?.nombre ?? 'Sin conductor'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {m.solicitud?.tipoOperacion} · {m.lugarAsignado ?? 'Sin lugar'}
                        {m.alertasActivas > 0 && (
                          <span className="ml-2 text-red-600 font-medium">{m.alertasActivas} alerta(s)</span>
                        )}
                      </p>
                    </div>
                    <Badge variant={statusVariant[m.status] ?? 'default'}>{m.status}</Badge>
                  </Link>
                ))}
                {!movimientos?.filter((m) => m.status !== 'DESPACHADO').length && (
                  <p className="px-6 py-8 text-center text-sm text-gray-400">Sin movimientos activos</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
