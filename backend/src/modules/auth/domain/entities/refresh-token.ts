export class RefreshToken {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly tokenHash: string,
    public readonly tokenFamilyId: string | null,
    public readonly expiresAt: Date,
    public lastUsedAt: Date | null = null,
    public revokedAt: Date | null = null,
    public readonly createdAt?: Date,
  ) {}

  revoke(timestamp: Date = new Date()): void {
    this.revokedAt = timestamp;
    this.lastUsedAt = timestamp;
  }

  isExpired(now: Date = new Date()): boolean {
    return now > this.expiresAt;
  }

  isRevoked(): boolean {
    return this.revokedAt !== null;
  }
}
