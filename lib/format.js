export function formatTRY(value) {
  const n = Number(value || 0)
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 }).format(n)
}

export function formatNumber(value) {
  const n = Number(value || 0)
  return new Intl.NumberFormat('tr-TR').format(n)
}

export function formatDate(value) {
  if (!value) return '-'
  const d = new Date(value)
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
