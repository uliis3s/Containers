// Seed script — dev/staging only. Reads DATABASE_URL directly from env.
// Exception to the config.ts rule: this is a CLI tool, not production code.
import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

import { PrismaClient, CategoriaCaja } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding ContainerTrack database…')

  // ── ISO container type catalog ─────────────────────────────────────────────
  // External dimensions per ISO 668. toleranciaCm default = 2.0 cm.
  const tiposCaja = [
    { codigo: '20ST-S', descripcion: '20ft Standard Seco',    categoria: CategoriaCaja.SECA,     largoRefCm: 605.8, anchoRefCm: 243.8, altoRefCm: 259.1 },
    { codigo: '40ST-S', descripcion: '40ft Standard Seco',    categoria: CategoriaCaja.SECA,     largoRefCm: 1219.2, anchoRefCm: 243.8, altoRefCm: 259.1 },
    { codigo: '40HC-S', descripcion: '40ft High Cube Seco',   categoria: CategoriaCaja.SECA,     largoRefCm: 1219.2, anchoRefCm: 243.8, altoRefCm: 289.6 },
    { codigo: '45HC-S', descripcion: '45ft High Cube Seco',   categoria: CategoriaCaja.SECA,     largoRefCm: 1371.6, anchoRefCm: 243.8, altoRefCm: 289.6 },
    { codigo: '20ST-M', descripcion: '20ft Standard Marítimo', categoria: CategoriaCaja.MARITIMA, largoRefCm: 605.8, anchoRefCm: 243.8, altoRefCm: 259.1 },
    { codigo: '40ST-M', descripcion: '40ft Standard Marítimo', categoria: CategoriaCaja.MARITIMA, largoRefCm: 1219.2, anchoRefCm: 243.8, altoRefCm: 259.1 },
    { codigo: '40HC-M', descripcion: '40ft High Cube Marítimo', categoria: CategoriaCaja.MARITIMA, largoRefCm: 1219.2, anchoRefCm: 243.8, altoRefCm: 289.6 },
  ]

  for (const t of tiposCaja) {
    await prisma.tipoCaja.upsert({
      where:  { codigo: t.codigo },
      update: {},
      create: t,
    })
  }
  console.log(`  ✓ ${tiposCaja.length} tipos de caja`)

  // ── Clientes ───────────────────────────────────────────────────────────────
  const clientes = [
    { nombre: 'BBY',     sellosRequeridos: 2, scac: 'BBYU' },
    { nombre: 'Element', sellosRequeridos: 2, scac: 'ELMT' },
    { nombre: 'Vizio',   sellosRequeridos: 1, scac: 'VZIO' },
    { nombre: 'ROKU',    sellosRequeridos: 2, scac: 'ROKU' },
    { nombre: 'PHP',     sellosRequeridos: 2, scac: 'PHPP' },
    { nombre: 'Sky',     sellosRequeridos: 2, scac: 'SKYY' },
  ]

  for (const c of clientes) {
    await prisma.cliente.upsert({
      where:  { nombre: c.nombre },
      update: {},
      create: c,
    })
  }
  console.log(`  ✓ ${clientes.length} clientes`)

  // ── Brokers ────────────────────────────────────────────────────────────────
  const brokerFrontera = await prisma.broker.upsert({
    where:  { id: 'seed-broker-frontera' },
    update: {},
    create: { id: 'seed-broker-frontera', nombre: 'Frontera Logistics', contacto: 'Carlos Méndez', email: 'ops@fronteralogistics.com', telefono: '+52 664 100 0001' },
  })

  const brokerBorder = await prisma.broker.upsert({
    where:  { id: 'seed-broker-border' },
    update: {},
    create: { id: 'seed-broker-border', nombre: 'Border Connect', contacto: 'Ana Ruiz', email: 'ops@borderconnect.com', telefono: '+52 664 100 0002' },
  })
  console.log('  ✓ 2 brokers')

  // ── Transportistas ─────────────────────────────────────────────────────────
  const carriers = [
    { id: 'seed-carrier-loras',  nombre: 'LORAS',  brokerId: brokerFrontera.id, contacto: 'Miguel Lora',     email: 'ops@loras.com.mx' },
    { id: 'seed-carrier-cts',    nombre: 'CTS',    brokerId: brokerFrontera.id, contacto: 'Sandra Cruz',     email: 'ops@cts.com.mx'   },
    { id: 'seed-carrier-mk',     nombre: 'MK',     brokerId: brokerBorder.id,   contacto: 'Manuel Kuri',     email: 'ops@mktrans.com'  },
    { id: 'seed-carrier-acv',    nombre: 'ACV',    brokerId: brokerBorder.id,   contacto: 'Alicia Vega',     email: 'ops@acv.com.mx'   },
    { id: 'seed-carrier-mexcal', nombre: 'MexCal', brokerId: null,              contacto: 'Roberto Caldera', email: 'ops@mexcal.com'   },
  ]

  for (const c of carriers) {
    await prisma.transportista.upsert({
      where:  { id: c.id },
      update: {},
      create: c,
    })
  }
  console.log(`  ✓ ${carriers.length} transportistas`)

  // ── Usuarios (one per role) ────────────────────────────────────────────────
  const password = await bcrypt.hash('ctpat2025', 10)

  const users = [
    { id: 'seed-user-admin',          email: 'admin@containertrack.mx',          nombre: 'Admin Sistema',      rol: 'ADMIN'         as const, entidadId: null,                   entidadTipo: null             },
    { id: 'seed-user-logistica',      email: 'logistica@containertrack.mx',      nombre: 'Logística MX',       rol: 'LOGISTICA'     as const, entidadId: null,                   entidadTipo: null             },
    { id: 'seed-user-seguridad',      email: 'seguridad@containertrack.mx',      nombre: 'Guardia Caseta',     rol: 'SEGURIDAD'     as const, entidadId: null,                   entidadTipo: null             },
    { id: 'seed-user-envios',         email: 'envios@containertrack.mx',         nombre: 'Shipping Clerk',     rol: 'ENVIOS'        as const, entidadId: null,                   entidadTipo: null             },
    { id: 'seed-user-ventas',         email: 'ventas@containertrack.mx',         nombre: 'Olivia Zhou',        rol: 'VENTAS'        as const, entidadId: null,                   entidadTipo: null             },
    { id: 'seed-user-transportista',  email: 'transportista@containertrack.mx',  nombre: 'Operador LORAS',     rol: 'TRANSPORTISTA' as const, entidadId: 'seed-carrier-loras',   entidadTipo: 'TRANSPORTISTA'  },
    { id: 'seed-user-broker',         email: 'broker@containertrack.mx',         nombre: 'Broker Frontera',    rol: 'BROKER'        as const, entidadId: 'seed-broker-frontera', entidadTipo: 'BROKER'         },
  ]

  for (const u of users) {
    await prisma.usuario.upsert({
      where:  { email: u.email },
      update: {},
      create: { ...u, passwordHash: password },
    })
  }
  console.log(`  ✓ ${users.length} usuarios (password: ctpat2025)`)

  console.log('✅ Seed completo.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
