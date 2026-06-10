export function formatYen(amount: number | null | undefined): string {
  if (amount == null) return '-';
  return `¥${amount.toLocaleString('ja-JP')}`;
}

export function formatKm(km: number | null | undefined): string {
  if (km == null) return '-';
  return `${km.toLocaleString('ja-JP')} km`;
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return '-';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** 顧客ポータルのアラート用（例: 2026年5月30日） */
export function formatDateLong(d: string | null | undefined): string {
  if (!d) return '-';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(d: string | null | undefined): string {
  if (!d) return '-';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function priorityLabel(daysLeft: number | null | undefined): string {
  if (daysLeft == null) return '-';
  if (daysLeft < 0) return `期限切れ (${Math.abs(daysLeft)}日経過)`;
  if (daysLeft === 0) return '本日が満了日';
  return `あと${daysLeft}日`;
}
