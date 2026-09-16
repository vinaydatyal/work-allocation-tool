import type {
  ProjectIntakeRequest,
  TeamMember,
  Task,
  ProjectAllocationProposal,
  SquadProposalItem,
  AlternativeCandidate
} from '../types';
import { calculateMemberAllocatedHours } from './matchingEngine';

export function generateProjectProposal(
  project: ProjectIntakeRequest,
  teamMembers: TeamMember[],
  existingTasks: Task[]
): ProjectAllocationProposal {
  // Track cumulative temporary allocated hours during proposal build
  const tempAllocatedHours: Record<string, number> = {};
  teamMembers.forEach((m) => {
    tempAllocatedHours[m.id] = calculateMemberAllocatedHours(m.id, existingTasks);
  });

  const proposalItems: SquadProposalItem[] = [];
  let hasOverloadRisk = false;

  project.blocks.forEach((block) => {
    // Score all members for this block
    const candidates: AlternativeCandidate[] = teamMembers.map((member) => {
      const skillScore = member.skillScores.find((s) => s.skill === block.skill);
      const qualityScore = skillScore ? skillScore.quality : 5.0;
      const speedScore = skillScore ? skillScore.speedEfficiency : 5.0;
      const commScore = skillScore ? skillScore.communication : 5.0;

      const baseFit = qualityScore * 0.5 + speedScore * 0.3 + commScore * 0.2;

      const currentBooked = tempAllocatedHours[member.id] || 0;
      const availableBefore = Number((member.weeklyCapacityHours - currentBooked).toFixed(1));
      const remainingAfter = Number((availableBefore - block.hours).toFixed(1));
      const isOverloadedAfter = remainingAfter < 0;

      // Penalize score if assigning pushes them into overload
      let finalScore = baseFit;
      if (isOverloadedAfter) {
        finalScore -= Math.min(4.0, Math.abs(remainingAfter) * 0.4);
      } else if (availableBefore >= block.hours) {
        finalScore += 0.5; // Bonus for healthy buffer
      }

      const hasSkillBadge = member.skills.includes(block.skill);
      if (!hasSkillBadge) {
        finalScore -= 2.5; // Penalty if not their listed primary skill
      }

      if (block.preferredSeniority && member.seniority === block.preferredSeniority) {
        finalScore += 1.2; // Bonus if matches requested seniority tier
      }

      const clientTier = block.clientTier || project.clientTier;
      const isSenior = ['Senior', 'Lead', 'Manager', 'Head', 'Director', 'CEO'].some((s) => member.seniority.includes(s) || member.role.includes(s));
      const isTier1Lead = member.generalCompetency?.clientReadyTier.includes('Tier 1');
      const isTier3Internal = member.generalCompetency?.clientReadyTier.includes('Tier 3');

      if (clientTier === 'TIER_S_VIP') {
        if (isTier1Lead && isSenior) {
          finalScore += 2.2;
        } else if (isTier3Internal) {
          finalScore -= 3.5;
        }
      } else if (clientTier === 'TIER_B_LOCAL') {
        if (isTier3Internal || !isSenior) {
          finalScore += 1.2; // Margin guard: favor cost-effective resources
        } else if (isSenior && isTier1Lead) {
          finalScore -= 0.6; // Reserve senior talent for VIP
        }
      }

      if (project.requiresClientCommunication && member.generalCompetency) {
        if (member.generalCompetency.clientReadyTier.includes('Tier 1')) {
          finalScore += 1.8; // Client-facing lead bonus
        } else if (member.generalCompetency.clientReadyTier.includes('Tier 3')) {
          finalScore -= 3.0; // Heavy penalty if not client-ready
        }
      }

      let justification = '';
      const tierPrefix = clientTier === 'TIER_S_VIP' ? '💎 VIP Lead • ' : clientTier === 'TIER_A_AGENCY' ? '🏢 Agency Pod • ' : '';
      if (isOverloadedAfter) {
        justification = `${tierPrefix}Exceeds capacity by ${Math.abs(remainingAfter)}h (${qualityScore}/10 Quality in ${block.skill}).`;
      } else {
        justification = `${tierPrefix}${qualityScore}/10 Quality in ${block.skill} • Leaves ${remainingAfter}h free capacity buffer.`;
      }

      return {
        member,
        fitScore: Number(Math.max(1, Math.min(10, finalScore)).toFixed(1)),
        qualityScore,
        availableHoursBefore: availableBefore,
        remainingHoursAfter: remainingAfter,
        isOverloadedAfter,
        justification
      };
    });

    // Sort candidates highest fitScore first
    candidates.sort((a, b) => b.fitScore - a.fitScore);

    const chosenCandidate = candidates[0] || {
      member: teamMembers[0],
      fitScore: 5.0,
      qualityScore: 5.0,
      availableHoursBefore: 0,
      remainingHoursAfter: 0,
      isOverloadedAfter: false,
      justification: 'Default assignment'
    };

    if (chosenCandidate.isOverloadedAfter) {
      hasOverloadRisk = true;
    }

    // Update temporary booked hours so subsequent blocks account for this assignment
    tempAllocatedHours[chosenCandidate.member.id] =
      (tempAllocatedHours[chosenCandidate.member.id] || 0) + block.hours;

    proposalItems.push({
      block,
      assignedMember: chosenCandidate.member,
      fitScore: chosenCandidate.fitScore,
      qualityScore: chosenCandidate.qualityScore,
      availableHoursBefore: chosenCandidate.availableHoursBefore,
      remainingHoursAfter: chosenCandidate.remainingHoursAfter,
      isOverloadedAfter: chosenCandidate.isOverloadedAfter,
      justification: chosenCandidate.justification,
      alternatives: candidates.slice(0, 5)
    });
  });

  const totalProjectHours = project.blocks.reduce((sum, b) => sum + b.hours, 0);

  return {
    project,
    items: proposalItems,
    totalProjectHours,
    hasOverloadRisk
  };
}

export function formatClickUpExport(proposal: ProjectAllocationProposal): string {
  const lines: string[] = [
    `# ClickUp Project Allocation Brief: ${proposal.project.projectName}`,
    `Client: ${proposal.project.clientName} | Priority: ${proposal.project.priority}`,
    `Total Package Hours: ${proposal.totalProjectHours}h`,
    `------------------------------------------------------------`,
    `EXECUTIVE SQUAD ASSIGNMENTS (Ready to Paste into ClickUp):`,
    ``
  ];

  proposal.items.forEach((item, idx) => {
    lines.push(
      `${idx + 1}. [TASK] ${item.block.title} (${item.block.skill})`
    );
    lines.push(`   • Assignee: @${item.assignedMember.name} (${item.assignedMember.role})`);
    lines.push(`   • Estimated Time: ${item.block.hours} hrs`);
    lines.push(`   • Fit Rating: ${item.fitScore}/10 | Remaining Bandwidth After: ${item.remainingHoursAfter}h`);
    lines.push(``);
  });

  lines.push(`------------------------------------------------------------`);
  lines.push(`Generated by Smart Work Allocation Hub v2.0 Decision Engine`);
  return lines.join('\n');
}
