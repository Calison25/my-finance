#!/usr/bin/env node
// ============================================================
// My Finance - Seed Frontend (Zustand localStorage)
// ============================================================
// Gera o JSON para colar no console do browser:
//   node scripts/seed_frontend.mjs | pbcopy
//   (cola no console do browser e da reload)
//
// Ou roda direto e copia o output:
//   node scripts/seed_frontend.mjs > scripts/seed_output.js
// ============================================================

import { randomUUID } from "crypto"

const today = new Date()
const yyyy = today.getFullYear()
const mm = today.getMonth()
const dd = today.getDate()

function dateStr(year, month, day) {
  const d = new Date(year, month, Math.min(day, daysInMonth(year, month)))
  return d.toISOString().split("T")[0]
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function monthOffset(baseYear, baseMonth, offset) {
  let m = baseMonth + offset
  let y = baseYear + Math.floor(m / 12)
  m = ((m % 12) + 12) % 12
  return { year: y, month: m }
}

function uid() {
  return randomUUID()
}

// ============================================================
// Bank IDs (match DEFAULT_BANKS in finance-store.ts)
// ============================================================
const BANKS = {
  nubank: "b1",
  bradesco: "b2",
  itau: "b3",
  inter: "b7",
  c6: "b8",
}

// Category IDs (match DEFAULT_CATEGORIES)
const CAT = {
  alimentacao: "c1",
  transporte: "c2",
  moradia: "c3",
  saude: "c4",
  educacao: "c5",
  lazer: "c6",
  compras: "c7",
  servicos: "c8",
  salario: "c9",
  outros: "c10",
}

// ============================================================
// Cards
// ============================================================
const cards = [
  { id: "card-nubank-cc", user_id: "local", bank_id: BANKS.nubank, name: "Conta Nubank", type: "CHECKING_ACCOUNT", last_digits: "8742", credit_limit: null, billing_day: null, created_at: new Date().toISOString() },
  { id: "card-inter-cc", user_id: "local", bank_id: BANKS.inter, name: "Conta Inter", type: "CHECKING_ACCOUNT", last_digits: "3021", credit_limit: null, billing_day: null, created_at: new Date().toISOString() },
  { id: "card-itau-cc", user_id: "local", bank_id: BANKS.itau, name: "Conta Itau Salario", type: "CHECKING_ACCOUNT", last_digits: "5590", credit_limit: null, billing_day: null, created_at: new Date().toISOString() },
  { id: "card-nubank-cred", user_id: "local", bank_id: BANKS.nubank, name: "Nubank Platinum", type: "CREDIT_CARD", last_digits: "4455", credit_limit: 12000, billing_day: 10, created_at: new Date().toISOString() },
  { id: "card-inter-cred", user_id: "local", bank_id: BANKS.inter, name: "Inter Gold", type: "CREDIT_CARD", last_digits: "7823", credit_limit: 8000, billing_day: 15, created_at: new Date().toISOString() },
  { id: "card-itau-cred", user_id: "local", bank_id: BANKS.itau, name: "Itau Click", type: "CREDIT_CARD", last_digits: "1190", credit_limit: 5000, billing_day: 5, created_at: new Date().toISOString() },
  { id: "card-c6-cred", user_id: "local", bank_id: BANKS.c6, name: "C6 Carbon", type: "CREDIT_CARD", last_digits: "6677", credit_limit: 15000, billing_day: 20, created_at: new Date().toISOString() },
]

// ============================================================
// Transactions
// ============================================================
const transactions = []

function tx(overrides) {
  transactions.push({
    id: uid(),
    card_id: "",
    description: "",
    amount: 0,
    type: "EXPENSE",
    category_id: null,
    date: "",
    is_scheduled: false,
    scheduled_date: null,
    is_realized: false,
    is_recurring: false,
    recurring_transaction_id: null,
    notes: null,
    created_at: new Date().toISOString(),
    ...overrides,
  })
}

// ============================================================
// 1. RECORRENTES (24 meses)
// ============================================================
const recurring = [
  { card: "card-nubank-cc", desc: "Salario - Empresa Tech", amount: 8500, type: "INCOME", cat: CAT.salario, dayOfMonth: 5 },
  { card: "card-inter-cc", desc: "Freelance - Consultoria", amount: 3200, type: "INCOME", cat: CAT.salario, dayOfMonth: 15 },
  { card: "card-nubank-cc", desc: "Aluguel Apartamento", amount: 2800, type: "EXPENSE", cat: CAT.moradia, dayOfMonth: 10 },
  { card: "card-nubank-cc", desc: "Condominio", amount: 650, type: "EXPENSE", cat: CAT.moradia, dayOfMonth: 10 },
  { card: "card-inter-cc", desc: "Vivo Fibra 600MB", amount: 149.90, type: "EXPENSE", cat: CAT.servicos, dayOfMonth: 20 },
  { card: "card-nubank-cc", desc: "Conta de Energia", amount: 280, type: "EXPENSE", cat: CAT.moradia, dayOfMonth: 22 },
  { card: "card-nubank-cred", desc: "Smart Fit Mensal", amount: 129.90, type: "EXPENSE", cat: CAT.saude, dayOfMonth: 1 },
  { card: "card-nubank-cred", desc: "Netflix + Spotify", amount: 89.80, type: "EXPENSE", cat: CAT.lazer, dayOfMonth: 5 },
  { card: "card-inter-cc", desc: "Unimed Plano Saude", amount: 520, type: "EXPENSE", cat: CAT.saude, dayOfMonth: 15 },
  { card: "card-itau-cc", desc: "Porto Seguro Auto", amount: 189.90, type: "EXPENSE", cat: CAT.servicos, dayOfMonth: 25 },
]

for (const r of recurring) {
  const recId = uid()
  for (let i = 0; i < 24; i++) {
    const { year, month } = monthOffset(yyyy, mm, i)
    const d = dateStr(year, month, r.dayOfMonth)
    const isFirst = i === 0
    tx({
      card_id: r.card,
      description: r.desc,
      amount: r.amount,
      type: r.type,
      category_id: r.cat,
      date: d,
      is_scheduled: !isFirst,
      is_realized: isFirst,
      is_recurring: true,
      recurring_transaction_id: recId,
    })
  }
}

// ============================================================
// 2. PARCELAS (cartoes de credito)
// ============================================================
const installments = [
  { card: "card-nubank-cred", desc: "iPhone 15 Pro", amount: 749.92, total: 12, startOffset: -2, cat: CAT.compras, day: 8, notes: "Apple Store" },
  { card: "card-inter-cred", desc: "Notebook Dell Inspiron", amount: 879.90, total: 10, startOffset: -1, cat: CAT.compras, day: 12, notes: "Dell Store" },
  { card: "card-nubank-cred", desc: "Alura Anual", amount: 166.50, total: 6, startOffset: 0, cat: CAT.educacao, day: 3, notes: "Plataforma de cursos" },
  { card: "card-itau-cred", desc: "Geladeira Brastemp Frost Free", amount: 437.38, total: 8, startOffset: -3, cat: CAT.compras, day: 17, notes: "Magazine Luiza" },
  { card: "card-c6-cred", desc: "Sofa Retratil 3 Lugares", amount: 599.80, total: 5, startOffset: 0, cat: CAT.compras, day: 9, notes: "Tok&Stok" },
]

for (const inst of installments) {
  for (let i = 0; i < inst.total; i++) {
    const { year, month } = monthOffset(yyyy, mm, inst.startOffset + i)
    const d = dateStr(year, month, inst.day)
    const isPast = inst.startOffset + i < 0
    const isCurrent = inst.startOffset + i === 0
    tx({
      card_id: inst.card,
      description: `${inst.desc} (${i + 1}/${inst.total})`,
      amount: inst.amount,
      type: "EXPENSE",
      category_id: inst.cat,
      date: d,
      is_scheduled: !isPast && !isCurrent,
      is_realized: isPast || isCurrent,
      notes: inst.notes,
    })
  }
}

// ============================================================
// 3. AVULSAS MES ATUAL (realizadas)
// ============================================================
const avulsas = [
  // Nubank CC
  { card: "card-nubank-cc", desc: "Supermercado Extra", amount: 387.42, cat: CAT.alimentacao, day: 2 },
  { card: "card-nubank-cc", desc: "Posto Shell - Gasolina", amount: 250, cat: CAT.transporte, day: 3 },
  { card: "card-nubank-cc", desc: "Farmacia Pacheco", amount: 87.50, cat: CAT.saude, day: 4 },
  { card: "card-nubank-cc", desc: "Uber - Semana", amount: 145.30, cat: CAT.transporte, day: 4 },
  { card: "card-nubank-cc", desc: "PIX - Devolucao amigo", amount: 150, cat: CAT.outros, day: 5, type: "INCOME" },
  { card: "card-nubank-cc", desc: "Padaria Bella Vista", amount: 42.80, cat: CAT.alimentacao, day: 6 },
  { card: "card-nubank-cc", desc: "Estacionamento Shopping", amount: 25, cat: CAT.transporte, day: 7 },
  // Inter CC
  { card: "card-inter-cc", desc: "Mercado Livre - Fones", amount: 189.90, cat: CAT.compras, day: 3 },
  { card: "card-inter-cc", desc: "iFood - Semana", amount: 156.70, cat: CAT.alimentacao, day: 5 },
  { card: "card-inter-cc", desc: "Rendimento CDB", amount: 45.32, cat: CAT.outros, day: 2, type: "INCOME" },
  // Itau CC
  { card: "card-itau-cc", desc: "Transferencia recebida", amount: 500, cat: CAT.outros, day: 7, type: "INCOME" },
  { card: "card-itau-cc", desc: "IPVA 2026 - Cota unica", amount: 1850, cat: CAT.servicos, day: 4 },
  // Nubank Credito
  { card: "card-nubank-cred", desc: "Restaurante Outback", amount: 187.40, cat: CAT.alimentacao, day: 2 },
  { card: "card-nubank-cred", desc: "Amazon - Livro Clean Code", amount: 69.90, cat: CAT.educacao, day: 3 },
  { card: "card-nubank-cred", desc: "Zara - Roupas", amount: 459.80, cat: CAT.compras, day: 6 },
  { card: "card-nubank-cred", desc: "Posto Ipiranga", amount: 220, cat: CAT.transporte, day: 8 },
  // Inter Credito
  { card: "card-inter-cred", desc: "Drogasil - Remedios", amount: 134.50, cat: CAT.saude, day: 4 },
  { card: "card-inter-cred", desc: "Cinema Cinemark", amount: 89, cat: CAT.lazer, day: 7 },
  { card: "card-inter-cred", desc: "Renner - Calcados", amount: 279.90, cat: CAT.compras, day: 9 },
  // Itau Credito
  { card: "card-itau-cred", desc: "Supermercado Pao de Acucar", amount: 412.35, cat: CAT.alimentacao, day: 3 },
  { card: "card-itau-cred", desc: "Pet Shop Cobasi", amount: 156, cat: CAT.outros, day: 5 },
  // C6 Credito
  { card: "card-c6-cred", desc: "Steam - Jogos", amount: 199.90, cat: CAT.lazer, day: 2 },
  { card: "card-c6-cred", desc: "Livraria Cultura", amount: 87.50, cat: CAT.educacao, day: 4 },
  { card: "card-c6-cred", desc: "Decathlon - Equipamento", amount: 345, cat: CAT.lazer, day: 8 },
]

for (const a of avulsas) {
  const d = dateStr(yyyy, mm, a.day)
  tx({
    card_id: a.card,
    description: a.desc,
    amount: a.amount,
    type: a.type || "EXPENSE",
    category_id: a.cat,
    date: d,
    is_scheduled: false,
    is_realized: true,
  })
}

// ============================================================
// 4. AGENDADAS (futuras, mes atual)
// ============================================================
const agendadas = [
  { card: "card-nubank-cc", desc: "Dentista - Consulta", amount: 350, cat: CAT.saude, day: 26 },
  { card: "card-nubank-cc", desc: "Presente aniversario mae", amount: 200, cat: CAT.compras, day: 23 },
  { card: "card-inter-cc", desc: "Mecanico - Revisao carro", amount: 800, cat: CAT.servicos, day: 28 },
  { card: "card-nubank-cred", desc: "Jantar aniversario", amount: 350, cat: CAT.alimentacao, day: 21 },
  { card: "card-c6-cred", desc: "Passagem aerea - Viagem", amount: 1200, cat: CAT.lazer, day: 29 },
]

for (const a of agendadas) {
  const d = dateStr(yyyy, mm, a.day)
  tx({
    card_id: a.card,
    description: a.desc,
    amount: a.amount,
    type: "EXPENSE",
    category_id: a.cat,
    date: d,
    is_scheduled: true,
    scheduled_date: d,
    is_realized: false,
  })
}

// ============================================================
// 5. HISTORICO - MES PASSADO
// ============================================================
const lastMonth = [
  { card: "card-nubank-cc", desc: "Supermercado Carrefour", amount: 523.17, cat: CAT.alimentacao, day: 4 },
  { card: "card-nubank-cc", desc: "Posto BR - Gasolina", amount: 230, cat: CAT.transporte, day: 6 },
  { card: "card-nubank-cc", desc: "Uber - Semana", amount: 98.70, cat: CAT.transporte, day: 9 },
  { card: "card-nubank-cc", desc: "Restaurante Madero", amount: 165.40, cat: CAT.alimentacao, day: 13 },
  { card: "card-nubank-cc", desc: "Farmacia Drogasil", amount: 63.20, cat: CAT.saude, day: 16 },
  { card: "card-inter-cc", desc: "iFood - Semana", amount: 203.40, cat: CAT.alimentacao, day: 7 },
  { card: "card-inter-cc", desc: "Mercado Livre - Cabo USB", amount: 34.90, cat: CAT.compras, day: 11 },
  { card: "card-inter-cc", desc: "Rendimento CDB", amount: 38.76, cat: CAT.outros, day: 2, type: "INCOME" },
  { card: "card-itau-cc", desc: "Oficina mecanica", amount: 450, cat: CAT.servicos, day: 15 },
  { card: "card-nubank-cred", desc: "Shopping Iguatemi - Roupas", amount: 380, cat: CAT.compras, day: 3 },
  { card: "card-nubank-cred", desc: "Mercado Municipal", amount: 95.60, cat: CAT.alimentacao, day: 10 },
  { card: "card-inter-cred", desc: "Posto Shell", amount: 200, cat: CAT.transporte, day: 8 },
  { card: "card-inter-cred", desc: "Burguer King", amount: 67.80, cat: CAT.alimentacao, day: 12 },
  { card: "card-c6-cred", desc: "PlayStation Store", amount: 249.90, cat: CAT.lazer, day: 5 },
  { card: "card-c6-cred", desc: "Uber Eats", amount: 78.50, cat: CAT.alimentacao, day: 14 },
]

for (const a of lastMonth) {
  const { year, month } = monthOffset(yyyy, mm, -1)
  const d = dateStr(year, month, a.day)
  tx({
    card_id: a.card,
    description: a.desc,
    amount: a.amount,
    type: a.type || "EXPENSE",
    category_id: a.cat,
    date: d,
    is_scheduled: false,
    is_realized: true,
  })
}

// ============================================================
// 6. HISTORICO - 2 MESES ATRAS
// ============================================================
const twoMonthsAgo = [
  { card: "card-nubank-cc", desc: "Supermercado Extra", amount: 445.80, cat: CAT.alimentacao, day: 5 },
  { card: "card-nubank-cc", desc: "Posto Ipiranga", amount: 210, cat: CAT.transporte, day: 10 },
  { card: "card-nubank-cc", desc: "Consulta medica", amount: 320, cat: CAT.saude, day: 17 },
  { card: "card-inter-cc", desc: "iFood", amount: 178.30, cat: CAT.alimentacao, day: 8 },
  { card: "card-inter-cc", desc: "Rendimento CDB", amount: 41.18, cat: CAT.outros, day: 2, type: "INCOME" },
  { card: "card-nubank-cred", desc: "Centauro - Tenis corrida", amount: 599.90, cat: CAT.compras, day: 6 },
  { card: "card-nubank-cred", desc: "Churrascaria Fogo de Chao", amount: 289, cat: CAT.alimentacao, day: 19 },
  { card: "card-c6-cred", desc: "Ingresso Rock in Rio", amount: 795, cat: CAT.lazer, day: 4 },
]

for (const a of twoMonthsAgo) {
  const { year, month } = monthOffset(yyyy, mm, -2)
  const d = dateStr(year, month, a.day)
  tx({
    card_id: a.card,
    description: a.desc,
    amount: a.amount,
    type: a.type || "EXPENSE",
    category_id: a.cat,
    date: d,
    is_scheduled: false,
    is_realized: true,
  })
}

// ============================================================
// OUTPUT
// ============================================================
const state = {
  state: {
    cards,
    transactions,
  },
  version: 0,
}

// Gerar o script para o console do browser
const script = `
// My Finance - Seed de Teste
// Cole este script no console do browser e recarregue a pagina
localStorage.setItem("my-finance-data", JSON.stringify(${JSON.stringify(state, null, 0)}));
location.reload();
`

console.log(script)

// Tambem salvar o JSON puro
process.stderr.write(`\n=== SEED GERADO ===\n`)
process.stderr.write(`Cards: ${cards.length}\n`)
process.stderr.write(`Transacoes: ${transactions.length}\n`)
process.stderr.write(`  Recorrentes: ${transactions.filter(t => t.is_recurring).length}\n`)
process.stderr.write(`  Realizadas: ${transactions.filter(t => t.is_realized).length}\n`)
process.stderr.write(`  Agendadas: ${transactions.filter(t => t.is_scheduled && !t.is_recurring).length}\n`)
process.stderr.write(`\nCole o output no console do browser e recarregue.\n`)
