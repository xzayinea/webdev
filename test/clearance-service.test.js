import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateClearanceStatus, syncUserClearance } from '../src/services/clearance-service.js';

function fakeDb(statusRow) {
  const calls = [];
  return {
    calls,
    async execute(sql, params) {
      calls.push({ sql, params });
      if (sql.trim().startsWith('SELECT')) return [[statusRow]];
      return [{ affectedRows: 1 }];
    }
  };
}

test('clearance is cleared when all requirements are verified and no balance remains', async () => {
  const db = fakeDb({ open_requirements: 0, unpaid_balance: 0 });
  assert.equal(await calculateClearanceStatus(db, 10), 'cleared');
});

test('clearance has_fines when money tasks are unpaid', async () => {
  const db = fakeDb({ open_requirements: 0, unpaid_balance: 250 });
  assert.equal(await calculateClearanceStatus(db, 10), 'has_fines');
});

test('clearance is pending when upload requirements remain open', async () => {
  const db = fakeDb({ open_requirements: 2, unpaid_balance: 0 });
  assert.equal(await calculateClearanceStatus(db, 10), 'pending');
});

test('syncUserClearance persists calculated status', async () => {
  const db = fakeDb({ open_requirements: 0, unpaid_balance: 0 });
  const status = await syncUserClearance(db, 42);
  assert.equal(status, 'cleared');
  assert.match(db.calls[1].sql, /UPDATE users SET clearance_status/);
  assert.deepEqual(db.calls[1].params, ['cleared', 42]);
});
