import type { AppUserProfile } from '../types';

export const appUserProfiles: AppUserProfile[] = [
  {
    id: 'prof_exec_agam',
    name: 'Agam Grover',
    roleTitle: 'CEO & Co-Founder',
    roleType: 'EXECUTIVE',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    permissions: {
      canManageRoster: false,
      canAssignTasks: false,
      canExportPlan: true,
      canCalibrateSkills: false,
      canManageOrgMap: false,
      canSubmitDSR: false,
      canReviewDSR: false,
      canApproveDSR: false,
      canViewTeamPresence: true,
      canViewAllTeams: true,
      canViewFinancials: true
    }
  },
  {
    id: 'prof_exec_manpreet',
    name: 'Manpreet S. Nagpal',
    roleTitle: 'CEO & Co-Founder',
    roleType: 'EXECUTIVE',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    permissions: {
      canManageRoster: false,
      canAssignTasks: false,
      canExportPlan: true,
      canCalibrateSkills: false,
      canManageOrgMap: false,
      canSubmitDSR: false,
      canReviewDSR: false,
      canApproveDSR: false,
      canViewTeamPresence: true,
      canViewAllTeams: true,
      canViewFinancials: true
    }
  },
  {
    id: 'prof_pm',
    name: 'Vinay Datyal (Project Manager)',
    roleTitle: 'Agency Operations Manager & Strategy Head',
    roleType: 'PROJECT_MANAGER',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    permissions: {
      canManageRoster: true,
      canAssignTasks: true,
      canExportPlan: true,
      canCalibrateSkills: true,
      canManageOrgMap: true,
      canSubmitDSR: false,
      canReviewDSR: true,
      canApproveDSR: true,
      canViewTeamPresence: true,
      canViewAllTeams: true,
      canViewFinancials: true
    }
  },
  {
    id: 'prof_lead_khuvaish',
    name: 'Khuvaish',
    roleTitle: 'Senior Strategy Team Lead (Strategy Pod)',
    roleType: 'TEAM_LEAD',
    teamId: 'team_strategy',
    managedMemberIds: ['usr_priya', 'usr_abhishek'],
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    permissions: {
      canManageRoster: false,
      canAssignTasks: true,
      canExportPlan: false,
      canCalibrateSkills: true,
      canManageOrgMap: false,
      canSubmitDSR: false,
      canReviewDSR: true,
      canApproveDSR: false,
      canViewTeamPresence: true,
      canViewAllTeams: false,
      canViewFinancials: false
    }
  },
  {
    id: 'prof_lead_amrit',
    name: 'Amrit Kaur',
    roleTitle: 'SEO & Delivery Team Lead (Delivery Pod)',
    roleType: 'TEAM_LEAD',
    teamId: 'team_delivery',
    managedMemberIds: ['usr_aakash', 'usr_akhil', 'usr_rahul'],
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    permissions: {
      canManageRoster: false,
      canAssignTasks: true,
      canExportPlan: false,
      canCalibrateSkills: true,
      canManageOrgMap: false,
      canSubmitDSR: false,
      canReviewDSR: true,
      canApproveDSR: false,
      canViewTeamPresence: true,
      canViewAllTeams: false,
      canViewFinancials: false
    }
  },
  {
    id: 'prof_lead_vansh',
    name: 'Vansh',
    roleTitle: 'Web & Tech Team Lead (Web & Tech Pod)',
    roleType: 'TEAM_LEAD',
    teamId: 'team_web',
    managedMemberIds: [],
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    permissions: {
      canManageRoster: false,
      canAssignTasks: true,
      canExportPlan: false,
      canCalibrateSkills: true,
      canManageOrgMap: false,
      canSubmitDSR: false,
      canReviewDSR: true,
      canApproveDSR: false,
      canViewTeamPresence: true,
      canViewAllTeams: false,
      canViewFinancials: false
    }
  },
  {
    id: 'prof_coord_nidhi',
    name: 'Nidhi',
    roleTitle: 'Project Coordinator & Operations Lead',
    roleType: 'COORDINATOR',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    permissions: {
      canManageRoster: false,
      canAssignTasks: true,
      canExportPlan: false,
      canCalibrateSkills: false,
      canManageOrgMap: false,
      canSubmitDSR: true,
      canReviewDSR: false,
      canApproveDSR: false,
      canViewTeamPresence: false,
      canViewAllTeams: false,
      canViewFinancials: false
    }
  },
  {
    id: 'prof_member_specialist',
    name: 'Rahul (Specialist)',
    roleTitle: 'SEO & Delivery Specialist',
    roleType: 'MEMBER',
    teamId: 'team_delivery',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    permissions: {
      canManageRoster: false,
      canAssignTasks: false,
      canExportPlan: false,
      canCalibrateSkills: false,
      canManageOrgMap: false,
      canSubmitDSR: true,
      canReviewDSR: false,
      canApproveDSR: false,
      canViewTeamPresence: false,
      canViewAllTeams: false,
      canViewFinancials: false
    }
  }
];
