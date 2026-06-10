'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/badge';
import { formatDateTime } from '@/lib/format';
import { useToast } from '@/components/toast';
import { renderTemplate } from '@/lib/template';
import type { TemplateVersionRow } from '@/lib/supabase/types';

const PREVIEW_VARS: Record<string, string> = {
  name: '山田太郎',
  carName: 'トヨタ プリウス',
  vehicleName: 'トヨタ プリウス',
  plate: '横浜300あ12-34',
  expireDate: '2026-12-31',
  daysLeft: '45',
  mileage: '45,000',
  nextOilTargetKm: '49,000',
  oilIntervalKm: '4,000',
  portalUrl: 'https://example.com/p/demo',
  quoteUrl: 'https://example.com/q/demo',
  bookingUrl: 'https://example.com/p/demo#booking',
  unsubscribeUrl: 'https://example.com/u/demo',
  maintenanceInfoUrl: 'https://example.com/info/maintenance',
  oilInfoUrl: 'https://example.com/info/oil',
  legalFeesTotal: '¥120,000',
  legalFeesBreakdown: '重量税…',
  grandTotal: '¥350,000',
  validUntil: '2026/06/30',
};

export function TemplatesEditor({ rows }: { rows: TemplateVersionRow[] }) {
  const toast = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState<TemplateVersionRow | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const previewRendered = useMemo(() => {
    if (!body.trim()) return '';
    try {
      return renderTemplate(body, PREVIEW_VARS);
    } catch {
      return '(プレビュー生成エラー)';
    }
  }, [body]);

  function openEdit(r: TemplateVersionRow) {
    setEditing(r);
    setSubject(r.subject ?? '');
    setBody(r.content);
  }

  async function publish() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_key: editing.template_key,
          channel: editing.channel,
          subject: editing.channel === 'MAIL' ? subject : null,
          body,
        }),
      });
      const json = (await res.json()) as { error?: unknown; version?: number };
      if (!res.ok) throw new Error(JSON.stringify(json.error ?? json));
      toast.show(`新バージョン v${json.version ?? '?'} を発行しました`);
      setEditing(null);
      router.refresh();
    } catch (e) {
      toast.show(`発行失敗: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>キー</th>
              <th>チャネル</th>
              <th>件名</th>
              <th>状態</th>
              <th>更新</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty">テンプレートがありません</div>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.template_key}</td>
                  <td>
                    <Badge variant={r.channel === 'LINE' ? 'info' : 'neutral'}>{r.channel}</Badge>
                  </td>
                  <td>{r.subject ?? '-'}</td>
                  <td>
                    <Badge variant={r.active ? 'success' : 'neutral'}>
                      {r.active ? `v${r.version} 有効` : `v${r.version}`}
                    </Badge>
                  </td>
                  <td>{formatDateTime(r.created_at)}</td>
                  <td>
                    <button type="button" className="btn btn-sm" onClick={() => openEdit(r)}>
                      編集
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div
          role="presentation"
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
          onClick={() => !saving && setEditing(null)}
        >
          <div
            role="dialog"
            aria-modal
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 720,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: 20,
              borderRadius: 12,
              background: 'var(--surface-1)',
            }}
          >
            <h2 className="page-title" style={{ fontSize: 18 }}>
              テンプレ編集: {editing.template_key} / {editing.channel}
            </h2>
            {editing.channel === 'MAIL' ? (
              <div className="form-field" style={{ marginTop: 12 }}>
                <label className="form-label">件名</label>
                <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
            ) : null}
            <div className="form-field" style={{ marginTop: 12 }}>
              <label className="form-label">本文</label>
              <textarea className="textarea" rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div className="form-field" style={{ marginTop: 12 }}>
              <label className="form-label">プレビュー（ダミー値）</label>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  background: 'var(--surface-2)',
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 13,
                  maxHeight: 160,
                  overflow: 'auto',
                }}
              >
                {previewRendered}
              </pre>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn" disabled={saving} onClick={() => setEditing(null)}>
                閉じる
              </button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void publish()}>
                {saving ? '発行中…' : '新バージョンを発行'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
