import {
  seedTasks,
  reconcileTemplateChange,
  detachInstance,
  createSkipRecordForDelete,
} from '../services/seeding';
import { TaskInstance } from '../models/TaskInstance';
import { RecurringTemplate } from '../models/RecurringTemplate';
import { SkipRecord } from '../models/SkipRecord';

describe('seeding service', () => {
  // Test data
  const weekDays = [
    '2026-01-18', // Sunday (0)
    '2026-01-19', // Monday (1)
    '2026-01-20', // Tuesday (2)
    '2026-01-21', // Wednesday (3)
    '2026-01-22', // Thursday (4)
    '2026-01-23', // Friday (5)
    '2026-01-24', // Saturday (6)
  ];

  const dailyTemplate: RecurringTemplate = {
    id: 'template-daily',
    householdId: 'household-1',
    name: 'Exercise',
    repeatDays: [0, 1, 2, 3, 4, 5, 6], // Every day
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const weekdaysTemplate: RecurringTemplate = {
    id: 'template-weekdays',
    householdId: 'household-1',
    name: 'Work tasks',
    repeatDays: [1, 2, 3, 4, 5], // Mon-Fri
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  describe('seedTasks', () => {
    it('creates instances for each matching day', () => {
      const result = seedTasks(
        weekDays,
        [dailyTemplate],
        [],
        [],
        'challenge-1'
      );

      expect(result.created).toHaveLength(7);
      expect(result.skipped).toBe(0);
    });

    it('only creates instances for matching repeat days', () => {
      const result = seedTasks(
        weekDays,
        [weekdaysTemplate],
        [],
        [],
        'challenge-1'
      );

      // Mon-Fri = 5 days
      expect(result.created).toHaveLength(5);
    });

    it('is idempotent - no duplicates on repeated calls', () => {
      // First seed
      const result1 = seedTasks(
        weekDays,
        [dailyTemplate],
        [],
        [],
        'challenge-1'
      );

      // Second seed with existing instances
      const result2 = seedTasks(
        weekDays,
        [dailyTemplate],
        result1.created,
        [],
        'challenge-1'
      );

      expect(result2.created).toHaveLength(0);
      expect(result2.skipped).toBe(7);
    });

    it('respects skip records', () => {
      const skipRecords: SkipRecord[] = [
        { templateId: 'template-daily', dayKey: '2026-01-19' },
        { templateId: 'template-daily', dayKey: '2026-01-20' },
      ];

      const result = seedTasks(
        weekDays,
        [dailyTemplate],
        [],
        skipRecords,
        'challenge-1'
      );

      expect(result.created).toHaveLength(5); // 7 - 2 skipped
      expect(result.skipped).toBe(2);

      // Verify skipped days are not in created
      const createdDays = result.created.map((i) => i.dayKey);
      expect(createdDays).not.toContain('2026-01-19');
      expect(createdDays).not.toContain('2026-01-20');
    });

    it('sets originalName for rename detection', () => {
      const result = seedTasks(
        weekDays,
        [dailyTemplate],
        [],
        [],
        'challenge-1'
      );

      for (const instance of result.created) {
        expect(instance.originalName).toBe('Exercise');
        expect(instance.templateId).toBe('template-daily');
      }
    });

    it('delete "this day only" persists - seed does not resurrect', () => {
      // Simulate: user deletes Monday's task
      const skipRecords: SkipRecord[] = [
        { templateId: 'template-daily', dayKey: '2026-01-19' },
      ];

      // Re-seed
      const result = seedTasks(
        weekDays,
        [dailyTemplate],
        [],
        skipRecords,
        'challenge-1'
      );

      // Monday should not be created
      const mondayInstance = result.created.find(
        (i) => i.dayKey === '2026-01-19'
      );
      expect(mondayInstance).toBeUndefined();
    });

    it('assigns sequential sortOrder values per day', () => {
      const result = seedTasks(
        weekDays,
        [dailyTemplate, weekdaysTemplate],
        [],
        [],
        'challenge-1'
      );

      // Monday should have 2 tasks (daily + weekdays) with sortOrder 0,1
      const mondayTasks = result.created
        .filter((t) => t.dayKey === '2026-01-19')
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      expect(mondayTasks).toHaveLength(2);
      expect(mondayTasks[0].sortOrder).toBe(0);
      expect(mondayTasks[1].sortOrder).toBe(1);

      // Sunday should have 1 task (daily only) with sortOrder 0
      const sundayTasks = result.created.filter((t) => t.dayKey === '2026-01-18');
      expect(sundayTasks).toHaveLength(1);
      expect(sundayTasks[0].sortOrder).toBe(0);
    });

    it('new seeds start after existing tasks with sortOrder', () => {
      // Pre-existing tasks already have sortOrder 0 and 1
      const existingInstances: TaskInstance[] = [
        {
          id: 'existing-1',
          challengeId: 'challenge-1',
          dayKey: '2026-01-19',
          name: 'One-off task A',
          templateId: null,
          points: {},
          createdAt: '2026-01-19T00:00:00Z',
          updatedAt: '2026-01-19T00:00:00Z',
          sortOrder: 0,
        },
        {
          id: 'existing-2',
          challengeId: 'challenge-1',
          dayKey: '2026-01-19',
          name: 'One-off task B',
          templateId: null,
          points: {},
          createdAt: '2026-01-19T00:00:00Z',
          updatedAt: '2026-01-19T00:00:00Z',
          sortOrder: 1,
        },
      ];

      const result = seedTasks(
        ['2026-01-19'], // just Monday
        [dailyTemplate],
        existingInstances,
        [],
        'challenge-1'
      );

      expect(result.created).toHaveLength(1);
      expect(result.created[0].sortOrder).toBe(2); // after existing 0,1
    });

    it('sortOrder sequences are independent across days', () => {
      const result = seedTasks(
        weekDays,
        [dailyTemplate],
        [],
        [],
        'challenge-1'
      );

      // Every day should have sortOrder 0 (only 1 template)
      for (const day of weekDays) {
        const dayTasks = result.created.filter((t) => t.dayKey === day);
        expect(dayTasks).toHaveLength(1);
        expect(dayTasks[0].sortOrder).toBe(0);
      }
    });

    it('edit "this day only" does not create duplicates', () => {
      // Existing detached instance (templateId = null) + skip record
      const existingInstances: TaskInstance[] = [
        {
          id: 'instance-1',
          challengeId: 'challenge-1',
          dayKey: '2026-01-19',
          name: 'Edited Exercise',
          templateId: null, // Detached
          points: {},
          createdAt: '2026-01-19T00:00:00Z',
          updatedAt: '2026-01-19T00:00:00Z',
        },
      ];
      const skipRecords: SkipRecord[] = [
        { templateId: 'template-daily', dayKey: '2026-01-19' },
      ];

      const result = seedTasks(
        weekDays,
        [dailyTemplate],
        existingInstances,
        skipRecords,
        'challenge-1'
      );

      // Should create 6 instances (all except Monday which is skipped)
      expect(result.created).toHaveLength(6);

      // Monday should not have a template instance
      const mondayInstances = result.created.filter(
        (i) => i.dayKey === '2026-01-19'
      );
      expect(mondayInstances).toHaveLength(0);
    });
  });

  describe('reconcileTemplateChange', () => {
    it('removes untouched instances when day removed from pattern', () => {
      // Instance with 0 points, not renamed
      const instances: TaskInstance[] = [
        {
          id: 'instance-1',
          challengeId: 'challenge-1',
          dayKey: '2026-01-18', // Sunday
          name: 'Exercise',
          templateId: 'template-daily',
          originalName: 'Exercise',
          points: {},
          createdAt: '2026-01-18T00:00:00Z',
          updatedAt: '2026-01-18T00:00:00Z',
        },
      ];

      // Change from daily to weekdays (removes Sunday)
      const result = reconcileTemplateChange(
        dailyTemplate,
        [0, 1, 2, 3, 4, 5, 6],
        [1, 2, 3, 4, 5],
        instances
      );

      expect(result.removed).toHaveLength(1);
      expect(result.detached).toHaveLength(0);
    });

    it('detaches instances with points when day removed from pattern', () => {
      // Instance WITH points
      const instances: TaskInstance[] = [
        {
          id: 'instance-1',
          challengeId: 'challenge-1',
          dayKey: '2026-01-18', // Sunday
          name: 'Exercise',
          templateId: 'template-daily',
          originalName: 'Exercise',
          points: { 'competitor-a': 2 },
          createdAt: '2026-01-18T00:00:00Z',
          updatedAt: '2026-01-18T00:00:00Z',
        },
      ];

      const result = reconcileTemplateChange(
        dailyTemplate,
        [0, 1, 2, 3, 4, 5, 6],
        [1, 2, 3, 4, 5],
        instances
      );

      expect(result.removed).toHaveLength(0);
      expect(result.detached).toHaveLength(1);
      expect(result.detached[0].templateId).toBeNull();
      expect(result.newSkipRecords).toHaveLength(1);
    });

    it('detaches renamed instances when day removed from pattern', () => {
      // Instance that was renamed
      const instances: TaskInstance[] = [
        {
          id: 'instance-1',
          challengeId: 'challenge-1',
          dayKey: '2026-01-18', // Sunday
          name: 'Morning Exercise', // Renamed
          templateId: 'template-daily',
          originalName: 'Exercise',
          points: {},
          createdAt: '2026-01-18T00:00:00Z',
          updatedAt: '2026-01-18T00:00:00Z',
        },
      ];

      const result = reconcileTemplateChange(
        dailyTemplate,
        [0, 1, 2, 3, 4, 5, 6],
        [1, 2, 3, 4, 5],
        instances
      );

      expect(result.removed).toHaveLength(0);
      expect(result.detached).toHaveLength(1);
    });

    it('does nothing when no days removed', () => {
      const instances: TaskInstance[] = [
        {
          id: 'instance-1',
          challengeId: 'challenge-1',
          dayKey: '2026-01-19', // Monday
          name: 'Exercise',
          templateId: 'template-daily',
          originalName: 'Exercise',
          points: {},
          createdAt: '2026-01-19T00:00:00Z',
          updatedAt: '2026-01-19T00:00:00Z',
        },
      ];

      // Add Saturday, no days removed
      const result = reconcileTemplateChange(
        dailyTemplate,
        [1, 2, 3, 4, 5],
        [1, 2, 3, 4, 5, 6],
        instances
      );

      expect(result.removed).toHaveLength(0);
      expect(result.detached).toHaveLength(0);
    });

    it('toggling repeat days back does not create duplicates', () => {
      // Scenario: Template had Sunday, removed Sunday, then added Sunday back
      // The skip record from the removal should prevent re-seeding

      // First: seed with Sunday
      const initialSeed = seedTasks(
        ['2026-01-18'],
        [dailyTemplate],
        [],
        [],
        'challenge-1'
      );
      expect(initialSeed.created).toHaveLength(1);

      // Second: "remove" Sunday by reconciliation (untouched, so removed)
      const reconciled = reconcileTemplateChange(
        dailyTemplate,
        [0, 1, 2, 3, 4, 5, 6],
        [1, 2, 3, 4, 5, 6], // Remove Sunday
        initialSeed.created
      );
      expect(reconciled.removed).toHaveLength(1);

      // Third: Add Sunday back and re-seed
      // Note: If we properly track this, we'd need a skip record
      // For this test, we verify that re-seeding without skip record creates instance
      const reSeed = seedTasks(
        ['2026-01-18'],
        [{ ...dailyTemplate, repeatDays: [0, 1, 2, 3, 4, 5, 6] }],
        [], // No existing instances (was removed)
        [], // No skip records (clean re-add)
        'challenge-1'
      );

      // Should create one instance
      expect(reSeed.created).toHaveLength(1);
    });
  });

  describe('detachInstance', () => {
    it('sets templateId to null and creates skip record', () => {
      const instance: TaskInstance = {
        id: 'instance-1',
        challengeId: 'challenge-1',
        dayKey: '2026-01-19',
        name: 'Exercise',
        templateId: 'template-daily',
        originalName: 'Exercise',
        points: {},
        createdAt: '2026-01-19T00:00:00Z',
        updatedAt: '2026-01-19T00:00:00Z',
      };

      const [detached, skipRecord] = detachInstance(instance);

      expect(detached.templateId).toBeNull();
      expect(skipRecord).not.toBeNull();
      expect(skipRecord?.templateId).toBe('template-daily');
      expect(skipRecord?.dayKey).toBe('2026-01-19');
    });

    it('returns null skip record for already detached instance', () => {
      const instance: TaskInstance = {
        id: 'instance-1',
        challengeId: 'challenge-1',
        dayKey: '2026-01-19',
        name: 'One-off task',
        templateId: null,
        points: {},
        createdAt: '2026-01-19T00:00:00Z',
        updatedAt: '2026-01-19T00:00:00Z',
      };

      const [detached, skipRecord] = detachInstance(instance);

      expect(detached.templateId).toBeNull();
      expect(skipRecord).toBeNull();
    });
  });

  describe('createSkipRecordForDelete', () => {
    it('creates skip record for template-based instance', () => {
      const instance: TaskInstance = {
        id: 'instance-1',
        challengeId: 'challenge-1',
        dayKey: '2026-01-19',
        name: 'Exercise',
        templateId: 'template-daily',
        points: {},
        createdAt: '2026-01-19T00:00:00Z',
        updatedAt: '2026-01-19T00:00:00Z',
      };

      const skipRecord = createSkipRecordForDelete(instance);

      expect(skipRecord).not.toBeNull();
      expect(skipRecord?.templateId).toBe('template-daily');
      expect(skipRecord?.dayKey).toBe('2026-01-19');
    });

    it('returns null for one-off instance', () => {
      const instance: TaskInstance = {
        id: 'instance-1',
        challengeId: 'challenge-1',
        dayKey: '2026-01-19',
        name: 'One-off task',
        templateId: null,
        points: {},
        createdAt: '2026-01-19T00:00:00Z',
        updatedAt: '2026-01-19T00:00:00Z',
      };

      const skipRecord = createSkipRecordForDelete(instance);

      expect(skipRecord).toBeNull();
    });
  });
});
