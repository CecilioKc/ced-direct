import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getTestAuthConfig,
  isTestAuthHostAllowed,
  normalizeTestCode,
  testPasswordMatches,
} from '../lib/test-auth.mjs';

const validLocalEnv = {
  AUTH_MODE: 'local',
  DEPLOYMENT_ENV: 'test',
  LOCAL_AUTH_PASSWORD: 'a-long-test-password',
  LOCAL_AUTH_ALLOWED_CODES: 'AGENT-1, manager',
  LOCAL_AUTH_ALLOWED_HOSTS: 'localhost:3000, test.example.edu',
};

test('Azure remains the default authentication mode', () => {
  assert.equal(getTestAuthConfig({}).enabled, false);
});

test('local auth requires an explicit test deployment', () => {
  assert.throws(
    () => getTestAuthConfig({ ...validLocalEnv, DEPLOYMENT_ENV: 'production' }),
    /DEPLOYMENT_ENV=test/
  );
  assert.throws(
    () => getTestAuthConfig({ ...validLocalEnv, DEPLOYMENT_ENV: undefined }),
    /DEPLOYMENT_ENV=test/
  );
});

test('local auth fails closed when any safety setting is missing', () => {
  assert.throws(
    () => getTestAuthConfig({ ...validLocalEnv, LOCAL_AUTH_PASSWORD: 'too-short' }),
    /at least 16/
  );
  assert.throws(
    () => getTestAuthConfig({ ...validLocalEnv, LOCAL_AUTH_ALLOWED_CODES: '' }),
    /at least one/
  );
  assert.throws(
    () => getTestAuthConfig({ ...validLocalEnv, LOCAL_AUTH_ALLOWED_HOSTS: '' }),
    /exact test-server host/
  );
});

test('local auth accepts only an exact allow-listed host', () => {
  const config = getTestAuthConfig(validLocalEnv);
  assert.equal(isTestAuthHostAllowed(new Headers({ host: 'test.example.edu' }), config.allowedHosts), true);
  assert.equal(isTestAuthHostAllowed(new Headers({ host: 'prod.example.edu' }), config.allowedHosts), false);
  assert.equal(isTestAuthHostAllowed(new Headers({ host: 'test.example.edu,prod.example.edu' }), config.allowedHosts), false);
});

test('test password comparison and code normalization are strict', () => {
  assert.equal(testPasswordMatches('a-long-test-password', validLocalEnv.LOCAL_AUTH_PASSWORD), true);
  assert.equal(testPasswordMatches('wrong-password', validLocalEnv.LOCAL_AUTH_PASSWORD), false);
  assert.equal(normalizeTestCode(' agent-1 '), 'AGENT-1');
  assert.equal(normalizeTestCode('x'.repeat(51)), '');
});
