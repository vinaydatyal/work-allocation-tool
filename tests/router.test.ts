import { describe, it, expect } from 'vitest';
import { parseRoute } from '../src/utils/router';

describe('router', () => {
  it('parses root path as projects route', () => {
    const res = parseRoute('/');
    expect(res.route).toBe('projects');
  });

  it('parses standard routes correctly', () => {
    expect(parseRoute('/calendar').route).toBe('calendar');
    expect(parseRoute('/hours').route).toBe('hours');
    expect(parseRoute('/war-room').route).toBe('war-room');
    expect(parseRoute('/planning').route).toBe('war-room');
    expect(parseRoute('/hiring').route).toBe('matrix');
  });

  it('parses member route with memberId and sub-tab', () => {
    const res = parseRoute('/member/mem_123/activity');
    expect(res.route).toBe('member');
    expect(res.memberId).toBe('mem_123');
    expect(res.memberTab).toBe('activity');
  });

  it('defaults memberTab to projects when not specified or invalid', () => {
    const res = parseRoute('/member/mem_456');
    expect(res.route).toBe('member');
    expect(res.memberId).toBe('mem_456');
    expect(res.memberTab).toBe('projects');
  });

  it('preserves query search parameters', () => {
    const res = parseRoute('/projects', '?filter=active');
    expect(res.route).toBe('projects');
    expect(res.search).toBe('?filter=active');
  });
});
