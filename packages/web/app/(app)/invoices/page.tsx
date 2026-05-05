'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import type { Invoice } from '@/types'

export default function InvoicesPage() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.get('/invoices').then((r) => r.data.data as Invoice[]),
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Invoices</h1>
        <p className="text-sm text-gray-500">{invoices?.length ?? 0} documentos</p>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-6 py-3 font-medium text-gray-500">Invoice #</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Pedimento</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Cliente</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Fecha</th>
                  <th className="px-6 py-3 font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices?.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900">{inv.numeroInvoice}</td>
                    <td className="px-6 py-3 text-gray-700">{inv.numeroPedimento}</td>
                    <td className="px-6 py-3 text-gray-700">{inv.cliente?.nombre ?? '—'}</td>
                    <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(inv.creadoEn)}</td>
                    <td className="px-6 py-3">
                      <Link href={`/movimientos/${inv.movimientoId}`} className="text-xs text-blue-600 hover:underline">
                        Ver movimiento
                      </Link>
                    </td>
                  </tr>
                ))}
                {!invoices?.length && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Sin invoices</td>
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
