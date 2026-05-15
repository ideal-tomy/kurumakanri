'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/toast';

export function GenerateButton({
  vehicleId,
  confirmIfDirty = false,
}: {
  vehicleId: string;
  confirmIfDirty?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (confirmIfDirty) {
      const ok = window.confirm('未保存の変更があります。自動見積を生成すると上書きされる可能性があります。続行しますか？');
      if (!ok) return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/quotes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_id: vehicleId, include_oil: true }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || '生成に失敗');
      }
      toast.show('見積を生成しました');
      router.refresh();
    } catch (e) {
      toast.show(`生成失敗: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn btn-primary" onClick={() => void generate()} disabled={busy}>
      {busy ? '生成中…' : '+ 自動見積を生成'}
    </button>
  );
}
