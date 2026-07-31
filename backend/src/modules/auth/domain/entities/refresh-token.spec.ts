import { RefreshToken } from './refresh-token';

describe('RefreshToken Domain Entity', () => {
  it('should evaluate expiry correctly', () => {
    const futureDate = new Date(Date.now() + 3600000);
    const pastDate = new Date(Date.now() - 3600000);

    const validToken = new RefreshToken('t1', 'u1', 'hash1', null, futureDate);
    const expiredToken = new RefreshToken('t2', 'u1', 'hash2', null, pastDate);

    expect(validToken.isExpired()).toBe(false);
    expect(expiredToken.isExpired()).toBe(true);
  });

  it('should revoke token and record timestamps', () => {
    const token = new RefreshToken(
      't1',
      'u1',
      'hash1',
      'family-1',
      new Date(Date.now() + 3600000),
    );

    expect(token.isRevoked()).toBe(false);

    token.revoke();
    expect(token.isRevoked()).toBe(true);
    expect(token.revokedAt).toBeInstanceOf(Date);
    expect(token.lastUsedAt).toBeInstanceOf(Date);
  });
});
