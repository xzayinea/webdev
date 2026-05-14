import test from 'node:test';
import assert from 'node:assert/strict';
import { hasAttemptedDashboardHighlightChanges, normalizeDashboardHighlights } from '../src/services/highlights-service.js';

test('normalizeDashboardHighlights picks newest per card_position', () => {
  const rows = [
    { id: 1, card_position: 1, updated_at: '2026-05-01T00:00:00.000Z', title: 'old-1' },
    { id: 2, card_position: 1, updated_at: '2026-05-02T00:00:00.000Z', title: 'new-1' },
    { id: 3, card_position: 2, updated_at: '2026-05-02T00:00:00.000Z', title: 'only-2' },
    { id: 4, card_position: 99, updated_at: '2026-05-02T00:00:00.000Z', title: 'ignore' }
  ];

  const normalized = normalizeDashboardHighlights(rows, 3);

  assert.equal(normalized.length, 2);
  assert.equal(normalized[0].card_position, 1);
  assert.equal(normalized[0].title, 'new-1');
  assert.equal(normalized[1].card_position, 2);
  assert.equal(normalized[1].title, 'only-2');
});

test('normalizeDashboardHighlights breaks ties by higher id', () => {
  const rows = [
    { id: 10, card_position: 1, updated_at: '2026-05-01T00:00:00.000Z', title: 'older-id' },
    { id: 11, card_position: 1, updated_at: '2026-05-01T00:00:00.000Z', title: 'newer-id' }
  ];

  const normalized = normalizeDashboardHighlights(rows, 3);
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].id, 11);
});

test('hasAttemptedDashboardHighlightChanges detects non-title edits', () => {
  assert.equal(hasAttemptedDashboardHighlightChanges({}), false);
  assert.equal(hasAttemptedDashboardHighlightChanges({ description: 'hello' }), true);
  assert.equal(hasAttemptedDashboardHighlightChanges({ event_date: '2026-05-01' }), true);
  assert.equal(hasAttemptedDashboardHighlightChanges({ image_path: '/uploads/highlights/x.png' }), true);
  // card_position is always posted by the dashboard form; it should not count as a user "edit" by itself.
  assert.equal(hasAttemptedDashboardHighlightChanges({ card_position: 1 }), false);
});
