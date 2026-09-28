import React, { useState } from 'react';
import {
  Zap,
  Key,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import {
  initiateClickUpOAuth,
  setClickUpToken,
  fetchClickUpUser,
  fetchClickUpWorkspaces,
  setClickUpWorkspaceId,
  type ClickUpUser
} from '../services/clickupOAuth';
import type { AppUserProfile, TeamMember } from '../types';

interface ClickUpAuthGatewayProps {
  allProfiles: AppUserProfile[];
  teamMembers: TeamMember[];
  onAuthenticated: (profile: AppUserProfile, defaultRoute?: string) => void;
  onEnterDemoMode: (profile: AppUserProfile, defaultRoute?: string) => void;
  isWhiteTheme?: boolean;
}

export const ClickUpAuthGateway: React.FC<ClickUpAuthGatewayProps> = ({
  allProfiles,
  teamMembers,
  onAuthenticated,
  onEnterDemoMode,
  isWhiteTheme = false
}) => {
  const [authMethod, setAuthMethod] = useState<'oauth' | 'token'>('oauth');
  const [manualToken, setManualToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Helper to match a ClickUp user to an agency profile and determine initial landing view
  const resolveProfileForClickUpUser = (
    cuUser: ClickUpUser
  ): { profile: AppUserProfile; route: string } => {
    const cuName = (cuUser.username || '').toLowerCase().trim();
    const cuEmail = (cuUser.email || '').toLowerCase().trim();

    // 1. Check exact or partial match in appUserProfiles
    const matchedProfile = allProfiles.find((p) => {
      const pName = p.name.toLowerCase().trim();
      return (
        cuName === pName ||
        cuName.includes(pName) ||
        pName.includes(cuName) ||
        (cuEmail && p.name.toLowerCase().split(' ')[0] === cuEmail.split('@')[0])
      );
    });

    if (matchedProfile) {
      let route = '/projects';
      if (matchedProfile.roleType === 'EXECUTIVE') {
        const matchingMember = teamMembers.find(
          (m) => m.name.toLowerCase().includes(matchedProfile.name.toLowerCase()) || matchedProfile.name.toLowerCase().includes(m.name.toLowerCase())
        );
        route = matchingMember ? `/member/${matchingMember.id}` : '/kanban';
      } else if (matchedProfile.roleType === 'TEAM_LEAD') {
        route = '/dsr';
      } else if (matchedProfile.roleType === 'CEO') {
        route = '/war-room';
      }
      return { profile: matchedProfile, route };
    }

    // 2. Check teamMembers
    const matchedMember = teamMembers.find((m) => {
      const mName = m.name.toLowerCase().trim();
      return cuName === mName || cuName.includes(mName) || mName.includes(cuName);
    });

    if (matchedMember) {
      const memberProfile: AppUserProfile = {
        id: `prof_cu_${matchedMember.id}`,
        name: matchedMember.name,
        roleTitle: matchedMember.role,
        roleType: matchedMember.seniority === 'Team Lead' ? 'TEAM_LEAD' : 'EXECUTIVE',
        avatar: cuUser.profilePicture || matchedMember.avatar,
        permissions: {
          canManageRoster: false,
          canAssignTasks: matchedMember.seniority === 'Team Lead',
          canExportPlan: false,
          canCalibrateSkills: matchedMember.seniority === 'Team Lead',
          canManageOrgMap: false,
          canSubmitDSR: true,
          canReviewDSR: matchedMember.seniority === 'Team Lead',
          canApproveDSR: false,
          canViewTeamPresence: true,
          canViewAllTeams: false,
          canViewFinancials: false
        }
      };
      return {
        profile: memberProfile,
        route: `/member/${matchedMember.id}`
      };
    }

    // 3. Fallback: Create dynamic profile from ClickUp user details
    const dynamicProfile: AppUserProfile = {
      id: `prof_cu_${cuUser.id}`,
      name: cuUser.username,
      roleTitle: 'Agency Specialist',
      roleType: 'EXECUTIVE',
      avatar:
        cuUser.profilePicture ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      permissions: {
        canManageRoster: false,
        canAssignTasks: false,
        canExportPlan: false,
        canCalibrateSkills: false,
        canManageOrgMap: false,
        canSubmitDSR: true,
        canReviewDSR: false,
        canApproveDSR: false,
        canViewTeamPresence: true,
        canViewAllTeams: false,
        canViewFinancials: false
      }
    };

    return { profile: dynamicProfile, route: '/kanban' };
  };

  const handleOAuthLogin = () => {
    setErrorMsg(null);
    try {
      initiateClickUpOAuth();
    } catch (err: any) {
      setErrorMsg(
        err.message || 'ClickUp OAuth initialization failed. Check your environment settings.'
      );
    }
  };

  const handleManualTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;

    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const cleanToken = manualToken.trim();
      const cuUser = await fetchClickUpUser(cleanToken);
      if (!cuUser || !cuUser.id) {
        throw new Error('Invalid token. Could not retrieve user profile from ClickUp.');
      }

      setClickUpToken(cleanToken, cuUser.username);

      // Auto-discover workspace
      try {
        const wsList = await fetchClickUpWorkspaces(cleanToken);
        if (wsList && wsList.length > 0) {
          setClickUpWorkspaceId(wsList[0].id);
        }
      } catch (wsErr) {
        console.warn('Workspace discovery fallback:', wsErr);
      }

      const { profile, route } = resolveProfileForClickUpUser(cuUser);
      onAuthenticated(profile, route);
    } catch (err: any) {
      console.error('ClickUp token verification error:', err);
      setErrorMsg(err.message || 'Failed to authenticate with ClickUp. Verify your API token.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDemoSelect = (pId: string) => {
    const selected = allProfiles.find((p) => p.id === pId) || allProfiles[0];
    let route = '/projects';
    if (selected.roleType === 'EXECUTIVE') {
      const matchingMember = teamMembers.find(
        (m) => m.name.toLowerCase().includes(selected.name.toLowerCase()) || selected.name.toLowerCase().includes(m.name.toLowerCase())
      );
      route = matchingMember ? `/member/${matchingMember.id}` : '/kanban';
    } else if (selected.roleType === 'TEAM_LEAD') {
      route = '/dsr';
    } else if (selected.roleType === 'CEO') {
      route = '/war-room';
    }
    onEnterDemoMode(selected, route);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 sm:p-6 transition-colors duration-300 ${
      isWhiteTheme ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-white'
    }`}>
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-600/10 via-purple-600/15 to-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className={`relative w-full max-w-xl rounded-3xl border shadow-2xl p-6 sm:p-10 space-y-8 backdrop-blur-xl ${
        isWhiteTheme
          ? 'bg-white/95 border-slate-200/80 shadow-slate-200/50'
          : 'bg-slate-900/90 border-slate-800 shadow-cyan-950/20'
      }`}>
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-blue-500/10 border border-purple-500/20 text-purple-400">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Digital Leap • Enterprise Resource Allocation</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2.5">
            <span className="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              ClickUp Gateway
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Connect your agency ClickUp account to securely authenticate, sync your deliverables, and open your personalized role workspace.
          </p>
        </div>

        {/* Auth Method Tabs */}
        <div className="flex rounded-2xl bg-slate-950/80 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setAuthMethod('oauth');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              authMethod === 'oauth'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>1-Click OAuth 2.0</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMethod('token');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              authMethod === 'token'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Personal API Token</span>
          </button>
        </div>

        {/* Error Notice */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-snug">{errorMsg}</div>
          </div>
        )}

        {/* Tab 1: OAuth Action */}
        {authMethod === 'oauth' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-bold text-white">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Automatic Role & Pod Detection</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Authorizing with ClickUp immediately retrieves your profile, matches your specialist pod or executive tier, and opens your corresponding workspace (Master Projects, Pod DSR Review, or Personal Sprints).
              </p>
            </div>

            <button
              type="button"
              onClick={handleOAuthLogin}
              className="w-full py-3.5 px-6 rounded-2xl font-black text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>Sign in with ClickUp Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab 2: Manual API Token */}
        {authMethod === 'token' && (
          <form onSubmit={handleManualTokenSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>ClickUp Personal API Token</span>
                <span className="text-[10px] text-slate-500 font-mono">pk_...</span>
              </label>
              <input
                type="password"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Paste your ClickUp token (pk_1234567_...)"
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-cyan-500 transition-colors"
                disabled={isVerifying}
                required
              />
              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                <HelpCircle className="w-3 h-3" />
                <span>Found in ClickUp: Settings ➔ Apps ➔ API Token ➔ Generate</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={isVerifying || !manualToken.trim()}
              className="w-full py-3.5 px-6 rounded-2xl font-black text-sm text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <span className="animate-spin w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full" />
                  <span>Verifying ClickUp Account...</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>Authenticate & Launch Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Demo Mode / Sandbox Personas */}
        <div className="pt-6 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Or Explore in Preview Sandbox</span>
            </span>
            <span className="text-[10px] text-slate-500">Test role views</span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => handleDemoSelect('prof_vinay')}
              className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 text-left transition-all group cursor-pointer"
            >
              <div className="text-[11px] font-bold text-white group-hover:text-amber-300 truncate">
                Vinay Datyal
              </div>
              <div className="text-[9px] text-slate-500 truncate">Operations Head</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoSelect('prof_agam')}
              className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 text-left transition-all group cursor-pointer"
            >
              <div className="text-[11px] font-bold text-white group-hover:text-emerald-300 truncate">
                Agam Grover
              </div>
              <div className="text-[9px] text-slate-500 truncate">CEO / Co-Founder</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoSelect('prof_khuvaish')}
              className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group cursor-pointer"
            >
              <div className="text-[11px] font-bold text-white group-hover:text-cyan-300 truncate">
                Khuvaish
              </div>
              <div className="text-[9px] text-slate-500 truncate">Team Lead</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoSelect('prof_anshum')}
              className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-purple-500/40 text-left transition-all group cursor-pointer"
            >
              <div className="text-[11px] font-bold text-white group-hover:text-purple-300 truncate">
                Anshum S.
              </div>
              <div className="text-[9px] text-slate-500 truncate">Specialist Pod</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
