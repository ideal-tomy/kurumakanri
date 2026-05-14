'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/components/toast';
import type { StatutoryFeeRateRow } from '@/lib/supabase/types';

function num(v: string): number {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

export function StatutoryAdminClient({
  rows,
  isAdmin,
}: {
  rows: StatutoryFeeRateRow[];
  isAdmin: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function patchRow(id: string, payload: Record<string, unknown>) {
    setSavingId(id);
    try {
      const res = await fetch('/api/statutory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      });
      const json = (await res.json()) as { error?: unknown };
      if (!res.ok) throw new Error(JSON.stringify(json.error ?? json));
      toast.show('保存しました');
      router.refresh();
    } catch (e) {
      toast.show(`保存失敗: ${(e as Error).message}`);
    } finally {
      setSavingId(null);
    }
  }

  async function createRow(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isAdmin) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    setCreating(true);
    try {
      const res = await fetch('/api/statutory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          effective_from: String(fd.get('effective_from') ?? ''),
          vehicle_class: fd.get('vehicle_class'),
          jibaiseki_24mo_yen: num(String(fd.get('jibaiseki_24mo_yen'))),
          weight_tax_yen_standard: num(String(fd.get('weight_tax_yen_standard'))),
          weight_tax_yen_eco: num(String(fd.get('weight_tax_yen_eco'))),
          prepaid_inspection_yen: num(String(fd.get('prepaid_inspection_yen') ?? '2200')),
          lane_stamp_yen: num(String(fd.get('lane_stamp_yen') ?? '2300')),
          document_fee_yen: num(String(fd.get('document_fee_yen') ?? '770')),
          notes: (fd.get('notes') as string) || null,
        }),
      });
      const json = (await res.json()) as { error?: unknown };
      if (!res.ok) throw new Error(JSON.stringify(json.error ?? json));
      toast.show('新しい適用行を追加しました');
      form.reset();
      router.refresh();
    } catch (e) {
      toast.show(`追加失敗: ${(e as Error).message}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      {!isAdmin ? (
        <p className="badge badge-warn" style={{ display: 'block', padding: 10, marginBottom: 12 }}>
          法定費用マスタの編集は ADMIN ロールのみ可能です（閲覧のみ）。
        </p>
      ) : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>適用開始</th>
              <th>区分</th>
              <th>自賠責24ヶ月</th>
              <th>重量税(標準)</th>
              <th>重量税(エコ)</th>
              <th>印紙等</th>
              <th>備考</th>
              {isAdmin ? <th /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <RowEdit
                key={r.id}
                row={r}
                isAdmin={isAdmin}
                saving={savingId === r.id}
                onSave={(payload) => void patchRow(r.id, payload)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {isAdmin ? (
        <section className="panel" style={{ marginTop: 20, padding: 16 }}>
          <h2 className="page-title" style={{ fontSize: 16 }}>
            新しい適用開始日を追加
          </h2>
          <form className="form-grid" onSubmit={(e) => void createRow(e)} style={{ marginTop: 12 }}>
            <div className="form-row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <div className="form-field">
                <label className="form-label">effective_from</label>
                <input className="input" type="date" name="effective_from" required />
              </div>
              <div className="form-field">
                <label className="form-label">vehicle_class</label>
                <select className="select" name="vehicle_class" required>
                  <option value="LIGHT">LIGHT</option>
                  <option value="STANDARD">STANDARD</option>
                </select>
              </div>
            </div>
            <div className="form-row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <div className="form-field">
                <label className="form-label">自賠責24ヶ月</label>
                <input className="input" name="jibaiseki_24mo_yen" type="number" defaultValue={17290} required />
              </div>
              <div className="form-field">
                <label className="form-label">重量税(標準)</label>
                <input className="input" name="weight_tax_yen_standard" type="number" defaultValue={8800} required />
              </div>
              <div className="form-field">
                <label className="form-label">重量税(エコ)</label>
                <input className="input" name="weight_tax_yen_eco" type="number" defaultValue={8800} required />
              </div>
              <div className="form-field">
                <label className="form-label">印紙(予納)</label>
                <input className="input" name="prepaid_inspection_yen" type="number" defaultValue={2200} />
              </div>
              <div className="form-field">
                <label className="form-label">レーン印紙</label>
                <input className="input" name="lane_stamp_yen" type="number" defaultValue={2300} />
              </div>
              <div className="form-field">
                <label className="form-label">証紙</label>
                <input className="input" name="document_fee_yen" type="number" defaultValue={770} />
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">備考</label>
              <input className="input" name="notes" />
            </div>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? '追加中…' : '追加'}
            </button>
          </form>
        </section>
      ) : null}
    </>
  );
}

function RowEdit({
  row,
  isAdmin,
  saving,
  onSave,
}: {
  row: StatutoryFeeRateRow;
  isAdmin: boolean;
  saving: boolean;
  onSave: (p: Record<string, unknown>) => void;
}) {
  const [jib, setJib] = useState(String(row.jibaiseki_24mo_yen));
  const [wStd, setWStd] = useState(String(row.weight_tax_yen_standard));
  const [wEco, setWEco] = useState(String(row.weight_tax_yen_eco));
  const [pre, setPre] = useState(String(row.prepaid_inspection_yen));
  const [lane, setLane] = useState(String(row.lane_stamp_yen));
  const [doc, setDoc] = useState(String(row.document_fee_yen));
  const [notes, setNotes] = useState(row.notes ?? '');

  return (
    <tr>
      <td>{row.effective_from}</td>
      <td>{row.vehicle_class}</td>
      <td>
        {isAdmin ? (
          <input className="input" style={{ width: 100 }} value={jib} onChange={(e) => setJib(e.target.value)} />
        ) : (
          row.jibaiseki_24mo_yen
        )}
      </td>
      <td>
        {isAdmin ? (
          <input className="input" style={{ width: 100 }} value={wStd} onChange={(e) => setWStd(e.target.value)} />
        ) : (
          row.weight_tax_yen_standard
        )}
      </td>
      <td>
        {isAdmin ? (
          <input className="input" style={{ width: 100 }} value={wEco} onChange={(e) => setWEco(e.target.value)} />
        ) : (
          row.weight_tax_yen_eco
        )}
      </td>
      <td className="cust-meta" style={{ fontSize: 12 }}>
        印紙 {isAdmin ? <input className="input" style={{ width: 72 }} value={pre} onChange={(e) => setPre(e.target.value)} /> : pre} / レーン{' '}
        {isAdmin ? <input className="input" style={{ width: 72 }} value={lane} onChange={(e) => setLane(e.target.value)} /> : lane} / 証紙{' '}
        {isAdmin ? <input className="input" style={{ width: 72 }} value={doc} onChange={(e) => setDoc(e.target.value)} /> : doc}
      </td>
      <td>
        {isAdmin ? (
          <input className="input" style={{ minWidth: 160 }} value={notes} onChange={(e) => setNotes(e.target.value)} />
        ) : (
          notes || '—'
        )}
      </td>
      {isAdmin ? (
        <td>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={saving}
            onClick={() =>
              onSave({
                jibaiseki_24mo_yen: num(jib),
                weight_tax_yen_standard: num(wStd),
                weight_tax_yen_eco: num(wEco),
                prepaid_inspection_yen: num(pre),
                lane_stamp_yen: num(lane),
                document_fee_yen: num(doc),
                notes: notes.trim() || null,
              })
            }
          >
            {saving ? '…' : '保存'}
          </button>
        </td>
      ) : null}
    </tr>
  );
}
