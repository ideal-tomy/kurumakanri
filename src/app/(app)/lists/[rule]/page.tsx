import { notFound } from 'next/navigation';
import { PageBack } from '@/components/page-back';
import { NextActions, type NextActionItem } from '@/components/next-actions';
import { loadRuleTargets, RULE_LABELS, type RuleKey } from '@/lib/rules';
import { TargetList } from './target-list';

export const dynamic = 'force-dynamic';

const SLUG_TO_RULE: Record<string, RuleKey> = {
  'shaken-180': 'shaken_180days',
  'shaken-90': 'shaken_90days',
  'shaken-30': 'shaken_30days',
  'shaken-overdue': 'shaken_overdue',
  oil: 'oil_4000km',
};

const OTHER_LISTS: Record<RuleKey, NextActionItem[]> = {
  shaken_180days: [
    { href: '/lists/shaken-90', label: '車検3か月前リスト' },
    { href: '/lists/shaken-30', label: '車検1ヶ月前リスト' },
    { href: '/lists/shaken-overdue', label: '車検満了後フォロー' },
    { href: '/lists/oil', label: 'オイル交換目安' },
  ],
  shaken_90days: [
    { href: '/lists/shaken-180', label: '車検半年前リスト' },
    { href: '/lists/shaken-30', label: '車検1ヶ月前リスト' },
    { href: '/lists/shaken-overdue', label: '車検満了後フォロー' },
    { href: '/lists/oil', label: 'オイル交換目安' },
  ],
  shaken_30days: [
    { href: '/lists/shaken-90', label: '車検3か月前リスト' },
    { href: '/lists/shaken-180', label: '車検半年前リスト' },
    { href: '/lists/shaken-overdue', label: '車検満了後フォロー' },
    { href: '/lists/oil', label: 'オイル交換目安' },
  ],
  shaken_overdue: [
    { href: '/lists/shaken-30', label: '車検1ヶ月前リスト' },
    { href: '/lists/shaken-90', label: '車検3か月前リスト' },
    { href: '/lists/shaken-180', label: '車検半年前リスト' },
    { href: '/lists/oil', label: 'オイル交換目安' },
  ],
  oil_4000km: [
    { href: '/lists/shaken-180', label: '車検半年前リスト' },
    { href: '/lists/shaken-90', label: '車検3か月前リスト' },
    { href: '/lists/shaken-30', label: '車検1ヶ月前リスト' },
    { href: '/lists/shaken-overdue', label: '車検満了後フォロー' },
  ],
};

interface PageProps {
  params: { rule: string };
}

export default async function ListPage({ params }: PageProps) {
  const ruleKey = SLUG_TO_RULE[params.rule];
  if (!ruleKey) notFound();
  const targets = await loadRuleTargets(ruleKey);

  return (
    <>
      <PageBack href="/priorities" label="今日の連絡へ戻る" />
      <div className="page-header">
        <div>
          <h1 className="page-title">{RULE_LABELS[ruleKey]}</h1>
          <div className="page-sub">
            対象 {targets.length} 件 / チェックして手動送信できます
          </div>
        </div>
      </div>

      <TargetList rule={ruleKey} targets={targets} />

      <NextActions
        items={[
          ...OTHER_LISTS[ruleKey],
          { href: '/notifications/logs', label: '配信履歴' },
          { href: '/priorities', label: '今日の連絡', primary: true },
        ]}
      />
    </>
  );
}
