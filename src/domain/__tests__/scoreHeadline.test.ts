import { buildScoreHeadline, prizeLineLabel } from '../services/scoreHeadline';
import { getWeekNumber } from '../services/dayKey';
import { Competitor } from '../models/Competitor';

const WJ = '⁠';

const matt: Competitor = { id: 'comp-a', name: 'Matt', color: '#5B9BD5', userId: 'u1' };
const pri: Competitor = { id: 'comp-b', name: 'Pri', color: '#9B7FD1', userId: 'u2' };

describe('buildScoreHeadline', () => {
  describe('solo (no housemate)', () => {
    it('shows new week at zero', () => {
      expect(buildScoreHeadline({ competitor: matt, score: 0 })).toEqual([
        { text: 'New week, 0 points' },
      ]);
    });

    it('counts points with plural', () => {
      expect(buildScoreHeadline({ competitor: matt, score: 12 })).toEqual([
        { text: '12 points this week' },
      ]);
    });

    it('uses singular for one point', () => {
      expect(buildScoreHeadline({ competitor: matt, score: 1 })).toEqual([
        { text: '1 point this week' },
      ]);
    });
  });

  describe('head to head', () => {
    it('introduces the matchup with both names at 0-0', () => {
      const segments = buildScoreHeadline(
        { competitor: matt, score: 0 },
        { competitor: pri, score: 0 }
      );
      expect(segments).toEqual([
        { text: 'Matt', competitorId: 'comp-a' },
        { text: ' vs ' },
        { text: 'Pri', competitorId: 'comp-b' },
        { text: `, 0${WJ}–${WJ}0` },
      ]);
    });

    it('keeps both names on a tie', () => {
      const segments = buildScoreHeadline(
        { competitor: matt, score: 33 },
        { competitor: pri, score: 33 }
      );
      expect(segments).toEqual([
        { text: 'Matt', competitorId: 'comp-a' },
        { text: ' & ' },
        { text: 'Pri', competitorId: 'comp-b' },
        { text: ` tied, 33${WJ}–${WJ}33` },
      ]);
    });

    it('drops names from the tie when they blow the two-line budget', () => {
      const longA: Competitor = { ...matt, name: 'Alexandrina-Maria' };
      const longB: Competitor = { ...pri, name: 'Christopher-John' };
      const tied = buildScoreHeadline(
        { competitor: longA, score: 33 },
        { competitor: longB, score: 33 }
      );
      expect(tied).toEqual([{ text: `Tied, 33${WJ}–${WJ}33` }]);

      const fresh = buildScoreHeadline(
        { competitor: longA, score: 0 },
        { competitor: longB, score: 0 }
      );
      expect(fresh).toEqual([{ text: `New week, 0${WJ}–${WJ}0` }]);
    });

    it('names the leader with their color and their score first', () => {
      const segments = buildScoreHeadline(
        { competitor: matt, score: 33 },
        { competitor: pri, score: 35 }
      );
      expect(segments).toEqual([
        { text: 'Pri', competitorId: 'comp-b' },
        { text: ` leads, 35${WJ}–${WJ}33` },
      ]);
    });

    it('works when competitor A leads', () => {
      const segments = buildScoreHeadline(
        { competitor: matt, score: 40 },
        { competitor: pri, score: 35 }
      );
      expect(segments[0]).toEqual({ text: 'Matt', competitorId: 'comp-a' });
      expect(segments[1].text).toContain(`40${WJ}–${WJ}35`);
    });

    it('glues the score pair so it can never wrap mid-score', () => {
      const segments = buildScoreHeadline(
        { competitor: matt, score: 33 },
        { competitor: pri, score: 35 }
      );
      const scoreText = segments[1].text;
      expect(scoreText).not.toMatch(/\d–\d(?!⁠)/u);
      expect(scoreText).toContain(WJ);
    });
  });
});

describe('prizeLineLabel', () => {
  it('prompts to set a prize when empty', () => {
    expect(prizeLineLabel('', false)).toBe("Set this week's prize");
  });

  it('reads as an open challenge at 0-0', () => {
    expect(prizeLineLabel('Sleep in on weekend', true)).toBe(
      'Up for grabs: Sleep in on weekend'
    );
  });

  it('reads as the stake once the week is live', () => {
    expect(prizeLineLabel('Sleep in on weekend', false)).toBe(
      'Playing for: Sleep in on weekend'
    );
  });
});

describe('getWeekNumber', () => {
  it('returns week 1 for the year start containing the first Thursday', () => {
    expect(getWeekNumber('2026-01-01')).toBe(1); // Thursday
  });

  it('rolls to week 2 on the following Monday', () => {
    expect(getWeekNumber('2026-01-05')).toBe(2);
  });

  it('computes mid-year weeks', () => {
    expect(getWeekNumber('2026-07-04')).toBe(27); // Saturday of week 27
    expect(getWeekNumber('2026-07-06')).toBe(28); // Monday of week 28
  });

  it('assigns late December to week 1 of the next ISO year when applicable', () => {
    expect(getWeekNumber('2024-12-30')).toBe(1); // Monday of 2025 week 1
  });
});
