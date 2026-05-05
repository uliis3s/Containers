'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import type { Movimiento } from '@/types'

const statusVariant: Record<string, 'info' | 'warning' | 'success' | 'purple' | 'default'> = {
  AUTORIZADO: 'info',
  EN_PLANTA: 'info',
  CARGANDO: 'purple',
  LISTO: 'success',
  DESPACHADO: 'default',
}

export default function MovimientosPage() {
  const { data: movimientos, isLoading } = useQuery({
    queryKey: ['movimientos'],
    queryFn: () => api.get('/movimientos').then((r) => r.data.data as Movimiento[]),
    refetchInterval: 30_000,
  })

  const activos = movimientos?.filter((m) => m.status !== 'DESPACHADO') ?? []
  const despachados = movimientos?.filter((m) => m.status === 'DESPACHADO') ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Movimientos</h1>
        <p className="text-sm text-gray-500">{activos.length} activos · {despachados.length} despachados</p>
      </div>

      <Card>
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Activos</h2>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-6 py-3 font-medium text-gray-500">Conductor</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Operación</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Lugar</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Entrada</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Alertas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activos.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <Link href={`/movimientos/${m.id}`} className="font-medium text-blue-600 hover:underline">
                        {m.solicitud?.conductor?.nombre ?? '—'}
                      </Link>
                      <p className="text-xs text-gray-400">{m.solicitud?.transportista?.nombre}</p>
                    </td>
                    <td className="px-6 py-3 text-gray-700">{m.solicitud?.tipoOperacion}</td>
                    <td className="px-6 py-3 text-gray-700">{m.lugarAsignado ?? '—'}</td>
                    <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(m.horaEntrada)}</td>
                    <td className="px-6 py-3">
                      <Badge variant={statusVariant[m.status] ?? 'default'}>{m.status}</Badge>
                    </td>
                    <td className="px-6 py-3">
                      {m.alertasActivas > 0 && (
                        <span className="flex items-center gap-1 text-red-600 font-medium text-xs">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {m.alertasActivas}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {!activos.length && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">Sin movimientos activos</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {despachados.length > 0 && (
        <Card>
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Despachados recientes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-6 py-3 font-medium text-gray-500">Conductor</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Salida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {despachados.slice(0, 10).map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <Link href={`/movimientos/${m.id}`} className="text-blue-600 hover:underline">
                        {m.solicitud?.conductor?.nombre ?? '—'}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-500">{formatDateTime(m.horaSalida)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
