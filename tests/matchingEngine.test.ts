import { describe, it, expect } from 'vitest';
import { calculateMemberAllocatedHours, rankCandidatesForTask } from '../src/utils/matchingEngine';
import type { TeamMember, Task } from '../src/types';

describe('matchingEngine', () => {
  const memberA: TeamMember = {
    id: 'm1',
    name: 'Alice Smith',
    role: 'SEO Specialist',
    avatar: 'https://example.com/avatar.jpg',
    seniority: 'Senior',
    skills: ['SEO Technical', 'On-Page SEO'],
    weeklyCapacityHours: 40,
    skillScores: [
      { skill: 'SEO Technical', quality: 9, speedEfficiency: 8, communication: 8 }
    ],
    generalCompetency: {
      clientReadyTier: 'Tier 1 - Client Facing',
      englishProficiency: 'Fluent',
      autonomousExecution: 9,
      strategicContribution: 9
    }
  };

  const memberB: TeamMember = {
    id: 'm2',
    name: 'Bob Jones',
    role: 'Junior Content Writer',
    avatar: 'https://example.com/avatar.jpg',
    seniority: 'Junior',
    skills: ['Content Writing'],
    weeklyCapacityHours: 30,
    skillScores: [
      { skill: 'Content Writing', quality: 6, speedEfficiency: 6, communication: 6 }
    ],
    generalCompetency: {
      clientReadyTier: 'Tier 3 - Internal Only',
      englishProficiency: 'Basic',
      autonomousExecution: 5,
      strategicContribution: 4
    }
  };

  const tasks: Task[] = [
    {
      id: 't1',
      title: 'Technical Site Audit',
      requiredSkill: 'SEO Technical',
      estimatedHours: 15,
      actualHoursLogged: 10,
      deadline: '2026-09-30',
      status: 'in_progress',
      assignedUserId: 'm1',
      clientTier: 'TIER_S_VIP'
    },
    {
      id: 't2',
      title: 'Finished Blog Post',
      requiredSkill: 'Content Writing',
      estimatedHours: 5,
      actualHoursLogged: 5,
      deadline: '2026-09-15',
      status: 'completed',
      assignedUserId: 'm1'
    }
  ];

  describe('calculateMemberAllocatedHours', () => {
    it('sums active tasks hours and ignores completed tasks', () => {
      // t1 is active (15h estimated > 10h actual), t2 is completed (ignored)
      const allocated = calculateMemberAllocatedHours('m1', tasks);
      expect(allocated).toBe(15);
    });

    it('returns 0 for member with no assigned tasks', () => {
      const allocated = calculateMemberAllocatedHours('m2', tasks);
      expect(allocated).toBe(0);
    });
  });

  describe('rankCandidatesForTask', () => {
    it('ranks qualified specialist matching required skill', () => {
      const targetTask: Task = {
        id: 't3',
        title: 'New Site Speed Optimization',
        requiredSkill: 'SEO Technical',
        estimatedHours: 10,
        actualHoursLogged: 0,
        deadline: '2026-10-01',
        status: 'pending',
        clientTier: 'TIER_S_VIP'
      };

      const candidates = rankCandidatesForTask(targetTask, [memberA, memberB], tasks);

      // Only memberA has 'SEO Technical' skill
      expect(candidates.length).toBe(1);
      expect(candidates[0].member.id).toBe('m1');
      expect(candidates[0].fitScore).toBeGreaterThan(5);
    });

    it('applies VIP guard match bonus for Senior Tier 1 specialists', () => {
      const vipTask: Task = {
        id: 't4',
        title: 'VIP Keynote Presentation',
        requiredSkill: 'SEO Technical',
        estimatedHours: 8,
        actualHoursLogged: 0,
        deadline: '2026-10-05',
        status: 'pending',
        clientTier: 'TIER_S_VIP'
      };

      const candidates = rankCandidatesForTask(vipTask, [memberA], tasks);
      expect(candidates[0].justification).toContain('VIP Guard');
    });
  });
});
