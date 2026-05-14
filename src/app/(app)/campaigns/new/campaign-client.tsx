'use client';

import { useCallback, useMemo, useState } from 'react';
import { useToast } from '@/components/toast';
import type { CustomerOverviewRow } from '@/lib/supabase/types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseIdPaste(raw: string): string[] {
  const parts = raw
    .split(/[\s,;\n\t]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(parts.filter((p) => UUID_RE.test(p)))];
}

export function CampaignClient({ rows }: { rows: CustomerOverviewRow[] }) {
  const toast = useToast();
  const lineLinkedIds = useMemo(
    () => rows.filter((r) => r.line_user_id).map((r) => r.customer_id),
    [rows],
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set(lineLinkedIds));
  const [q, setQ] = useState('');
  const [paste, setPaste] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;
    return rows.filter((r) => {
      const blob = `${r.name ?? ''} ${r.plate ?? ''} ${r.maker ?? ''} ${r.model ?? ''}`.toLowerCase();
      return blob.includes(qq);
    });
  }, [rows, q]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of filtered) {
        if (r.line_user_id) next.add(r.customer_id);
      }
      return next;
    });
  }, [filtered]);

  const clearFiltered = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of filtered) {
        next.delete(r.customer_id);
      }
      return next;
    });
  }, [filtered]);

  const applyPaste = useCallback(() => {
    const ids = parseIdPaste(paste);
    if (ids.length === 0) {
      toast.show('UUID が見つかりませんでした');
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (rows.some((r) => r.customer_id === id && r.line_user_id)) next.add(id);
      }
      return next;
    });
    toast.show(`${ids.length} 件の ID を処理しました（LINE 連携済みのみ選択に追加）`);
  }, [paste, rows, toast]);

  async function send() {
    const ids = [...selected];
    if (ids.length === 0) {
      toast.show('送信先を1名以上選んでください');
      return;
    }
    if (!title.trim() || !body.trim()) {
      toast.show('タイトルと本文を入力してください');
      return;
    }
    if (!window.confirm(`LINE 連携済み ${ids.length} 名へ一斉送信します。LINE の月間配信枠を消費します。よろしいですか？`)) {
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          image_url: imageUrl.trim() || null,
          customer_ids: ids,
        }),
      });
      const json = (await res.json()) as {
        error?: unknown;
        success?: number;
        failed?: number;
        skipped_no_line?: number;
        skipped_consent?: number;
      };
      if (!res.ok) throw new Error(JSON.stringify(json.error ?? json));
      toast.show(
        `送信完了: 成功 ${json.success ?? 0} / 失敗 ${json.failed ?? 0}（未連携スキップ ${json.skipped_no_line ?? 0} / 同意外 ${json.skipped_consent ?? 0}）`,
      );
      setPreviewOpen(false);
    } catch (e) {
      toast.show(`送信エラー: ${(e as Error).message}`);
    } finally {
      setSending(false);
    }
  }

  const selectedLineCount = useMemo(
    () => [...selected].filter((id) => rows.find((r) => r.customer_id === id)?.line_user_id).length,
    [selected, rows],
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">キャンペーン送信</h1>
          <div className="page-sub">LINE 連携済み・LINE 配信同意のある顧客へ同一文面を multicast で送ります（500 名ずつ分割）</div>
        </div>
      </div>

      <section className="panel" style={{ padding: 16, marginBottom: 16 }}>
        <div className="form-field">
          <label className="form-label">タイトル（先頭に【】付きで送ります）</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="春の点検キャンペーン" />
        </div>
        <div className="form-field">
          <label className="form-label">本文</label>
          <textarea className="textarea" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <p className="cust-meta" style={{ marginBottom: 12 }}>
          <code>{'{{name}}'}</code> などの差し込みは multicast では使えません（全員同一文面）。個別名入りが必要な場合は通常の通知フローを利用してください。
        </p>
        <div className="form-field">
          <label className="form-label">画像 URL（任意・https）</label>
          <input
            className="input"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/banner.png"
          />
        </div>
      </section>

      <section className="panel" style={{ padding: 16 }}>
        <div className="page-actions" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <input
            className="input"
            style={{ maxWidth: 260 }}
            placeholder="氏名・ナンバー・メーカーで絞込"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="button" className="btn btn-sm" onClick={selectAllFiltered}>
            表示中を全選択（LINE可のみ）
          </button>
          <button type="button" className="btn btn-sm" onClick={clearFiltered}>
            表示中の選択解除
          </button>
          <span className="cust-meta">
            選択 {selectedLineCount} 名 / LINE 連携 {lineLinkedIds.length} 名
          </span>
        </div>
        <div className="form-row" style={{ marginBottom: 12, alignItems: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
          <div className="form-field" style={{ flex: 1, minWidth: 220 }}>
            <label className="form-label">顧客 ID を CSV / 改行で貼付</label>
            <textarea className="textarea" rows={2} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="uuid, uuid, ..." />
          </div>
          <button type="button" className="btn" onClick={applyPaste}>
            貼付を反映
          </button>
        </div>

        <div className="table-wrap" style={{ maxHeight: 420, overflow: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 44 }} />
                <th>氏名</th>
                <th>車両</th>
                <th>LINE</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const hasLine = Boolean(r.line_user_id);
                const checked = selected.has(r.customer_id);
                return (
                  <tr key={`${r.customer_id}-${r.vehicle_id ?? 'x'}`}>
                    <td>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!hasLine}
                        onChange={() => toggle(r.customer_id)}
                        title={hasLine ? '' : 'LINE 未連携'}
                      />
                    </td>
                    <td>{r.name}</td>
                    <td>
                      {r.maker} {r.model} <span className="plate">{r.plate}</span>
                    </td>
                    <td>{hasLine ? '可' : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={() => setPreviewOpen(true)} disabled={sending}>
            プレビュー・送信確認
          </button>
        </div>
      </section>

      {previewOpen ? (
        <div
          role="presentation"
          onClick={() => !sending && setPreviewOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            role="dialog"
            aria-modal
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 520,
              width: '100%',
              padding: 20,
              borderRadius: 12,
              background: 'var(--surface-1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <h2 className="page-title" style={{ fontSize: 18 }}>
              送信確認
            </h2>
            <p className="cust-meta" style={{ marginTop: 8 }}>
              対象 <strong>{selectedLineCount}</strong> 名へ送信します。
            </p>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                background: 'var(--surface-2)',
                padding: 12,
                borderRadius: 8,
                fontSize: 13,
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              {`【${title}】\n${body}`}
            </pre>
            {imageUrl.trim() ? (
              <p className="cust-meta" style={{ marginTop: 8 }}>
                画像: {imageUrl.trim()}
              </p>
            ) : null}
            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn" disabled={sending} onClick={() => setPreviewOpen(false)}>
                キャンセル
              </button>
              <button type="button" className="btn btn-primary" disabled={sending} onClick={() => void send()}>
                {sending ? '送信中…' : '送信する'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
