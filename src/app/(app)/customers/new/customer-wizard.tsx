'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { createCustomerAction } from '../actions';

interface FormState {
  // Step 1
  name: string;
  phone: string;
  plate: string;
  inspection_expire_date: string;
  // Step 2
  maker: string;
  model: string;
  initial_mileage: string;
  last_oil_change_at: string;
  last_oil_change_mileage: string;
  // Step 3
  furigana: string;
  email: string;
  line_user_id: string;
  notes: string;
}

interface CustomerWizardProps {
  initialLineUserId?: string;
}

const STEP_LABELS = ['基本', '車両', 'その他'] as const;

export function CustomerWizard({ initialLineUserId = '' }: CustomerWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string | null>(null);
  const [dupHint, setDupHint] = useState<{ id: string; reason: 'phone' | 'vehicle' } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    plate: '',
    inspection_expire_date: '',
    maker: '',
    model: '',
    initial_mileage: '0',
    last_oil_change_at: '',
    last_oil_change_mileage: '',
    furigana: '',
    email: '',
    line_user_id: initialLineUserId,
    notes: '',
  });

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function buildFormData(includeForce: boolean): FormData {
    const fd = new FormData();
    fd.set('name', form.name.trim());
    fd.set('furigana', form.furigana.trim());
    fd.set('phone', form.phone.trim());
    fd.set('email', form.email.trim());
    fd.set('notes', form.notes.trim());
    fd.set('line_user_id', form.line_user_id.trim());

    const wantsVehicle = Boolean(form.plate.trim() || form.inspection_expire_date);
    if (wantsVehicle) {
      fd.set('with_vehicle', 'on');
      fd.set('maker', form.maker.trim());
      fd.set('model', form.model.trim());
      fd.set('plate', form.plate.trim());
      fd.set('inspection_expire_date', form.inspection_expire_date);
      fd.set('initial_mileage', form.initial_mileage || '0');
      fd.set('last_oil_change_mileage', form.last_oil_change_mileage);
      fd.set('last_oil_change_at', form.last_oil_change_at);
      fd.set('oil_interval_km', '4000');
    }
    if (includeForce) fd.set('force', 'on');
    return fd;
  }

  function submitWithForce(force: boolean) {
    setError(null);
    if (force) setDupHint(null);
    if (!form.name.trim()) {
      setError('氏名は必須です');
      setStep(1);
      return;
    }
    const fd = buildFormData(force);
    startTransition(async () => {
      try {
        await createCustomerAction(fd);
        setDupHint(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        const m = /^DUPLICATE_CUSTOMER:([0-9a-f-]{36}):(phone|vehicle)$/i.exec(msg);
        if (m) {
          setDupHint({ id: m[1], reason: m[2] as 'phone' | 'vehicle' });
          return;
        }
        setError(msg || '登録に失敗しました');
      }
    });
  }

  function handleSubmit() {
    submitWithForce(false);
  }

  function next() {
    setError(null);
    if (step === 1) {
      if (!form.name.trim()) {
        setError('氏名は必須です');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
    }
  }
  function back() {
    setError(null);
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  }

  return (
    <section className="panel" style={{ padding: 24 }}>
      {/* ステップインジケータ */}
      <div className="step-indicator">
        {STEP_LABELS.map((label, i) => {
          const idx = (i + 1) as 1 | 2 | 3;
          const status = idx === step ? 'active' : idx < step ? 'done' : '';
          return (
            <div key={label} className={`step-indicator-item ${status}`}>
              <div className="step-indicator-bar" />
              <div className="step-indicator-label">
                {idx}/3 {label}
              </div>
            </div>
          );
        })}
      </div>

      {dupHint && (
        <div
          className="badge badge-warn"
          style={{ display: 'block', padding: 12, marginBottom: 12, lineHeight: 1.6 }}
        >
          同じ{dupHint.reason === 'phone' ? '電話番号' : '車両（メーカー・車種・ナンバー）'}の顧客が既にいます（ID:{' '}
          <code>{dupHint.id}</code>）。
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link className="btn btn-sm btn-primary" href={`/customers/${dupHint.id}`}>
              同一として開く
            </Link>
            <button type="button" className="btn btn-sm" disabled={isPending} onClick={() => submitWithForce(true)}>
              別人として続行（強制登録）
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="badge badge-danger" style={{ display: 'block', padding: 10, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="form-grid">
          <div className="wizard-section-hint">
            必須は氏名のみ。電話・ナンバー・車検満了日まで入力すれば、ここで「保存して終了」できます。
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">氏名 *</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => patch('name', e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label">電話番号</label>
              <input
                className="input"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => patch('phone', e.target.value)}
                placeholder="090-0000-0000"
              />
            </div>
            <div className="form-field">
              <label className="form-label">ナンバー</label>
              <input
                className="input"
                value={form.plate}
                onChange={(e) => patch('plate', e.target.value)}
                placeholder="横浜 300 あ 12-34"
              />
            </div>
            <div className="form-field">
              <label className="form-label">車検満了日</label>
              <input
                className="input"
                type="date"
                value={form.inspection_expire_date}
                onChange={(e) => patch('inspection_expire_date', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="form-grid">
          <div className="wizard-section-hint">
            任意。車種を入れておくと一覧で識別しやすくなります。
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">メーカー</label>
              <input className="input" value={form.maker} onChange={(e) => patch('maker', e.target.value)} placeholder="トヨタ" />
            </div>
            <div className="form-field">
              <label className="form-label">車種</label>
              <input className="input" value={form.model} onChange={(e) => patch('model', e.target.value)} placeholder="プリウス" />
            </div>
            <div className="form-field">
              <label className="form-label">登録時走行距離 (km)</label>
              <input
                className="input"
                type="number"
                min={0}
                value={form.initial_mileage}
                onChange={(e) => patch('initial_mileage', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">前回オイル交換日</label>
              <input
                className="input"
                type="date"
                value={form.last_oil_change_at}
                onChange={(e) => patch('last_oil_change_at', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">前回オイル交換時走行距離 (km)</label>
              <input
                className="input"
                type="number"
                min={0}
                value={form.last_oil_change_mileage}
                onChange={(e) => patch('last_oil_change_mileage', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="form-grid">
          <div className="wizard-section-hint">
            任意。LINE userId は「LINE未マッチ」一覧から自動入力される場合もあります。
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">フリガナ</label>
              <input className="input" value={form.furigana} onChange={(e) => patch('furigana', e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">メールアドレス</label>
              <input className="input" type="email" value={form.email} onChange={(e) => patch('email', e.target.value)} />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">LINE userId</label>
              <input
                className="input"
                value={form.line_user_id}
                onChange={(e) => patch('line_user_id', e.target.value)}
                placeholder="U で始まる ID（任意）"
              />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">備考</label>
              <textarea
                className="textarea"
                value={form.notes}
                onChange={(e) => patch('notes', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>
      )}

      <div className="wizard-actions">
        <div>
          {step > 1 && (
            <button type="button" className="btn" onClick={back} disabled={isPending}>
              戻る
            </button>
          )}
        </div>
        <div className="right">
          {step < 3 && (
            <button
              type="button"
              className="btn"
              onClick={handleSubmit}
              disabled={isPending}
              title="ここまでの内容で登録します"
            >
              {isPending ? '登録中...' : '保存して終了'}
            </button>
          )}
          {step < 3 ? (
            <button type="button" className="btn btn-primary" onClick={next} disabled={isPending}>
              次へ
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending ? '登録中...' : '登録する'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
