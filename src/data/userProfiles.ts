import type { AppUserProfile } from '../types';

export const appUserProfiles: AppUserProfile[] = [
  // ─── Executive Leadership (CEOs) ──────────────────────────────────────────
  {
    id: 'prof_agam',
    name: 'Agam Grover',
    roleTitle: 'CEO & Co-Founder',
    roleType: 'CEO',
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
    id: 'prof_manpreet',
    name: 'Manpreet S. Nagpal',
    roleTitle: 'CEO & Co-Founder',
    roleType: 'CEO',
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

  // ─── Operations & SEO Management ──────────────────────────────────────────
  {
    id: 'prof_vinay',
    name: 'Vinay Datyal',
    roleTitle: 'SEO Manager & Operations Head',
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

  // ─── Team Leads ───────────────────────────────────────────────────────────
  {
    id: 'prof_khuvaish',
    name: 'Khuvaish',
    roleTitle: 'Team Lead',
    roleType: 'TEAM_LEAD',
    teamId: 'team_khuvaish',
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
    id: 'prof_amrit',
    name: 'Amrit Kaur',
    roleTitle: 'Team Lead',
    roleType: 'TEAM_LEAD',
    teamId: 'team_amrit',
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
    id: 'prof_vansh',
    name: 'Vansh',
    roleTitle: 'Team Lead',
    roleType: 'TEAM_LEAD',
    teamId: 'team_vansh',
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

  // ─── Project Coordinator ──────────────────────────────────────────────────
  {
    id: 'prof_nidhi',
    name: 'Nidhi Verma',
    roleTitle: 'Project Coordinator',
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

  // ─── Technical & Creative Specialists ─────────────────────────────────────
  {
    id: 'prof_anshum',
    name: 'Anshum',
    roleTitle: 'Developer',
    roleType: 'EXECUTIVE',
    teamId: 'team_vansh',
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
  },
  {
    id: 'prof_navjeet',
    name: 'Navjeet kaur',
    roleTitle: 'Designer',
    roleType: 'EXECUTIVE',
    teamId: 'team_vansh',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
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
  },
  {
    id: 'prof_kamakshi',
    name: 'Kamakshi Chopra',
    roleTitle: 'Senior SEO Executive',
    roleType: 'EXECUTIVE',
    teamId: 'team_khuvaish',
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80',
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
  },

  // ─── Campaign & SEO Executives ────────────────────────────────────────────
  {
    id: 'prof_aakash',
    name: 'Aakash',
    roleTitle: 'Executive',
    roleType: 'EXECUTIVE',
    teamId: 'team_amrit',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
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
  },
  {
    id: 'prof_anshita',
    name: 'Anshita',
    roleTitle: 'Executive',
    roleType: 'EXECUTIVE',
    teamId: 'team_khuvaish',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
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
  },
  {
    id: 'prof_anu',
    name: 'Anu Rana',
    roleTitle: 'Executive',
    roleType: 'EXECUTIVE',
    teamId: 'team_amrit',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
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
  },
  {
    id: 'prof_himanshu',
    name: 'Himanshu',
    roleTitle: 'Executive',
    roleType: 'EXECUTIVE',
    teamId: 'team_vansh',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
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
  },
  {
    id: 'prof_komal',
    name: 'Komal',
    roleTitle: 'Executive',
    roleType: 'EXECUTIVE',
    teamId: 'team_khuvaish',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
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
  },
  {
    id: 'prof_neeraj',
    name: 'Neeraj Panwar',
    roleTitle: 'Executive',
    roleType: 'EXECUTIVE',
    teamId: 'team_amrit',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
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
  },
  {
    id: 'prof_raman',
    name: 'Raman',
    roleTitle: 'Executive',
    roleType: 'EXECUTIVE',
    teamId: 'team_vansh',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
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
  },
  {
    id: 'prof_rushali',
    name: 'Rushali Manchanda',
    roleTitle: 'Executive',
    roleType: 'EXECUTIVE',
    teamId: 'team_khuvaish',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
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
  },
  {
    id: 'prof_sahil',
    name: 'Sahil Attri',
    roleTitle: 'Executive',
    roleType: 'EXECUTIVE',
    teamId: 'team_amrit',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
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
  },
  {
    id: 'prof_shubham',
    name: 'Shubham Tisawer',
    roleTitle: 'Executive',
    roleType: 'EXECUTIVE',
    teamId: 'team_vansh',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
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
  },
  {
    id: 'prof_siya',
    name: 'Siya',
    roleTitle: 'Executive',
    roleType: 'EXECUTIVE',
    teamId: 'team_khuvaish',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
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
  },
  {
    id: 'prof_vimla',
    name: 'Vimla Chauhan',
    roleTitle: 'Executive',
    roleType: 'EXECUTIVE',
    teamId: 'team_amrit',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
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
  },
  {
    id: 'prof_vivek',
    name: 'Vivek kumar',
    roleTitle: 'Executive',
    roleType: 'EXECUTIVE',
    teamId: 'team_vansh',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
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
