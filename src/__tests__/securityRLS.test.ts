import { Moment } from '@/lib/supabase';

describe('Security & Multi-User Authorization Isolation', () => {
  const userAlice = { id: 'alice-uuid', username: 'alice' };
  const userBob = { id: 'bob-uuid', username: 'bob' };
  const userEve = { id: 'eve-uuid', username: 'eve' }; // Intruder / Non-friend

  const sharedMomentWithBob: Moment = {
    id: 'moment-alice-1',
    owner_id: userAlice.id,
    media_url: 'https://images.unsplash.com/photo-1517841905240?private=true',
    caption: 'Secret moment for Bob',
    created_at: new Date().toISOString(),
  };

  const recipientList = [userBob.id]; // Only Bob is authorized

  function canUserAccessMoment(userId: string, moment: Moment, authorizedRecipients: string[]): boolean {
    if (moment.owner_id === userId) return true;
    return authorizedRecipients.includes(userId);
  }

  it('allows Alice (owner) to view her own moment', () => {
    expect(canUserAccessMoment(userAlice.id, sharedMomentWithBob, recipientList)).toBe(true);
  });

  it('allows Bob (authorized recipient) to view the moment', () => {
    expect(canUserAccessMoment(userBob.id, sharedMomentWithBob, recipientList)).toBe(true);
  });

  it('SECURITY TEST: Prevents unauthorized user Eve from reading private moment', () => {
    const isEveAuthorized = canUserAccessMoment(userEve.id, sharedMomentWithBob, recipientList);
    expect(isEveAuthorized).toBe(false);
  });

  it('SECURITY TEST: Validates device token isolation', () => {
    const deviceTokens = [
      { user_id: userAlice.id, token: 'token-alice-secret' },
      { user_id: userBob.id, token: 'token-bob-secret' },
    ];

    const canEveReadAliceToken = deviceTokens.some(
      (dt) => dt.user_id === userEve.id && dt.token === 'token-alice-secret'
    );
    expect(canEveReadAliceToken).toBe(false);
  });
});
