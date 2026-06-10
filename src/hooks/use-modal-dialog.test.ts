import { describe, expect, it } from 'vitest';
import { getModalDialogSyncAction } from './use-modal-dialog';

describe('getModalDialogSyncAction', () => {
  it('opens when wantOpen and not yet open', () => {
    expect(getModalDialogSyncAction(true, false)).toBe('show');
  });

  it('closes when not wantOpen but still open', () => {
    expect(getModalDialogSyncAction(false, true)).toBe('close');
  });

  it('noops when already in sync', () => {
    expect(getModalDialogSyncAction(true, true)).toBe('noop');
    expect(getModalDialogSyncAction(false, false)).toBe('noop');
  });
});
