import {
  buildProfitTrendSeries,
  generateInstallmentDates,
} from '../utils/loan-utils.js';

describe('generateInstallmentDates', () => {
  it('sets last installment exactly on final payment date', () => {
    const dates = generateInstallmentDates('2026-01-01', '2026-04-01', 3);

    expect(dates).toHaveLength(3);
    expect(dates[2]).toBe('2026-04-01T00:00:00.000Z');
  });

  it('creates strictly increasing due dates for short term schedules', () => {
    const dates = generateInstallmentDates('2026-01-01', '2026-01-10', 6);
    const timestamps = dates.map((value) => new Date(value).getTime());

    for (let index = 1; index < timestamps.length; index += 1) {
      expect(timestamps[index]).toBeGreaterThan(timestamps[index - 1]);
    }
  });

  it('supports long term schedules with many installments', () => {
    const dates = generateInstallmentDates('2026-01-01', '2027-01-01', 24);

    expect(dates).toHaveLength(24);
    expect(dates[0]).toMatch(/^2026-/);
    expect(dates[23]).toBe('2027-01-01T00:00:00.000Z');
  });
});

describe('buildProfitTrendSeries', () => {
  it('returns daily and cumulative profit without double accumulation', () => {
    const trends = buildProfitTrendSeries([
      { loanDate: '2026-01-01T00:00:00.000Z', profit: 100 },
      { loanDate: '2026-01-03T00:00:00.000Z', profit: 50 },
    ]);

    expect(trends).toEqual([
      { date: '2026-01-01', dailyProfit: 100, cumulativeProfit: 100 },
      { date: '2026-01-03', dailyProfit: 50, cumulativeProfit: 150 },
    ]);
  });
});
