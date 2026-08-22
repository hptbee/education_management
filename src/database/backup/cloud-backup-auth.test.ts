import { describe, expect, it } from 'vitest';
import { buildUserClassroomStorageKey } from './cloud-backup-auth';

describe('cloud-backup-auth', () => {
  it('builds per-user classroom keys', () => {
    expect(buildUserClassroomStorageKey('usr_abc', '2-7_2026-2027')).toBe(
      'users/usr_abc/classrooms/2-7_2026-2027/database.json',
    );
  });
});
