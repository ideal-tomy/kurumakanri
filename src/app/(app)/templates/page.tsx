import { getServerSupabase } from '@/lib/supabase/server';
import { Badge } from '@/components/badge';
import { formatDateTime } from '@/lib/format';
import type { TemplateVersionRow } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from('template_versions')
    .select('*')
    .order('template_key', { ascending: true })
    .order('channel', { ascending: true })
    .order('version', { ascending: false });
  const rows = (data ?? []) as TemplateVersionRow[];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">テンプレート</h1>
          <div className="page-sub">通知文面のテンプレ一覧（編集はテキストファイル直接運用想定）</div>
        </div>
      </div>

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>キー</th>
                <th>チャネル</th>
                <th>件名</th>
                <th>状態</th>
                <th>更新</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5}>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-3)' }}>
          差し込み変数: <code>{'{{name}}'}</code> <code>{'{{carName}}'}</code>{' '}
          <code>{'{{plate}}'}</code> <code>{'{{expireDate}}'}</code>{' '}
          <code>{'{{daysLeft}}'}</code> <code>{'{{mileage}}'}</code>{' '}
          <code>{'{{nextOilTargetKm}}'}</code> <code>{'{{quoteUrl}}'}</code>{' '}
          <code>{'{{bookingUrl}}'}</code> <code>{'{{unsubscribeUrl}}'}</code>
        </div>
      </section>
    </>
  );
}
