import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeContactEmail } from '../lib/contact-email.mjs';

test('contact emails are trimmed and normalized', () => {
  assert.equal(normalizeContactEmail('  Person@Example.EDU '), 'person@example.edu');
});

test('invalid or oversized contact emails are rejected', () => {
  assert.equal(normalizeContactEmail('not-an-email'), null);
  assert.equal(normalizeContactEmail('a'.repeat(310) + '@example.com'), null);
  assert.equal(normalizeContactEmail(null), null);
});
