import type { TeamMember, Task, MatchCandidateResult } from '../types';

export function calculateMemberAllocatedHours(memberId: string, tasks: Task[]): number {
  return tasks
    .filter((t) => t.assignedUserId === memberId && t.status !== 'completed')
    .reduce((sum, t) => sum + Math.max(t.estimatedHours, t.actualHoursLogged), 0);
}

export function rankCandidatesForTask(
  task: Task,
  teamMembers: TeamMember[],
  allTasks: Task[]
): MatchCandidateResult[] {
  const results: MatchCandidateResult[] = [];

  for (const member of teamMembers) {
    const allocatedHours = calculateMemberAllocatedHours(member.id, allTasks);
    const availableHours = Number((member.weeklyCapacityHours - allocatedHours).toFixed(1));
    const isOverloaded = availableHours < task.estimatedHours;

    const skillScoreObj = member.skillScores.find((s) => s.skill === task.requiredSkill);
    const hasSkillTag = member.skills.includes(task.requiredSkill);

    if (!hasSkillTag && !skillScoreObj) {
      continue;
    }

    const qualityScore = skillScoreObj ? skillScoreObj.quality : 7.5;
    const speedFactor = skillScoreObj ? skillScoreObj.speedEfficiency : 7.5;
    const commScore = skillScoreObj ? skillScoreObj.communication : 7.5;

    let baseFitScore = qualityScore * 0.5 + speedFactor * 0.3 + commScore * 0.2;

    const bandwidthBufferPercent = Math.max(
      0,
      Math.round(((availableHours - task.estimatedHours) / member.weeklyCapacityHours) * 100)
    );

    if (availableHours >= task.estimatedHours) {
      baseFitScore += 0.3;
    } else {
      baseFitScore -= 2.5;
    }

    // --- VIP TALENT GUARD & CLIENT TIER OPTIMIZATION ---
    let tierNote = '';
    const isSenior = ['Senior', 'Lead', 'Manager', 'Head', 'Director', 'CEO'].some((s) => member.seniority.includes(s) || member.role.includes(s));
    const isTier1Lead = member.generalCompetency?.clientReadyTier.includes('Tier 1');
    const isTier3Internal = member.generalCompetency?.clientReadyTier.includes('Tier 3');

    if (task.clientTier === 'TIER_S_VIP') {
      if (isTier1Lead && isSenior) {
        baseFitScore += 2.0; // VIP Elite match bonus
        tierNote = ' • 💎 VIP Guard: Elite Senior Lead Match';
      } else if (isTier1Lead || isSenior) {
        baseFitScore += 1.0;
        tierNote = ' • 💎 VIP Guard: Recommended Senior';
      } else if (isTier3Internal) {
        baseFitScore -= 3.0; // Restrict Tier 3 from sole VIP allocation
        tierNote = ' • ⚠️ VIP Guard: Internal only (requires senior lead)';
      }
    } else if (task.clientTier === 'TIER_A_AGENCY') {
      if (speedFactor >= 8.5) baseFitScore += 1.2; // Fast turn-around for agency pods
      if (!isTier3Internal) baseFitScore += 0.8;
      tierNote = ' • 🏢 Agency SLA Priority';
    } else if (task.clientTier === 'TIER_B_LOCAL') {
      // For local budget tasks, favor Tier 3 / Junior specialists to protect high-margin senior bandwidth
      if (isTier3Internal || !isSenior) {
        baseFitScore += 1.2; // Margin-optimized allocation
        tierNote = ' • 📍 Margin Guard: Cost-Effective Staffing';
      } else if (isSenior && isTier1Lead) {
        baseFitScore -= 0.5; // Mild penalty to avoid burning senior hours on low-ticket tasks
        tierNote = ' • ℹ️ High-cost resource on budget task';
      }
    }

    const fitScore = Number(Math.max(1.0, Math.min(10.0, baseFitScore)).toFixed(1));

    let justification = '';
    if (availableHours >= task.estimatedHours) {
      justification = `${member.name} has elite proficiency in ${task.requiredSkill} (Quality: ${qualityScore}/10, Speed: ${speedFactor}/10) with ${availableHours} hrs open capacity this week.${tierNote}`;
    } else {
      justification = `High skill match (${qualityScore}/10), but assigning this ${task.estimatedHours}h task would exceed weekly capacity by ${Math.abs(availableHours - task.estimatedHours).toFixed(1)} hrs (Overload Risk).${tierNote}`;
    }

    results.push({
      member,
      fitScore,
      qualityScore,
      speedFactor,
      bandwidthBufferPercent,
      availableHours,
      isOverloaded,
      justification,
      rank: 0
    });
  }

  results.sort((a, b) => {
    if (a.isOverloaded !== b.isOverloaded) {
      return a.isOverloaded ? 1 : -1;
    }
    return b.fitScore - a.fitScore;
  });

  results.forEach((r, idx) => {
    r.rank = idx + 1;
  });

  return results;
}
