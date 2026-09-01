import { TEXAS_COUNTIES } from './texas-counties.mjs';

export { TEXAS_COUNTIES } from './texas-counties.mjs';
export const MAX_AGENT_COUNTIES = TEXAS_COUNTIES.length;

const COUNTY_BY_KEY = new Map(
  TEXAS_COUNTIES.map(county => [county.toLocaleLowerCase('en-US'), county])
);

function countyKey(value) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s+county$/i, '')
    .toLocaleLowerCase('en-US');
}

export function normalizeCounty(value) {
  if (typeof value !== 'string') return null;
  return COUNTY_BY_KEY.get(countyKey(value)) ?? null;
}

export function normalizeCountyList(value) {
  if (!Array.isArray(value) || value.length > MAX_AGENT_COUNTIES) return null;

  const counties = [];
  const seen = new Set();
  for (const item of value) {
    const county = normalizeCounty(item);
    if (!county) return null;

    if (!seen.has(county)) {
      seen.add(county);
      counties.push(county);
    }
  }

  return counties;
}

export function findAssignedCounty(value, assignedCounties) {
  const requested = normalizeCounty(value);
  if (!requested || !Array.isArray(assignedCounties)) return null;

  return assignedCounties.some(county => normalizeCounty(county) === requested)
    ? requested
    : null;
}
