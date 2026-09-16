import type {
  TeamMember,
  Task,
  SkillCategory,
  ProjectBriefInput,
  AnalyzedRequirementSlice,
  BriefSliceAssignment,
  BriefSquadProposal,
  AlternativeCandidate
} from '../types';
import { calculateMemberAllocatedHours } from './matchingEngine';

/**
 * Intelligent Project Brief Deconstruction & Squad Matching Engine
 */
export function analyzeProjectBriefAndMatchSquad(
  briefInput: ProjectBriefInput,
  teamMembers: TeamMember[],
  tasks: Task[]
): BriefSquadProposal {
  const text = briefInput.briefDescription.toLowerCase();
  const slices: AnalyzedRequirementSlice[] = [];
  const totalH = briefInput.totalFixedHours || 20;

  // Keyword heuristic extraction
  const hasMigration = text.includes('migrat') || text.includes('technical') || text.includes('audit');
  const hasAeoGeo = text.includes('aeo') || text.includes('geo') || text.includes('ai search') || text.includes('answer engine');
  const hasGuestPost = text.includes('guest') || text.includes('outreach') || text.includes('backlink') || text.includes('offpage');
  const hasDev = text.includes('dev') || text.includes('wordpress') || text.includes('theme') || text.includes('speed');
  const hasRedesign = text.includes('redesign') || text.includes('figma') || text.includes('ui/ux');
  const hasOrm = text.includes('orm') || text.includes('reputation');

  const identifiedCategories: { title: string; skill: SkillCategory; weight: number; reason: string }[] = [];

  if (hasMigration) {
    identifiedCategories.push({
      title: 'Technical Architecture & Site Migration',
      skill: 'Site Migration',
      weight: 0.35,
      reason: 'Detected technical/migration scope requiring senior structural oversight.'
    });
  }
  if (hasAeoGeo) {
    identifiedCategories.push({
      title: 'AEO & GEO AI-Search Content Strategy',
      skill: 'AEO (Answer Engine Opt)',
      weight: 0.35,
      reason: 'Detected AI search & Answer Engine Optimization content requirement.'
    });
  }
  if (hasGuestPost) {
    identifiedCategories.push({
      title: 'High-DR Guest Posting & Authority Acquisition',
      skill: 'Guest Posting',
      weight: 0.25,
      reason: 'Detected link building & guest post distribution scope.'
    });
  }
  if (hasDev) {
    identifiedCategories.push({
      title: 'WordPress Custom Dev & Performance Optimization',
      skill: 'WordPress & Web Dev',
      weight: 0.25,
      reason: 'Detected development/WordPress theme speed remediation scope.'
    });
  }
  if (hasRedesign) {
    identifiedCategories.push({
      title: 'UI/UX Redesign & Conversion Prototyping',
      skill: 'UI/UX & Redesign',
      weight: 0.25,
      reason: 'Detected visual layout redesign and Figma UX scope.'
    });
  }
  if (hasOrm) {
    identifiedCategories.push({
      title: 'Online Reputation Management & Sentiment Defense',
      skill: 'ORM (Reputation Mgmt)',
      weight: 0.25,
      reason: 'Detected brand sentiment and ORM management scope.'
    });
  }

  // Fallback if no specific keyword triggered
  if (identifiedCategories.length === 0) {
    identifiedCategories.push(
      {
        title: 'Full-Stack On-Page & Technical SEO Sprint',
        skill: 'Technical SEO',
        weight: 0.5,
        reason: 'Core SEO structural and on-page optimization.'
      },
      {
        title: 'Content & Keyword Strategy Execution',
        skill: 'On-Page Optimization',
        weight: 0.5,
        reason: 'Content mapping and targeted keyword optimization.'
      }
    );
  }

  // Normalize weights to sum up to totalFixedHours
  const totalWeight = identifiedCategories.reduce((sum, c) => sum + c.weight, 0);
  let allocatedSoFar = 0;

  identifiedCategories.forEach((cat, idx) => {
    let hrs = Math.round((cat.weight / totalWeight) * totalH);
    if (idx === identifiedCategories.length - 1) {
      hrs = totalH - allocatedSoFar;
    } else {
      allocatedSoFar += hrs;
    }
    if (hrs < 2) hrs = 2;

    slices.push({
      id: `slice_${idx}_${Date.now()}`,
      title: cat.title,
      skill: cat.skill,
      recommendedHours: hrs,
      reasoning: cat.reason
    });
  });

  // Match each slice with best squad members
  const assignments: BriefSliceAssignment[] = [];
  let totalAllocatedHours = 0;
  let hasOverloadRisk = false;

  slices.forEach((slice) => {
    totalAllocatedHours += slice.recommendedHours;

    const scoredCandidates = teamMembers.map((member) => {
      const currentAllocated = calculateMemberAllocatedHours(member.id, tasks);
      const availableBefore = member.weeklyCapacityHours - currentAllocated;
      const remainingAfter = availableBefore - slice.recommendedHours;
      const isOverloadedAfter = remainingAfter < 0;

      // Find skill score
      const skScoreObj = member.skillScores.find((s) => s.skill === slice.skill);
      let qualityScore = skScoreObj?.quality || 7.5;

      // Bonus if member explicitly lists this skill
      const hasDirectSkill = member.skills.includes(slice.skill);
      if (hasDirectSkill) qualityScore += 0.8;
      qualityScore = Math.min(10, Number(qualityScore.toFixed(1)));

      let fitScore = qualityScore;

      // Bandwidth fit logic
      if (isOverloadedAfter) {
        fitScore -= Math.abs(remainingAfter) * 1.5;
      } else if (availableBefore >= slice.recommendedHours) {
        fitScore += 1.8;
      }

      // Client Communication & Tier check
      const isSenior = ['Senior', 'Lead', 'Manager', 'Head', 'Director', 'CEO'].some((s) => member.seniority.includes(s) || member.role.includes(s));
      const isTier1Lead = member.generalCompetency?.clientReadyTier.includes('Tier 1');
      const isTier3Internal = member.generalCompetency?.clientReadyTier.includes('Tier 3');

      if (briefInput.clientTier === 'TIER_S_VIP') {
        if (isTier1Lead && isSenior) {
          fitScore += 2.5; // Top VIP priority
        } else if (isTier3Internal) {
          fitScore -= 3.5;
        }
      } else if (briefInput.clientTier === 'TIER_B_LOCAL') {
        if (isTier3Internal || !isSenior) {
          fitScore += 1.5; // Cost-effective staffing
        } else if (isSenior && isTier1Lead) {
          fitScore -= 0.8; // Reserve senior talent for VIP
        }
      }

      if (briefInput.requiresClientCommunication && member.generalCompetency) {
        if (isTier1Lead) {
          fitScore += 2.2;
        } else if (isTier3Internal) {
          fitScore -= 3.5;
        }
      }

      let justification = '';
      const tierTag = briefInput.clientTier === 'TIER_S_VIP' ? '💎 VIP Lead • ' : briefInput.clientTier === 'TIER_A_AGENCY' ? '🏢 Agency Pod • ' : '';
      if (isOverloadedAfter) {
        justification = `${tierTag}Exceeds capacity by ${Math.abs(remainingAfter)}h (${qualityScore}/10 Skill Fit).`;
      } else {
        justification = `${tierTag}${availableBefore}h Free • ${
          member.generalCompetency ? member.generalCompetency.clientReadyTier.split(':')[0] + ' • ' : ''
        }${qualityScore}/10 Skill Proficiency`;
      }

      return {
        member,
        fitScore: Number(fitScore.toFixed(2)),
        qualityScore,
        availableHoursBefore: availableBefore,
        remainingHoursAfter: remainingAfter,
        isOverloadedAfter,
        justification
      };
    });

    scoredCandidates.sort((a, b) => b.fitScore - a.fitScore);
    const primary = scoredCandidates[0];
    const alternatives: AlternativeCandidate[] = scoredCandidates.slice(1, 4).map((c) => ({
      member: c.member,
      fitScore: c.fitScore,
      qualityScore: c.qualityScore,
      availableHoursBefore: c.availableHoursBefore,
      remainingHoursAfter: c.remainingHoursAfter,
      isOverloadedAfter: c.isOverloadedAfter,
      justification: c.justification
    }));

    if (primary.isOverloadedAfter) {
      hasOverloadRisk = true;
    }

    assignments.push({
      slice,
      assignedMember: primary.member,
      fitScore: primary.fitScore,
      qualityScore: primary.qualityScore,
      availableHoursBefore: primary.availableHoursBefore,
      remainingHoursAfter: primary.remainingHoursAfter,
      isOverloadedAfter: primary.isOverloadedAfter,
      justification: primary.justification,
      alternatives
    });
  });

  const summaryRationale = `Analyzed "${briefInput.projectName}" (${totalH} Fixed Hours/wk) into ${
    slices.length
  } specialized task slices. Selected ${
    assignments.filter((a) => !a.isOverloadedAfter).length
  }/${assignments.length} specialists with immediate free bandwidth${
    briefInput.requiresClientCommunication ? ' and Tier-1 Client Readiness' : ''
  }.`;

  return {
    projectInput: briefInput,
    assignments,
    totalAllocatedHours,
    hasOverloadRisk,
    summaryRationale
  };
}
