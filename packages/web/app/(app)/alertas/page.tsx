'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import type { Alerta } from '@/types'
import { useState } from 'react'

const tipoLabel: Record<string, string> = {
  DIAS_48: '48 horas',
  DIAS_72: '72 horas',
  MEDICION_FALLIDA: 'Medición fallida',
  SELLO_NO_COINCIDE: 'Sello no coincide',
}

const tipoVariant: Record<string, 'warning' | 'danger'> = {
  DIAS_48: 'warning',
  DIAS_72: 'danger',
  MEDICION_FALLIDA: 'danger',
  SELLO_NO_COINCIDE: 'danger',
}

export default function AlertasPage() {
  const qc = useQueryClient()
  const [showAll, setShowAll] = useState(false)

  const { data: alertas, isLoading } = useQuery({
    queryKey: ['alertas', showAll],
    queryFn: () =>
      api.get(`/alertas${showAll ? '' : '?atendida=false'}`).then((r) => r.data.data as Alerta[]),
  })

  const attend = useMutation({
    mutationFn: (id: string) => api.patch(`/alertas/${id}/atender`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alertas'] }),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Alertas</h1>
          <p className="text-sm text-gray-500">{alertas?.length ?? 0} alertas</p>
        </div>
        <button
          onClick={() => setShowAll((v) => !v)}
          className="text-sm text-blue-600 hover:underline"
        >
          {showAll ? 'Ver solo activas' : 'Ver todas'}
        </button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="divide-y divide-gray-100">
            {alertas?.map((a) => (
              <div key={a.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={tipoVariant[a.tipo] ?? 'warning'}>{tipoLabel[a.tipo] ?? a.tipo}</Badge>
                    {a.atendida && <Badge variant="success">Atendida</Badge>}
                  </div>
                  <p className="text-sm text-gray-900">{a.mensaje}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                    <span>{formatDateTime(a.creadoEn)}</span>
                    <Link href={`/movimientos/${a.movimientoId}`} className="text-blue-600 hover:underline">
                      Ver movimiento
                    </Link>
                  </div>
                </div>
                {!a.atendida && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => attend.mutate(a.id)}
                    disabled={attend.isPending}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Atender
                  </Button>
                )}
              </div>
            ))}
            {!alertas?.length && (
              <p className="px-6 py-12 text-center text-sm text-gray-400">
                {showAll ? 'No hay alertas' : 'No hay alertas activas'}
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
