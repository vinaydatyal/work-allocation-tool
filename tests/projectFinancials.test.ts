import { describe, it, expect } from 'vitest';
import {
  getMemberCostPerHour,
  calculateProjectFinancials,
  SENIORITY_HOURLY_COST_RATES
} from '../src/utils/projectFinancials';
import type { TeamMember } from '../src/types';

describe('projectFinancials', () => {
  const mockSeniorMember: TeamMember = {
    id: 'mem_senior',
    name: 'Sarah Connor',
    role: 'Senior Technical Lead',
    avatar: 'https://example.com/avatar1.jpg',
    seniority: 'Senior',
    skills: ['SEO Technical', 'Architecture'],
    weeklyCapacityHours: 40,
    skillScores: [],
    generalCompetency: {
      clientReadyTier: 'Tier 1 - Client Facing',
      englishProficiency: 'Fluent',
      autonomousExecution: 9,
      strategicContribution: 9
    }
  };

  const mockMidMember: TeamMember = {
    id: 'mem_mid',
    name: 'John Doe',
    role: 'Mid Content Strategist',
    avatar: 'https://example.com/avatar2.jpg',
    seniority: 'Mid',
    skills: ['Content Writing', 'On-Page SEO'],
    weeklyCapacityHours: 35,
    skillScores: [],
    generalCompetency: {
      clientReadyTier: 'Tier 2 - Supervised Client',
      englishProficiency: 'Professional',
      autonomousExecution: 7,
      strategicContribution: 6
    }
  };

  const mockJuniorMember: TeamMember = {
    id: 'mem_junior',
    name: 'Junior Dev',
    role: 'Junior Analyst',
    avatar: 'https://example.com/avatar3.jpg',
    seniority: 'Junior',
    skills: ['Data Entry'],
    weeklyCapacityHours: 30,
    skillScores: [],
    generalCompetency: {
      clientReadyTier: 'Tier 3 - Internal Only',
      englishProficiency: 'Basic',
      autonomousExecution: 4,
      strategicContribution: 3
    }
  };

  const allMembers = [mockSeniorMember, mockMidMember, mockJuniorMember];

  describe('getMemberCostPerHour', () => {
    it('returns Senior rate for Senior or Tier 1 specialist', () => {
      expect(getMemberCostPerHour(mockSeniorMember)).toBe(SENIORITY_HOURLY_COST_RATES.Senior);
    });

    it('returns Mid rate for Mid specialist', () => {
      expect(getMemberCostPerHour(mockMidMember)).toBe(SENIORITY_HOURLY_COST_RATES.Mid);
    });

    it('returns Junior rate for Junior specialist', () => {
      expect(getMemberCostPerHour(mockJuniorMember)).toBe(SENIORITY_HOURLY_COST_RATES.Junior);
    });
  });

  describe('calculateProjectFinancials', () => {
    it('calculates gross profit and margin percent accurately', () => {
      const project = {
        id: 'proj_1',
        name: 'Apex Global',
        client: 'Apex Corp',
        monthlyPrice: 5000,
        activeHours: 40,
        members: [mockMidMember],
        memberHoursMap: {
          mem_mid: 40
        }
      };

      const fin = calculateProjectFinancials(project, allMembers);
      // Cost: 40h * $36 = $1440
      expect(fin.monthlyRetainerRevenue).toBe(5000);
      expect(fin.totalMonthlySquadCost).toBe(1440);
      expect(fin.grossProfitDollars).toBe(3560);
      // Margin: (3560 / 5000) * 100 = 71.2% -> rounded to 71%
      expect(fin.grossMarginPercent).toBe(71);
      expect(fin.marginTier).toBe('high');
    });

    it('identifies standard and low margin tiers', () => {
      // Low margin project: High senior hours, low retainer
      const lowMarginProj = {
        id: 'proj_low',
        name: 'Low Yield Retainer',
        monthlyPrice: 1500,
        activeHours: 30,
        members: [mockSeniorMember],
        memberHoursMap: {
          mem_senior: 30
        }
      };
      // Cost: 30h * $58 = $1740 > $1500
      const fin = calculateProjectFinancials(lowMarginProj, allMembers);
      expect(fin.grossProfitDollars).toBeLessThan(0);
      expect(fin.marginTier).toBe('low');
    });

    it('flags payment hold active if overdue or on hold', () => {
      const overdueProj = {
        id: 'proj_hold',
        name: 'Overdue Client',
        monthlyPrice: 3000,
        paymentStatus: 'Overdue',
        members: []
      };
      const fin = calculateProjectFinancials(overdueProj, allMembers);
      expect(fin.paymentHoldActive).toBe(true);
    });
  });
});
