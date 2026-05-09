'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function QuoteStaffActions(props: {
  quoteId: string;
  vehicleId: string;
  /** 署名付き URL。未設定なら環境変数不足 */
  shareUrl: string | null;
  lineNotifyEligible: boolean;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busyCopy, setBusyCopy] = useState(false);
  const [busyLine, setBusyLine] = useState(false);
  const [busyClone, setBusyClone] = useState(false);

  async function copyUrl() {
    if (!props.shareUrl) return;
    setBusyCopy(true);
    setMsg(null);
    try {
      await navigator.clipboard.writeText(props.shareUrl);
      setMsg('URL をクリップボードにコピーしました。');
    } catch {
      setMsg('コピーに失敗しました。リンクを長押しで選択してください。');
    } finally {
      setBusyCopy(false);
      setTimeout(() => setMsg(null), 3200);
    }
  }

  async function notifyLine() {
    setBusyLine(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/quotes/${props.quoteId}/notify-line`, { method: 'POST' });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg(json.error ?? `LINE送信に失敗しました（${res.status}）`);
        return;
      }
      setMsg('LINE で見積リンクを送信しました。');
      setTimeout(() => setMsg(null), 3800);
    } finally {
      setBusyLine(false);
    }
  }

  async function cloneQuote() {
    if (!confirm('この見積と同じ明細で新規発行しますか？')) return;
    setBusyClone(true);
    setMsg(null);
    try {
      const res = await fetch('/api/quotes/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_quote_id: props.quoteId,
          vehicle_id: props.vehicleId,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; id?: string };
      if (!res.ok) {
        setMsg(json.error ?? `複製に失敗しました（${res.status}）`);
        return;
      }
      router.refresh();
      setMsg('新しい見積を発行しました。');
      setTimeout(() => setMsg(null), 3800);
    } finally {
      setBusyClone(false);
    }
  }

  return (
    <div className="quote-staff-actions" style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {props.shareUrl ? (
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => copyUrl()}
          disabled={busyCopy}
        >
          {busyCopy ? 'コピー中…' : '公開URLをコピー'}
        </button>
      ) : (
        <span className="cust-meta">公開URLは QUOTE_SHARE_SECRET 設定後に利用できます。</span>
      )}
      <button
        type="button"
        className="btn btn-sm"
        style={{ background: 'var(--line-green-soft)', borderColor: 'var(--line-green)' }}
        disabled={busyLine || !props.lineNotifyEligible || !props.shareUrl}
        onClick={() => notifyLine()}
      >
        {busyLine ? '送信中…' : 'LINEで送信'}
      </button>
      <button type="button" className="btn btn-sm btn-done" disabled={busyClone} onClick={() => cloneQuote()}>
        {busyClone ? '処理中…' : '複製発行'}
      </button>
      {!props.lineNotifyEligible ? (
        <span className="cust-meta">
          （LINE送信: 顧客に LINE userId＋送信同意がある場合のみ）
        </span>
      ) : null}
      {msg ? (
        <div className="cust-meta" style={{ width: '100%', color: 'var(--accent)', fontWeight: 500 }}>
          {msg}
        </div>
      ) : null}
      {props.shareUrl ? (
        <div style={{ fontSize: 11, opacity: 0.75, width: '100%', wordBreak: 'break-all' }}>
          <code>{props.shareUrl}</code>
        </div>
      ) : null}
    </div>
  );
}
