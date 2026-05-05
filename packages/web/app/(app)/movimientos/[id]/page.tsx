'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { formatDateTime } from '@/lib/utils'
import Image from 'next/image'
import { ArrowLeft, LogIn, LogOut, Truck } from 'lucide-react'
import Link from 'next/link'
import type { Movimiento } from '@/types'

const statusVariant: Record<string, 'info' | 'warning' | 'success' | 'purple' | 'default'> = {
  AUTORIZADO: 'info',
  EN_PLANTA: 'info',
  CARGANDO: 'purple',
  LISTO: 'success',
  DESPACHADO: 'default',
}

const NEXT_STATUS: Record<string, string> = {
  EN_PLANTA: 'CARGANDO',
  CARGANDO: 'LISTO',
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  )
}

export default function MovimientoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [lugarAsignado, setLugarAsignado] = useState('')

  const { data: movimiento, isLoading } = useQuery<Movimiento>({
    queryKey: ['movimiento', id],
    queryFn: () => api.get(`/movimientos/${id}`).then((r) => r.data.data as Movimiento),
  })

  useEffect(() => {
    if (movimiento?.lugarAsignado) setLugarAsignado(movimiento.lugarAsignado)
  }, [movimiento?.lugarAsignado])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['movimiento', id] })
    queryClient.invalidateQueries({ queryKey: ['movimientos'] })
  }

  const entrada = useMutation({
    mutationFn: () => api.patch(`/movimientos/${id}/entrada`, { lugarAsignado: lugarAsignado || undefined }),
    onSuccess: invalidate,
  })

  const salida = useMutation({
    mutationFn: () => api.patch(`/movimientos/${id}/salida`),
    onSuccess: invalidate,
  })

  const changeStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/movimientos/${id}/status`, { status }),
    onSuccess: invalidate,
  })

  const isSeguridad = ['SEGURIDAD', 'ADMIN'].includes(user?.rol ?? '')
  const isLogistica = ['LOGISTICA', 'ADMIN'].includes(user?.rol ?? '')

  if (isLoading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
  if (!movimiento) return <p className="text-center py-20 text-gray-400">Movimiento no encontrado</p>

  const m = movimiento

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/movimientos">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Movimiento</h1>
            <Badge variant={statusVariant[m.status] ?? 'default'}>{m.status}</Badge>
            {m.alertasActivas > 0 && (
              <Badge variant="danger">{m.alertasActivas} alerta(s)</Badge>
            )}
          </div>
          <p className="text-sm text-gray-500">{m.solicitud?.transportista?.nombre}</p>
        </div>
      </div>

      {isSeguridad && m.status === 'AUTORIZADO' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-blue-800 mb-3">Registrar entrada</p>
            <div className="flex gap-3">
              <Input
                value={lugarAsignado}
                onChange={(e) => setLugarAsignado(e.target.value)}
                placeholder="Lugar asignado (ej. Rampa 3)"
                className="flex-1"
              />
              <Button onClick={() => entrada.mutate()} disabled={entrada.isPending}>
                <LogIn className="h-4 w-4" />
                Registrar entrada
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLogistica && m.status === 'LISTO' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4 flex items-center justify-between">
            <p className="text-sm font-medium text-green-800">Unidad lista para despacho</p>
            <Button onClick={() => salida.mutate()} disabled={salida.isPending}>
              <LogOut className="h-4 w-4" />
              Registrar salida
            </Button>
          </CardContent>
        </Card>
      )}

      {isLogistica && NEXT_STATUS[m.status] && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4 flex items-center justify-between">
            <p className="text-sm font-medium text-yellow-800">
              Avanzar estado: {m.status} → {NEXT_STATUS[m.status]}
            </p>
            <Button
              variant="secondary"
              onClick={() => changeStatus.mutate(NEXT_STATUS[m.status])}
              disabled={changeStatus.isPending}
            >
              <Truck className="h-4 w-4" />
              Avanzar
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Conductor</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Nombre" value={m.solicitud?.conductor?.nombre} />
            <Field label="FAST" value={m.solicitud?.conductor?.fastNumero} />
            <Field label="Licencia" value={m.solicitud?.conductor?.licenciaNumero} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Movimiento</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Lugar asignado" value={m.lugarAsignado} />
            <Field label="Ubicación" value={m.ubicacion} />
            <Field label="Hora entrada" value={formatDateTime(m.horaEntrada)} />
            <Field label="Hora salida" value={formatDateTime(m.horaSalida)} />
          </CardContent>
        </Card>

        {m.solicitud?.sellos && m.solicitud.sellos.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Sellos esperados</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {m.solicitud.sellos.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
                    <span className="text-xs text-gray-500">{s.orden}.</span>
                    <span className="text-sm font-medium">{s.numero}</span>
                    <Badge variant={s.tipo === 'PRIMARIO' ? 'info' : 'default'} className="text-xs">{s.tipo}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {m.inspecciones && m.inspecciones.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Inspecciones</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {m.inspecciones.map((ins) => (
                <div key={ins.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{ins.momento}</span>
                    <Badge variant={ins.resultado === 'OK' ? 'success' : ins.resultado === 'REVISAR' ? 'warning' : 'danger'}>
                      {ins.resultado}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">{formatDateTime(ins.creadoEn)}</p>
                  {ins.discrepanciaDetalle && (
                    <p className="mt-1 text-sm text-red-600">{ins.discrepanciaDetalle}</p>
                  )}
                  {ins.fotos.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ins.fotos.map((f) => (
                        <a key={f.id} href={f.url} target="_blank" rel="noreferrer">
                          <Image src={f.url} alt={f.categoria} width={64} height={64} className="rounded object-cover border border-gray-200" unoptimized />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
