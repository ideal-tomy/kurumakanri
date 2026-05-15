'use client';

import { useEffect } from 'react';

const MOBILE_MAX = 1100;

/** URL の hash が #vehicle-new のとき、該当する車両追加フォームの details を開く */
export function OpenDetailsFromHash() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#vehicle-new') return;

    const mobile = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches;

    if (mobile) {
      const outer = document.getElementById('accordion-vehicles');
      if (outer instanceof HTMLDetailsElement) outer.open = true;
    }

    const inner = mobile
      ? document.querySelector('#accordion-vehicles [data-role="vehicle-new-details"]')
      : document.querySelector('.vehicle-panel-desktop [data-role="vehicle-new-details"]');

    if (inner instanceof HTMLDetailsElement) inner.open = true;

    requestAnimationFrame(() => {
      (inner instanceof HTMLElement ? inner : document.getElementById('accordion-vehicles'))?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, []);

  return null;
}
