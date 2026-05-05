'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import type { Inspeccion } from '@/types'

const resultadoVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  OK: 'success',
  REVISAR: 'warning',
  RECHAZADO: 'danger',
}

interface InspeccionExtended extends Inspeccion {
  movimientoId: string
  movimiento?: { solicitud?: { conductor?: { nombre: string }; transportista?: { nombre: string } } }
}

export default function InspeccionesPage() {
  const { data: inspecciones, isLoading } = useQuery({
    queryKey: ['inspecciones'],
    queryFn: () => api.get('/inspecciones').then((r) => r.data.data as InspeccionExtended[]),
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Inspecciones</h1>
        <p className="text-sm text-gray-500">{inspecciones?.length ?? 0} registros</p>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-6 py-3 font-medium text-gray-500">Conductor</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Momento</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Resultado</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Medición</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Sello</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Fecha</th>
                  <th className="px-6 py-3 font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inspecciones?.map((ins) => (
                  <tr key={ins.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-medium">{ins.movimiento?.solicitud?.conductor?.nombre ?? '—'}</p>
                      <p className="text-xs text-gray-400">{ins.movimiento?.solicitud?.transportista?.nombre}</p>
                    </td>
                    <td className="px-6 py-3 text-gray-700">{ins.momento}</td>
                    <td className="px-6 py-3">
                      <Badge variant={resultadoVariant[ins.resultado]}>{ins.resultado}</Badge>
                    </td>
                    <td className="px-6 py-3">
                      {ins.medicionOk === null ? '—' : ins.medicionOk ? (
                        <Badge variant="success">OK</Badge>
                      ) : (
                        <Badge variant="danger">FALLA</Badge>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {ins.iaSelloOk === null ? '—' : ins.iaSelloOk ? (
                        <Badge variant="success">OK</Badge>
                      ) : (
                        <Badge variant="danger">FALLA</Badge>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(ins.creadoEn)}</td>
                    <td className="px-6 py-3">
                      <Link href={`/movimientos/${ins.movimientoId}`} className="text-xs text-blue-600 hover:underline">
                        Ver mov.
                      </Link>
                    </td>
                  </tr>
                ))}
                {!inspecciones?.length && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">Sin inspecciones</td>
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
