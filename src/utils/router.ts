import { useState, useEffect, useCallback } from 'react';

export type AppRoute =
  | 'projects'
  | 'calendar'
  | 'hours'
  | 'dsr'
  | 'skills'
  | 'bot'
  | 'finances'
  | 'notifications'
  | 'brief'
  | 'war-room'
  | 'wizard'
  | 'testing'
  | 'macro'
  | 'timeline'
  | 'backlog'
  | 'kanban'
  | 'roster'
  | 'matrix'
  | 'hiring'
  | 'member'
  | 'unknown';

export interface RouteState {
  path: string;
  route: AppRoute;
  memberId?: string;
  memberTab?: 'projects' | 'tasks' | 'skills' | 'activity';
  search: string;
}

const ROUTE_MAP: Record<string, AppRoute> = {
  '': 'projects',
  'projects': 'projects',
  'calendar': 'calendar',
  'hours': 'hours',
  'dsr': 'dsr',
  'skills': 'skills',
  'bot': 'bot',
  'finances': 'finances',
  'notifications': 'notifications',
  'brief': 'brief',
  'war-room': 'war-room',
  'planning': 'war-room',
  'cockpit': 'war-room',
  'matrix': 'matrix',
  'hiring': 'matrix',
  'skill-gap': 'matrix',
  'skills-matrix': 'matrix',
  'wizard': 'wizard',
  'testing': 'testing',
  'macro': 'macro',
  'timeline': 'timeline',
  'backlog': 'backlog',
  'kanban': 'kanban',
  'roster': 'roster'
};

export function parseRoute(pathname: string, search: string = ''): RouteState {
  const cleanPath = pathname.replace(/^\/+|\/+$/g, '');
  const segments = cleanPath.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { path: '/', route: 'projects', search };
  }

  const firstSeg = segments[0].toLowerCase();

  // Member profile route: /member/:id or /member/:id/:tab or /profile/:id
  if (firstSeg === 'member' || firstSeg === 'profile') {
    const memberId = segments[1] ? decodeURIComponent(segments[1]) : undefined;
    const tabSegment = segments[2]?.toLowerCase();
    const validTabs: ('projects' | 'tasks' | 'skills' | 'activity')[] = ['projects', 'tasks', 'skills', 'activity'];
    const memberTab = validTabs.includes(tabSegment as any) ? (tabSegment as any) : 'projects';

    return {
      path: pathname,
      route: 'member',
      memberId,
      memberTab,
      search
    };
  }

  const route = ROUTE_MAP[firstSeg] || 'projects';
  return {
    path: pathname,
    route,
    search
  };
}

const NAVIGATE_EVENT = 'app:navigate';

export function navigate(path: string, options: { replace?: boolean } = {}) {
  if (typeof window === 'undefined') return;

  const current = window.location.pathname + window.location.search;
  if (current === path) return;

  if (options.replace) {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
  }

  window.dispatchEvent(new CustomEvent(NAVIGATE_EVENT, { detail: { path } }));
}

export function useAppRouter() {
  const [routeState, setRouteState] = useState<RouteState>(() => {
    if (typeof window === 'undefined') {
      return { path: '/', route: 'projects', search: '' };
    }
    return parseRoute(window.location.pathname, window.location.search);
  });

  useEffect(() => {
    const handlePopState = () => {
      setRouteState(parseRoute(window.location.pathname, window.location.search));
    };

    const handleCustomNavigate = () => {
      setRouteState(parseRoute(window.location.pathname, window.location.search));
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener(NAVIGATE_EVENT, handleCustomNavigate);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener(NAVIGATE_EVENT, handleCustomNavigate);
    };
  }, []);

  const goTo = useCallback((path: string, options?: { replace?: boolean }) => {
    navigate(path, options);
  }, []);

  return {
    ...routeState,
    navigate: goTo
  };
}
