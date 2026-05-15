'use client';

import { useEffect } from 'react';
import { prefetchSendPreview, type SendPreviewChannel } from '@/lib/notifications/send-preview-cache';
import type { PresetNotificationRule } from '@/lib/notifications/send-review-session';

const MOBILE_MQ = '(max-width: 1100px)';
const PREFETCH_STAGGER_MS = 450;
const PREFETCH_MAX = 24;
const IDLE_TIMEOUT_MS = 2500;
const FALLBACK_DELAY_MS = 1200;

/**
 * リスト表示後、アイドル時に1件ずつプレビューを先読みする（初期描画をブロックしない）。
 */
export function useSendPreviewPrefetch(
  customerIds: string[],
  rule: PresetNotificationRule,
  channel: SendPreviewChannel,
) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia(MOBILE_MQ).matches) return;

    let cancelled = false;

    const run = async () => {
      const ids = customerIds.slice(0, PREFETCH_MAX);
      for (const id of ids) {
        if (cancelled) return;
        await prefetchSendPreview([id], rule, channel);
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, PREFETCH_STAGGER_MS));
      }
    };

    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const start = () => {
      if (cancelled) return;
      void run();
    };

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(start, { timeout: IDLE_TIMEOUT_MS });
    } else {
      timeoutId = setTimeout(start, FALLBACK_DELAY_MS);
    }

    return () => {
      cancelled = true;
      if (idleId != null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, [customerIds.join(','), rule, channel]);
}
