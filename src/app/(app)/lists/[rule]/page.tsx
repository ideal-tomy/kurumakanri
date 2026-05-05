import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadRuleTargets, RULE_LABELS, type RuleKey } from '@/lib/rules';
import { TargetList } from './target-list';

export const dynamic = 'force-dynamic';

const SLUG_TO_RULE: Record<string, RuleKey> = {
  'shaken-180': 'shaken_180days',
  'shaken-90': 'shaken_90days',
  oil: 'oil_4000km',
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
      <div className="page-header">
        <div>
          <h1 className="page-title">{RULE_LABELS[ruleKey]}</h1>
          <div className="page-sub">
            対象 {targets.length} 件 / チェックして手動送信できます
          </div>
        </div>
        <div className="page-actions">
          <Link href="/dashboard" className="btn">
            ← ダッシュボード
          </Link>
        </div>
      </div>

      <TargetList rule={ruleKey} targets={targets} />
    </>
  );
}
