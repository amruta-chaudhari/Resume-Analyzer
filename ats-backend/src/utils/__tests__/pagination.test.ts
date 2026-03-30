import { buildAnalysisWhereClause, parseDate } from '../pagination';

describe('pagination date helpers', () => {
  it('parses date-only values as UTC midnight', () => {
    const parsed = parseDate('2026-03-29');

    expect(parsed?.toISOString()).toBe('2026-03-29T00:00:00.000Z');
  });

  it('rejects non-ISO date strings', () => {
    expect(parseDate('03/29/2026')).toBeNull();
    expect(parseDate('not-a-date')).toBeNull();
  });

  it('uses exclusive next-day upper bound for date-only toDate filters', () => {
    const where = buildAnalysisWhereClause('user-1', {
      toDate: parseDate('2026-03-29') || undefined,
    });

    expect(where.createdAt.lt.toISOString()).toBe('2026-03-30T00:00:00.000Z');
  });
});
