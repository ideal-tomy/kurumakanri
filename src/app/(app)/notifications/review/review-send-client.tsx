'use client';

import { Fragment, Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { NextActions } from '@/components/next-actions';
import { PageBack } from '@/components/page-back';
import { formatDate, formatYen } from '@/lib/format';
import type { SendReviewSessionPayload } from '@/lib/notifications/send-review-session';
import {
  SEND_REVIEW_SESSION_KEY,
  canonicalReviewSearchFromLocationSearch,
  canonicalReviewSearchString,
  coercePresetNotificationRule,
  parseChannelQueryParam,
  parseCustomersQueryParam,
  parseRuleQueryParam,
} from '@/lib/notifications/send-review-session';
import { useToast } from '@/components/toast';

type QuoteLinePreview = {
  label: string;
  quantity: number;
  unit_price: number;
  amount: number;
};

type ReviewItem = {
  customer_id: string;
  name: string | null;
  vehicle_id: string | null;
  plate: string | null;
  rule_label: string;
  line_preview: string | null;
  mail_subject: string | null;
  mail_body: string | null;
  quote_link_preview: string | null;
  quote: {
    id: string;
    quote_no: string | null;
    grand_total: number;
    issued_at: string | null;
    legal_count: number;
    service_count: number;
    valid_until: string | null;
    notes: string | null;
    legal_lines: QuoteLinePreview[];
    service_lines: QuoteLinePreview[];
    tax_summary: {
      non_taxable_subtotal: number;
      taxable_tax_included: number;
      taxable_subtotal_ex_tax: number;
      tax_amount_10: number;
      grand_total: number;
    };
  } | null;
  warnings: string[];
};

function ReviewSendClientInner() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryKey = searchParams.toString();

  const [bootstrapped, setBootstrapped] = useState(false);
  const [urlInvalid, setUrlInvalid] = useState(false);
  const [rule, setRule] = useState<SendReviewSessionPayload['rule']>('shaken_180days');
  const [channel, setChannel] = useState<'LINE' | 'MAIL' | 'BOTH'>('LINE');
  const [customerIds, setCustomerIds] = useState<string[]>([]);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [ensuring, setEnsuring] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const parsed = parseCustomersQueryParam(searchParams);
    if (parsed.kind === 'ok') {
      setCustomerIds(parsed.ids);
      setRule(parseRuleQueryParam(searchParams.get('rule')));
      setChannel(parseChannelQueryParam(searchParams.get('channel')));
      setUrlInvalid(false);
      sessionStorage.removeItem(SEND_REVIEW_SESSION_KEY);
      setBootstrapped(true);
      return;
    }
    if (parsed.kind === 'invalid') {
      setCustomerIds([]);
      setUrlInvalid(true);
      setBootstrapped(true);
      return;
    }

    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem(SEND_REVIEW_SESSION_KEY) : null;
      sessionStorage.removeItem(SEND_REVIEW_SESSION_KEY);
      if (raw) {
        const p = JSON.parse(raw) as SendReviewSessionPayload;
        if (Array.isArray(p.customerIds) && p.customerIds.length > 0 && typeof p.rule === 'string') {
          const coercedRule = coercePresetNotificationRule(typeof p.rule === 'string' ? p.rule : '');
          setCustomerIds(p.customerIds);
          setRule(coercedRule);
          setChannel(p.channel ?? 'LINE');
          setUrlInvalid(false);
          setBootstrapped(true);
          return;
        }
      }
    } catch {
      /* fall through */
    }
    setCustomerIds([]);
    setUrlInvalid(false);
    setBootstrapped(true);
  }, [queryKey, searchParams]);

  const loadPayload = useCallback(async () => {
    if (customerIds.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/notifications/review-payload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_ids: customerIds,
          rule: coercePresetNotificationRule(rule),
          channel,
        }),
      });
      const json = (await res.json()) as {
        items?: ReviewItem[];
        error?: unknown;
      };
      if (!res.ok) throw new Error(String(json.error ?? 'プレビュー取得に失敗'));
      const nextItems = json.items ?? [];
      setItems(nextItems);

      if (typeof window !== 'undefined') {
        const ruleForCanon = coercePresetNotificationRule(rule);
        const want = canonicalReviewSearchString(customerIds, ruleForCanon, channel);
        const have = canonicalReviewSearchFromLocationSearch(window.location.search);
        if (want !== have) {
          router.replace(`/notifications/review?${want}`, { scroll: false });
        }
      }
    } catch (e) {
      toast.show((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [customerIds, rule, channel, router]);

  useEffect(() => {
    if (!bootstrapped) return;
    if (customerIds.length === 0) return;
    void loadPayload();
  }, [bootstrapped, customerIds.join(','), rule, channel, loadPayload]);

  async function ensureQuotes() {
    if (customerIds.length === 0) return;
    setEnsuring(true);
    try {
      const res = await fetch('/api/quotes/ensure-for-customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_ids: customerIds }),
      });
      const json = (await res.json()) as { created?: number; skipped?: number; errors?: string[] };
      if (!res.ok) throw new Error(JSON.stringify(json));
      toast.show(
        `見積を作成: ${json.created ?? 0} 件 / スキップ: ${json.skipped ?? 0} 件` +
          (json.errors?.length ? `（警告 ${json.errors.length}）` : ''),
      );
      await loadPayload();
    } catch (e) {
      toast.show(`見積一括生成: ${(e as Error).message}`);
    } finally {
      setEnsuring(false);
    }
  }

  async function sendAll() {
    if (customerIds.length === 0) return;
    if (!window.confirm(`${customerIds.length} 件へ「${channel}」で通知を送信します。よろしいですか？`)) {
      return;
    }
    setSending(true);
    try {
      const ruleForSend = coercePresetNotificationRule(rule);
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule: ruleForSend,
          channel,
          customer_ids: customerIds,
        }),
      });
      const json = (await res.json()) as { queued?: number; sent?: number; failed?: number };
      if (!res.ok) throw new Error(JSON.stringify(json));
      toast.show(
        `投入 ${json.queued ?? 0} / 送信成功 ${json.sent ?? 0} / 失敗 ${json.failed ?? 0}`,
      );
      router.push('/notifications/logs');
    } catch (e) {
      toast.show(`送信失敗: ${(e as Error).message}`);
    } finally {
      setSending(false);
    }
  }

  function toggleRow(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  if (!bootstrapped) {
    return <div className="panel" style={{ padding: 24 }}>読み込み中…</div>;
  }

  if (urlInvalid) {
    return (
      <section className="panel" style={{ padding: 24 }}>
        <h1 className="page-title">送信レビュー</h1>
        <p style={{ marginTop: 12, color: 'var(--warn)' }}>
          URL の <code style={{ margin: '0 4px' }}>customers</code> が空であるか、UUID の形式として解釈できません。
        </p>
        <p className="cust-meta" style={{ marginTop: 8 }}>
          例:
          <code style={{ marginLeft: 8, display: 'block', marginTop: 8 }}>
            /notifications/review?customers=顧客UUID&rule=shaken_90days&channel=LINE
          </code>
        </p>
        <NextActions
          items={[
            { href: '/priorities', label: '優先一覧へ', primary: true },
            { href: '/lists/shaken-180', label: '車検半年前リスト' },
            { href: '/lists/shaken-90', label: '車検3か月前リスト' },
          ]}
        />
      </section>
    );
  }

  if (customerIds.length === 0) {
    return (
      <section className="panel" style={{ padding: 24 }}>
        <h1 className="page-title">送信レビュー</h1>
        <p style={{ marginTop: 12, color: 'var(--ink-2)' }}>
          通知対象リストまたは優先一覧から「プレビューして送信」を選ぶか、URL のクエリで顧客 ID を指定して開いてください。
        </p>
        <p className="cust-meta" style={{ marginTop: 8 }}>
          共有用 URL の例{' '}
          <code>/notifications/review?customers=UUID1,UUID2&rule=shaken_90days&channel=LINE</code>
        </p>
        <NextActions
          items={[
            { href: '/priorities', label: '優先一覧へ', primary: true },
            { href: '/lists/shaken-180', label: '車検半年前リスト' },
            { href: '/lists/shaken-90', label: '車検3か月前リスト' },
          ]}
        />
      </section>
    );
  }

  const noQuoteCount = items.filter((i) => !i.quote).length;

  return (
    <>
      <PageBack href="/priorities" label="優先へ戻る" />
      <div className="page-header">
        <div>
          <h1 className="page-title">送信レビュー</h1>
          <div className="page-sub">内容を確認してから送信します（{customerIds.length} 名）</div>
        </div>
      </div>

      {noQuoteCount > 0 ? (
        <section
          className="panel"
          role="status"
          style={{
            marginBottom: 16,
            padding: 14,
            borderLeft: '4px solid var(--warn)',
            background: 'var(--surface-2)',
          }}
        >
          見積がまだない顧客が <strong>{noQuoteCount}</strong> 名います。
          「送信前に見積を揃える（推奨）」で自動発行し、本文の見積リンクが正しくなることを確認してから送信してください。
        </section>
      ) : null}

      <section className="panel" style={{ marginBottom: 20, padding: 16 }}>
        <div className="form-row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-field">
            <label className="form-label">ルール</label>
            <select className="select" value={rule} onChange={(e) => setRule(e.target.value as typeof rule)}>
              <option value="shaken_180days">車検半年前</option>
              <option value="shaken_90days">車検3か月前</option>
              <option value="shaken_30days">車検1ヶ月前</option>
              <option value="shaken_overdue">車検満了後フォロー</option>
              <option value="oil_4000km">オイル交換目安</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">チャネル</label>
            <select className="select" value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)}>
              <option value="LINE">LINE</option>
              <option value="MAIL">メール</option>
              <option value="BOTH">両方</option>
            </select>
          </div>
          <button type="button" className="btn btn-sm btn-primary" disabled={loading} onClick={() => void loadPayload()}>
            {loading ? 'プレビュー読込中…' : 'プレビューを更新'}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={ensuring || noQuoteCount === 0}
            onClick={() => void ensureQuotes()}
            title={noQuoteCount === 0 ? '全員見積あり' : `${noQuoteCount} 名は見積なし`}
          >
            {ensuring ? '生成中…' : `送信前に見積を揃える（推奨）${noQuoteCount ? ` (${noQuoteCount})` : ''}`}
          </button>
        </div>
        <p className="cust-meta" style={{ marginTop: 12 }}>
          テンプレのプレースホルダ（例: <code>{'{{quoteUrl}}'}</code>）は送信時も同様に埋まります。展開後のリンクは各行の詳細にも表示されます。
        </p>
      </section>

      <section className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="empty" style={{ padding: 24 }}>
            読込中…
          </div>
        ) : items.length === 0 ? (
          <div className="empty" style={{ padding: 24 }}>
            プレビューがありません
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th style={{ textAlign: 'left', padding: 10 }}>顧客</th>
                <th style={{ textAlign: 'left', padding: 10 }}>
                  {rule === 'oil_4000km' ? '見積（一式）' : '法定概算'}
                  <div className="cust-meta" style={{ fontWeight: 400, marginTop: 2 }}>
                    {rule === 'oil_4000km' ? '税込合計' : 'LINE本文と同じ主表示'}
                  </div>
                </th>
                <th style={{ textAlign: 'left', padding: 10 }}>警告</th>
                <th style={{ padding: 10 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const open = expanded[row.customer_id];
                return (
                  <Fragment key={row.customer_id}>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: 10 }}>
                        <Link href={`/customers/${row.customer_id}`} className="panel-link">
                          {row.name ?? row.customer_id}
                        </Link>
                        <div className="cust-meta">{row.plate}</div>
                      </td>
                      <td style={{ padding: 10 }}>
                        {row.quote ? (
                          rule === 'oil_4000km' ? (
                            <>
                              <strong>{formatYen(row.quote.grand_total)}</strong>
                              <div className="cust-meta">税込一式</div>
                              <div className="cust-meta">{row.quote.quote_no ?? '-'}</div>
                              <div className="cust-meta">{formatDate(row.quote.issued_at)}</div>
                            </>
                          ) : (
                            <>
                              <strong>{formatYen(row.quote.tax_summary.non_taxable_subtotal)}</strong>
                              <div className="cust-meta">法定・手数料（対象外）小計</div>
                              <div className="cust-meta">
                                一式（税込・参考）{formatYen(row.quote.grand_total)}
                              </div>
                              <div className="cust-meta">{row.quote.quote_no ?? '-'}</div>
                              <div className="cust-meta">{formatDate(row.quote.issued_at)}</div>
                            </>
                          )
                        ) : (
                          <span className="cust-meta">—</span>
                        )}
                      </td>
                      <td style={{ padding: 10, color: row.warnings.length ? 'var(--warn)' : undefined }}>
                        {row.warnings.length === 0 ? '—' : row.warnings.join(' / ')}
                      </td>
                      <td style={{ padding: 10 }}>
                        <button type="button" className="btn btn-sm" onClick={() => toggleRow(row.customer_id)}>
                          {open ? '閉じる' : '本文・見積'}
                        </button>
                        {row.customer_id ? (
                          <Link
                            href={`/quotes/by-customer/${row.customer_id}`}
                            className="btn btn-sm btn-done"
                            style={{ marginLeft: 6, display: 'inline-block', lineHeight: '1.2' }}
                          >
                            見積一覧
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                    {open ? (
                      <tr key={`${row.customer_id}-d`}>
                        <td colSpan={4} style={{ padding: 16, background: 'var(--surface-2)' }}>
                          {channel === 'LINE' || channel === 'BOTH' ? (
                            <div style={{ marginBottom: channel === 'BOTH' ? 16 : 0, whiteSpace: 'pre-wrap' }}>
                              <div className="form-label">LINE</div>
                              {row.line_preview ?? '（プレビューなし）'}
                            </div>
                          ) : null}
                          {channel === 'MAIL' || channel === 'BOTH' ? (
                            <div style={{ whiteSpace: 'pre-wrap' }}>
                              <div className="form-label">メール</div>
                              {row.mail_subject ? <div>件名: {row.mail_subject}</div> : null}
                              {row.mail_body ?? '—'}
                            </div>
                          ) : null}

                          {row.quote_link_preview ? (
                            <div style={{ marginTop: 16, fontSize: 12 }}>
                              <div className="form-label">本文のお見積リンク（送信時）</div>
                              <a href={row.quote_link_preview} target="_blank" rel="noreferrer" className="panel-link">
                                {row.quote_link_preview}
                              </a>
                            </div>
                          ) : null}

                          {row.quote ? (
                            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                              <div className="form-label" style={{ marginBottom: 8 }}>
                                見積プレビュー（{row.quote.quote_no ?? row.quote.id.slice(0, 8)}）
                              </div>
                              <div className="cust-meta" style={{ marginBottom: 12 }}>
                                発行 {formatDate(row.quote.issued_at)} ・ 有効 {formatDate(row.quote.valid_until)}
                              </div>

                              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>法定・手数料（対象外）</div>
                              <table style={{ width: '100%', maxWidth: 520, marginBottom: 14, borderCollapse: 'collapse', fontSize: 12 }}>
                                <thead>
                                  <tr>
                                    <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', padding: '4px 6px' }}>
                                      品目
                                    </th>
                                    <th style={{ textAlign: 'right', borderBottom: '1px solid var(--border)', padding: '4px 6px' }}>
                                      金額
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.quote.legal_lines.map((line, i) => (
                                    <tr key={`l-${i}`}>
                                      <td style={{ padding: '4px 6px', verticalAlign: 'top' }}>
                                        {line.label}
                                        {line.quantity !== 1 ? <span className="cust-meta"> ×{line.quantity}</span> : null}
                                      </td>
                                      <td style={{ textAlign: 'right', padding: '4px 6px' }}>{formatYen(line.amount)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>作業・部品（税込表示）</div>
                              <table style={{ width: '100%', maxWidth: 520, marginBottom: 14, borderCollapse: 'collapse', fontSize: 12 }}>
                                <thead>
                                  <tr>
                                    <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', padding: '4px 6px' }}>
                                      品目
                                    </th>
                                    <th style={{ textAlign: 'right', borderBottom: '1px solid var(--border)', padding: '4px 6px' }}>
                                      金額
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.quote.service_lines.map((line, i) => (
                                    <tr key={`s-${i}`}>
                                      <td style={{ padding: '4px 6px', verticalAlign: 'top' }}>
                                        {line.label}
                                        {line.quantity !== 1 ? <span className="cust-meta"> ×{line.quantity}</span> : null}
                                      </td>
                                      <td style={{ textAlign: 'right', padding: '4px 6px' }}>{formatYen(line.amount)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>税サマリー</div>
                              <table style={{ width: '100%', maxWidth: 360, marginBottom: 12, fontSize: 12 }}>
                                <tbody>
                                  <tr>
                                    <td>対象外小計（法定）</td>
                                    <td style={{ textAlign: 'right' }}>{formatYen(row.quote.tax_summary.non_taxable_subtotal)}</td>
                                  </tr>
                                  <tr>
                                    <td>10%対象・税込累計</td>
                                    <td style={{ textAlign: 'right' }}>{formatYen(row.quote.tax_summary.taxable_tax_included)}</td>
                                  </tr>
                                  <tr className="cust-meta">
                                    <td>　内・税抜相当</td>
                                    <td style={{ textAlign: 'right' }}>{formatYen(row.quote.tax_summary.taxable_subtotal_ex_tax)}</td>
                                  </tr>
                                  <tr>
                                    <td>消費税（10%）</td>
                                    <td style={{ textAlign: 'right' }}>{formatYen(row.quote.tax_summary.tax_amount_10)}</td>
                                  </tr>
                                  <tr style={{ fontWeight: 700 }}>
                                    <td>合計（税込）</td>
                                    <td style={{ textAlign: 'right' }}>{formatYen(row.quote.tax_summary.grand_total)}</td>
                                  </tr>
                                </tbody>
                              </table>

                              {row.quote.notes ? (
                                <div style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: 'var(--ink-2)' }}>
                                  <div className="form-label">備考</div>
                                  {row.quote.notes}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" className="btn btn-primary" disabled={sending || customerIds.length === 0} onClick={() => void sendAll()}>
          {sending ? '送信中…' : 'この内容で送信'}
        </button>
      </div>
    </>
  );
}

export function ReviewSendClient() {
  return (
    <Suspense fallback={<div className="panel" style={{ padding: 24 }}>読み込み中…</div>}>
      <ReviewSendClientInner />
    </Suspense>
  );
}
