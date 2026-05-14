import test from 'node:test';
import assert from 'node:assert/strict';
import { selectedSectionIds } from '../src/services/assignment-service.js';

test('selectedSectionIds accepts a single value', async () => {
  assert.deepEqual(await selectedSectionIds('3'), [3]);
});

test('selectedSectionIds deduplicates and removes invalid values', async () => {
  assert.deepEqual(await selectedSectionIds(['2', 'bad', '2', '-1', '5']), [2, 5]);
});

test('selectedSectionIds returns an empty array for missing input', async () => {
  assert.deepEqual(await selectedSectionIds(undefined), []);
});
