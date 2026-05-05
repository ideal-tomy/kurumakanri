import { PrioritiesClient } from './priorities-client';

export const dynamic = 'force-dynamic';

export default function PrioritiesPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">優先</h1>
          <div className="page-sub">
            連絡候補と実務タスクを統合して、優先度順または時系列順で対応できます
          </div>
        </div>
      </div>
      <PrioritiesClient />
    </>
  );
}
