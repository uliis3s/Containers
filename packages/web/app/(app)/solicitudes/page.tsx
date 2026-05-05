'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { Solicitud } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
}

const statusVariant: Record<string, 'warning' | 'success' | 'danger'> = {
  PENDIENTE: 'warning',
  APROBADA: 'success',
  RECHAZADA: 'danger',
}

const OP_LABELS: Record<string, string> = {
  DROP: 'Drop',
  PICKUP: 'Pickup',
  SWAP: 'Swap',
}

export default function SolicitudesPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const statusFilter = searchParams.get('status') ?? ''

  const { data: solicitudes, isLoading } = useQuery({
    queryKey: ['solicitudes', statusFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      return api.get(`/solicitudes?${params}`).then((r) => r.data.data as Solicitud[])
    },
  })

  const canCreate = ['TRANSPORTISTA', 'LOGISTICA', 'ADMIN'].includes(user?.rol ?? '')

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Solicitudes</h1>
          <p className="text-sm text-gray-500">{solicitudes?.length ?? 0} solicitudes</p>
        </div>
        {canCreate && (
          <Link href="/solicitudes/nueva">
            <Button>
              <Plus className="h-4 w-4" />
              Nueva solicitud
            </Button>
          </Link>
        )}
      </div>

      <div className="flex gap-2">
        {['', 'PENDIENTE', 'APROBADA', 'RECHAZADA'].map((s) => (
          <Link key={s} href={s ? `/solicitudes?status=${s}` : '/solicitudes'}>
            <button
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s ? STATUS_LABELS[s] : 'Todas'}
            </button>
          </Link>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-6 py-3 font-medium text-gray-500">Transportista</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Conductor</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Operación</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Canal</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {solicitudes?.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <Link href={`/solicitudes/${s.id}`} className="font-medium text-blue-600 hover:underline">
                        {s.transportista.nombre}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-700">{s.conductor?.nombre ?? '—'}</td>
                    <td className="px-6 py-3">
                      <span className="font-medium">{OP_LABELS[s.tipoOperacion]}</span>
                    </td>
                    <td className="px-6 py-3 text-gray-500">{s.canalOrigen}</td>
                    <td className="px-6 py-3">
                      <Badge variant={statusVariant[s.status]}>{STATUS_LABELS[s.status]}</Badge>
                    </td>
                    <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(s.creadoEn)}</td>
                  </tr>
                ))}
                {!solicitudes?.length && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      No hay solicitudes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
