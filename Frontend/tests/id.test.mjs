import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createExpressionId } from '../src/utils/id.js';

test('native UUIDs retain the custom expression prefix', () => {
  const uuid = webcrypto.randomUUID();
  assert.equal(createExpressionId({ randomUUID: () => uuid }), `custom-${uuid}`);
});

test('getRandomValues produces unique version 4 IDs without randomUUID', () => {
  const crypto = { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) };
  const ids = Array.from({ length: 100 }, () => createExpressionId(crypto));
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^custom-[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
});

test('local IDs remain unique even without Web Crypto', () => {
  const ids = Array.from({ length: 100 }, () => createExpressionId(null));
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^custom-[\da-z-]+$/);
});
