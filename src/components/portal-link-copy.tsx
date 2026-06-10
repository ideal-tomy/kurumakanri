'use client';

import { useState } from 'react';

export function PortalLinkCopy({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="portal-link-copy">
      <div className="portal-link-copy-url">{url}</div>
      <button type="button" className="btn btn-sm" onClick={handleCopy}>
        {copied ? 'コピーしました' : 'リンクをコピー'}
      </button>
    </div>
  );
}
