import { redirect } from 'next/navigation';

/** 旧URL互換: 配信履歴は /history へ */
export default function LogsRedirectPage({
  searchParams,
}: {
  searchParams: { status?: string; channel?: string; q?: string };
}) {
  const sp = new URLSearchParams();
  if (searchParams.status) sp.set('status', searchParams.status);
  if (searchParams.channel) sp.set('channel', searchParams.channel);
  if (searchParams.q) sp.set('q', searchParams.q);
  const q = sp.toString();
  redirect(q ? `/history?${q}` : '/history');
}
