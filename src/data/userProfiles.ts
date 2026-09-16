import type { AppUserProfile } from '../types';

export const appUserProfiles: AppUserProfile[] = [
  {
    id: 'prof_admin',
    name: 'You (SEO Manager)',
    roleTitle: 'Lead SEO Manager & Strategy Head',
    roleType: 'ADMIN',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    permissions: {
      canManageRoster: true, // Add/edit specialists
      canAssignTasks: true,
      canExportPlan: true,
      canCalibrateSkills: true // Calibrate quality & communication scores
    }
  },
  {
    id: 'prof_nidhi',
    name: 'Nidhi',
    roleTitle: 'Project Coordinator & Operations Lead',
    roleType: 'COORDINATOR',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    permissions: {
      canManageRoster: false, // Read-only roster view
      canAssignTasks: true, // Primary owner of AI Smart Match & Dispatch
      canExportPlan: true,
      canCalibrateSkills: false // Locked for SEO Manager
    }
  }
];
