import { describe, it, expect } from 'vitest';
import { generateProjectProposal } from '../src/utils/projectAllocationEngine';
import type { TeamMember, ProjectIntakeRequest, Task } from '../src/types';

describe('projectAllocationEngine', () => {
  const mockTeam: TeamMember[] = [
    {
      id: 'spec_1',
      name: 'Elena Rostova',
      role: 'Senior SEO Architect',
      avatar: 'https://example.com/avatar1.jpg',
      seniority: 'Senior',
      skills: ['SEO Technical', 'Architecture'],
      weeklyCapacityHours: 35,
      skillScores: [{ skill: 'SEO Technical', quality: 9, speedEfficiency: 9, communication: 8 }],
      generalCompetency: {
        clientReadyTier: 'Tier 1 - Client Facing',
        englishProficiency: 'Fluent',
        autonomousExecution: 9,
        strategicContribution: 9
      }
    },
    {
      id: 'spec_2',
      name: 'Marcus Vance',
      role: 'Content Specialist',
      avatar: 'https://example.com/avatar2.jpg',
      seniority: 'Mid',
      skills: ['Content Writing'],
      weeklyCapacityHours: 30,
      skillScores: [{ skill: 'Content Writing', quality: 8, speedEfficiency: 8, communication: 8 }],
      generalCompetency: {
        clientReadyTier: 'Tier 2 - Supervised Client',
        englishProficiency: 'Fluent',
        autonomousExecution: 7,
        strategicContribution: 6
      }
    }
  ];

  const existingTasks: Task[] = [];

  it('generates an optimal project proposal for multi-block intake requests', () => {
    const intake: ProjectIntakeRequest = {
      clientName: 'Nexus AI',
      projectName: 'Full Growth Sprint',
      deadline: '2026-10-15',
      clientTier: 'TIER_S_VIP',
      blocks: [
        {
          id: 'b1',
          skill: 'SEO Technical',
          hours: 15,
          preferredSeniority: 'Senior'
        },
        {
          id: 'b2',
          skill: 'Content Writing',
          hours: 10,
          preferredSeniority: 'Mid'
        }
      ]
    };

    const proposal = generateProjectProposal(intake, mockTeam, existingTasks);

    expect(proposal.items.length).toBe(2);
    expect(proposal.items[0].assignedMember.id).toBe('spec_1');
    expect(proposal.items[1].assignedMember.id).toBe('spec_2');
    expect(proposal.totalProjectHours).toBe(25);
    expect(proposal.hasOverloadRisk).toBe(false);
  });

  it('detects overload risk when requested hours exceed specialist capacity', () => {
    const heavyIntake: ProjectIntakeRequest = {
      clientName: 'Overloaded Client',
      projectName: 'Massive Audit',
      deadline: '2026-10-01',
      clientTier: 'TIER_A_AGENCY',
      blocks: [
        {
          id: 'b_heavy',
          skill: 'SEO Technical',
          hours: 50 // Exceeds Elena's 35h capacity
        }
      ]
    };

    const proposal = generateProjectProposal(heavyIntake, mockTeam, existingTasks);
    expect(proposal.hasOverloadRisk).toBe(true);
    expect(proposal.items[0].isOverloadedAfter).toBe(true);
  });
});
