'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { formatDateTime } from '@/lib/utils'
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import type { Solicitud } from '@/types'

const statusVariant: Record<string, 'warning' | 'success' | 'danger'> = {
  PENDIENTE: 'warning',
  APROBADA: 'success',
  RECHAZADA: 'danger',
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  )
}

export default function SolicitudDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: solicitud, isLoading } = useQuery({
    queryKey: ['solicitud', id],
    queryFn: () => api.get(`/solicitudes/${id}`).then((r) => r.data.data as Solicitud),
  })

  const approve = useMutation({
    mutationFn: () => api.patch(`/solicitudes/${id}/aprobar`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitud', id] })
      queryClient.invalidateQueries({ queryKey: ['solicitudes'] })
    },
  })

  const reject = useMutation({
    mutationFn: () => api.patch(`/solicitudes/${id}/rechazar`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitud', id] })
      queryClient.invalidateQueries({ queryKey: ['solicitudes'] })
    },
  })

  const canApprove = ['LOGISTICA', 'ADMIN'].includes(user?.rol ?? '') && solicitud?.status === 'PENDIENTE'

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
  }

  if (!solicitud) return <p className="text-center py-20 text-gray-400">Solicitud no encontrada</p>

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/solicitudes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Solicitud</h1>
            <Badge variant={statusVariant[solicitud.status]}>{solicitud.status}</Badge>
          </div>
          <p className="text-sm text-gray-500">{solicitud.transportista.nombre} · {formatDateTime(solicitud.creadoEn)}</p>
        </div>
        {canApprove && (
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => reject.mutate()}
              disabled={reject.isPending}
            >
              <XCircle className="h-4 w-4" />
              Rechazar
            </Button>
            <Button
              size="sm"
              onClick={() => approve.mutate()}
              disabled={approve.isPending}
            >
              <CheckCircle className="h-4 w-4" />
              Aprobar
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Operación</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Tipo" value={solicitud.tipoOperacion} />
            <Field label="Canal" value={solicitud.canalOrigen} />
            <Field label="Status" value={solicitud.status} />
            {solicitud.aprobadoEn && <Field label="Aprobado/rechazado" value={formatDateTime(solicitud.aprobadoEn)} />}
            {solicitud.comentarioLogistica && (
              <div className="col-span-2">
                <Field label="Comentario" value={solicitud.comentarioLogistica} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Conductor</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Nombre" value={solicitud.conductor?.nombre} />
            <Field label="Licencia" value={solicitud.conductor?.licenciaNumero} />
            <Field label="FAST" value={solicitud.conductor?.fastNumero} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tractor</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Número" value={solicitud.tractor?.truckNumero} />
            <Field label="Placas" value={solicitud.tractor?.placas} />
          </CardContent>
        </Card>

        {(solicitud.cajaDrop || solicitud.cajaPickup) && (
          <Card>
            <CardHeader><CardTitle>Cajas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {solicitud.cajaDrop && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Drop</p>
                  <p className="text-sm">{solicitud.cajaDrop.containerNumero} · {solicitud.cajaDrop.tipoCaja.codigo}</p>
                </div>
              )}
              {solicitud.cajaPickup && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Pickup</p>
                  <p className="text-sm">{solicitud.cajaPickup.containerNumero} · {solicitud.cajaPickup.tipoCaja.codigo}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Sellos</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {solicitud.sellos.map((sello, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
                  <span className="text-xs text-gray-500">{sello.orden}.</span>
                  <span className="text-sm font-medium text-gray-900">{sello.numero}</span>
                  <Badge variant={sello.tipo === 'PRIMARIO' ? 'info' : 'default'} className="text-xs">
                    {sello.tipo}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
