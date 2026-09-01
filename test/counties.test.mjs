import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findAssignedCounty,
  MAX_AGENT_COUNTIES,
  normalizeCounty,
  normalizeCountyList,
  TEXAS_COUNTIES,
} from '../lib/counties.mjs';

test('the selector contains all 254 official Texas counties exactly once', () => {
  assert.equal(TEXAS_COUNTIES.length, 254);
  assert.equal(new Set(TEXAS_COUNTIES).size, 254);
  assert.deepEqual(
    ['DeWitt', 'El Paso', 'La Salle', 'McLennan', 'McMullen', 'Van Zandt']
      .map(county => TEXAS_COUNTIES.includes(county)),
    [true, true, true, true, true, true]
  );
});

test('county names are canonicalized against the official list', () => {
  assert.equal(normalizeCounty('  mclennan   county '), 'McLennan');
  assert.equal(normalizeCounty('not a texas county'), null);
  assert.equal(normalizeCounty(''), null);
});

test('county lists deduplicate case-insensitively and reject invalid input', () => {
  assert.deepEqual(normalizeCountyList(['Brazos', ' brazos county ', 'Washington']), ['Brazos', 'Washington']);
  assert.equal(normalizeCountyList('Brazos'), null);
  assert.equal(normalizeCountyList(['Brazos', 'Not Real']), null);
  assert.equal(normalizeCountyList(Array(MAX_AGENT_COUNTIES + 1).fill('Brazos')), null);
});

test('survey county must match an assigned county and returns canonical casing', () => {
  const assigned = ['McLennan', 'Brazos'];
  assert.equal(findAssignedCounty('mclennan county', assigned), 'McLennan');
  assert.equal(findAssignedCounty('Travis', assigned), null);
});
