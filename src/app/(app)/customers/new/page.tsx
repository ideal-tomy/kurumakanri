import { createCustomerAction } from '../actions';

export const dynamic = 'force-dynamic';

interface NewCustomerPageProps {
  searchParams?: { line_user_id?: string };
}

export default function NewCustomerPage({ searchParams }: NewCustomerPageProps) {
  const initialLineUserId = searchParams?.line_user_id ?? '';
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">顧客を追加</h1>
          <div className="page-sub">基本情報と車両情報をまとめて登録</div>
        </div>
      </div>

      <section className="panel" style={{ padding: 24 }}>
        <form action={createCustomerAction} className="form-grid">
          <h2 className="modal-section-title">顧客情報</h2>
          {initialLineUserId && (
            <div className="cust-meta" style={{ marginBottom: 8 }}>
              LINE userId「{initialLineUserId}」を紐付けて登録します
            </div>
          )}
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">氏名 *</label>
              <input className="input" name="name" required />
            </div>
            <div className="form-field">
              <label className="form-label">フリガナ</label>
              <input className="input" name="furigana" />
            </div>
            <div className="form-field">
              <label className="form-label">電話番号</label>
              <input className="input" name="phone" />
            </div>
            <div className="form-field">
              <label className="form-label">メールアドレス</label>
              <input className="input" type="email" name="email" />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">LINE userId</label>
              <input
                className="input"
                name="line_user_id"
                defaultValue={initialLineUserId}
                placeholder="U で始まる ID（任意）"
              />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">備考</label>
            <textarea className="textarea" name="notes" />
          </div>

          <label className="form-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" name="with_vehicle" defaultChecked />
            <span>車両情報も同時に登録</span>
          </label>

          <h2 className="modal-section-title">車両情報</h2>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">メーカー *</label>
              <input className="input" name="maker" />
            </div>
            <div className="form-field">
              <label className="form-label">車種 *</label>
              <input className="input" name="model" />
            </div>
            <div className="form-field">
              <label className="form-label">ナンバー *</label>
              <input className="input" name="plate" placeholder="横浜 300 あ 12-34" />
            </div>
            <div className="form-field">
              <label className="form-label">車台番号 (VIN)</label>
              <input className="input" name="vin" />
            </div>
            <div className="form-field">
              <label className="form-label">車検満了日 *</label>
              <input className="input" type="date" name="inspection_expire_date" />
            </div>
            <div className="form-field">
              <label className="form-label">登録時走行距離 (km)</label>
              <input className="input" type="number" name="initial_mileage" min={0} defaultValue={0} />
            </div>
            <div className="form-field">
              <label className="form-label">月平均走行距離 (km)</label>
              <input className="input" type="number" name="monthly_avg_km" min={0} placeholder="例: 800" />
            </div>
            <div className="form-field">
              <label className="form-label">前回オイル交換時走行距離 (km)</label>
              <input className="input" type="number" name="last_oil_change_mileage" min={0} />
            </div>
            <div className="form-field">
              <label className="form-label">前回オイル交換日</label>
              <input className="input" type="date" name="last_oil_change_at" />
            </div>
            <div className="form-field">
              <label className="form-label">オイル交換目安 (km)</label>
              <input className="input" type="number" name="oil_interval_km" min={1000} defaultValue={4000} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" type="submit">
              登録する
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
