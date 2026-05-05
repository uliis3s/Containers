'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/input'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { Transportista, Conductor, Tractor, Caja } from '@/types'

interface SelloForm { numero: string; tipo: 'PRIMARIO' | 'SECUNDARIO'; orden: number }

export default function NuevaSolicitudPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [transportistaId, setTransportistaId] = useState(user?.rol === 'TRANSPORTISTA' ? user.entidadId ?? '' : '')
  const [conductorId, setConductorId] = useState('')
  const [tractorId, setTractorId] = useState('')
  const [cajaDropId, setCajaDropId] = useState('')
  const [cajaPickupId, setCajaPickupId] = useState('')
  const [tipoOperacion, setTipoOperacion] = useState<'DROP' | 'PICKUP' | 'SWAP'>('DROP')
  const [canalOrigen, setCanalOrigen] = useState<'EMAIL' | 'WHATSAPP' | 'TELEFONO' | 'PORTAL'>('PORTAL')
  const [comentario, setComentario] = useState('')
  const [sellos, setSellos] = useState<SelloForm[]>([{ numero: '', tipo: 'PRIMARIO', orden: 1 }])
  const [error, setError] = useState('')

  const { data: transportistas } = useQuery({
    queryKey: ['transportistas'],
    queryFn: () => api.get('/catalogos/transportistas').then((r) => r.data.data as Transportista[]),
    enabled: user?.rol !== 'TRANSPORTISTA',
  })

  const { data: conductores } = useQuery({
    queryKey: ['conductores', transportistaId],
    queryFn: () => api.get(`/catalogos/transportistas/${transportistaId}/conductores`).then((r) => r.data.data as Conductor[]),
    enabled: !!transportistaId,
  })

  const { data: tractores } = useQuery({
    queryKey: ['tractores', transportistaId],
    queryFn: () => api.get(`/catalogos/transportistas/${transportistaId}/tractores`).then((r) => r.data.data as Tractor[]),
    enabled: !!transportistaId,
  })

  const { data: cajas } = useQuery({
    queryKey: ['cajas', transportistaId],
    queryFn: () => api.get(`/catalogos/transportistas/${transportistaId}/cajas`).then((r) => r.data.data as Caja[]),
    enabled: !!transportistaId,
  })

  const create = useMutation({
    mutationFn: (body: object) => api.post('/solicitudes', body),
    onSuccess: (res) => {
      router.push(`/solicitudes/${res.data.data.id}`)
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e.response?.data?.message ?? 'Error al crear la solicitud')
    },
  })

  function addSello() {
    setSellos((prev) => [...prev, { numero: '', tipo: 'SECUNDARIO', orden: prev.length + 1 }])
  }

  function removeSello(i: number) {
    setSellos((prev) => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, orden: idx + 1 })))
  }

  function updateSello(i: number, field: keyof SelloForm, value: string | number) {
    setSellos((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const body: Record<string, unknown> = {
      conductorId,
      tractorId,
      tipoOperacion,
      canalOrigen,
      sellos,
    }
    if (comentario) body.comentario = comentario
    if (tipoOperacion === 'DROP' || tipoOperacion === 'SWAP') body.cajaDropId = cajaDropId
    if (tipoOperacion === 'PICKUP' || tipoOperacion === 'SWAP') body.cajaPickupId = cajaPickupId
    create.mutate(body)
  }

  const needsDrop = tipoOperacion === 'DROP' || tipoOperacion === 'SWAP'
  const needsPickup = tipoOperacion === 'PICKUP' || tipoOperacion === 'SWAP'

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/solicitudes">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Nueva solicitud</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <Card>
          <CardHeader><CardTitle>Operación</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Tipo de operación</label>
              <Select value={tipoOperacion} onChange={(e) => setTipoOperacion(e.target.value as 'DROP' | 'PICKUP' | 'SWAP')}>
                <option value="DROP">DROP</option>
                <option value="PICKUP">PICKUP</option>
                <option value="SWAP">SWAP</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Canal de origen</label>
              <Select value={canalOrigen} onChange={(e) => setCanalOrigen(e.target.value as 'EMAIL' | 'WHATSAPP' | 'TELEFONO' | 'PORTAL')}>
                <option value="PORTAL">Portal</option>
                <option value="EMAIL">Email</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="TELEFONO">Teléfono</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        {user?.rol !== 'TRANSPORTISTA' && (
          <Card>
            <CardHeader><CardTitle>Transportista</CardTitle></CardHeader>
            <CardContent>
              <Select
                value={transportistaId}
                onChange={(e) => { setTransportistaId(e.target.value); setConductorId(''); setTractorId('') }}
                required
              >
                <option value="">Seleccionar transportista</option>
                {transportistas?.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </Select>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Conductor y tractor</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Conductor</label>
              <Select value={conductorId} onChange={(e) => setConductorId(e.target.value)} required disabled={!transportistaId}>
                <option value="">Seleccionar</option>
                {conductores?.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Tractor</label>
              <Select value={tractorId} onChange={(e) => setTractorId(e.target.value)} required disabled={!transportistaId}>
                <option value="">Seleccionar</option>
                {tractores?.map((t) => (
                  <option key={t.id} value={t.id}>{t.truckNumero} — {t.placas}</option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        {(needsDrop || needsPickup) && (
          <Card>
            <CardHeader><CardTitle>Cajas</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {needsDrop && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Caja Drop</label>
                  <Select value={cajaDropId} onChange={(e) => setCajaDropId(e.target.value)} required disabled={!transportistaId}>
                    <option value="">Seleccionar</option>
                    {cajas?.map((c) => (
                      <option key={c.id} value={c.id}>{c.containerNumero} · {c.tipoCaja.codigo}</option>
                    ))}
                  </Select>
                </div>
              )}
              {needsPickup && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Caja Pickup</label>
                  <Select value={cajaPickupId} onChange={(e) => setCajaPickupId(e.target.value)} required disabled={!transportistaId}>
                    <option value="">Seleccionar</option>
                    {cajas?.map((c) => (
                      <option key={c.id} value={c.id}>{c.containerNumero} · {c.tipoCaja.codigo}</option>
                    ))}
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Sellos</CardTitle>
              <Button type="button" variant="secondary" size="sm" onClick={addSello}>
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sellos.map((sello, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 text-center text-sm text-gray-400">{sello.orden}</span>
                <Input
                  value={sello.numero}
                  onChange={(e) => updateSello(i, 'numero', e.target.value)}
                  placeholder="Número de sello"
                  required
                  className="flex-1"
                />
                <Select value={sello.tipo} onChange={(e) => updateSello(i, 'tipo', e.target.value)} className="w-36">
                  <option value="PRIMARIO">Primario</option>
                  <option value="SECUNDARIO">Secundario</option>
                </Select>
                {sellos.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeSello(i)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Comentario (opcional)</label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={3}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Notas adicionales…"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/solicitudes">
            <Button type="button" variant="secondary">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creando…' : 'Crear solicitud'}
          </Button>
        </div>
      </form>
    </div>
  )
}
