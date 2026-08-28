import { InvalidSquadPlayerRoleError } from '../errors/squad.errors';

export type SquadPlayerRole = 'STARTER' | 'SUBSTITUTE';

export const ALLOWED_SQUAD_PLAYER_ROLES = ['STARTER', 'SUBSTITUTE'] as const;

export class SquadPlayer {
  constructor(
    public readonly id: string,
    public readonly squadId: string,
    public readonly playerId: string,
    private slotCode: string | null = null,
    private role: SquadPlayerRole | string = 'STARTER',
    private isCaptain: boolean = false,
    private displayOrder: number | null = null,
    public readonly addedAt?: Date,
  ) {
    this.validate();
  }

  private validate(): void {
    if (
      !this.role ||
      !ALLOWED_SQUAD_PLAYER_ROLES.includes(this.role as SquadPlayerRole)
    ) {
      throw new InvalidSquadPlayerRoleError(String(this.role));
    }
  }

  getSlotCode(): string | null {
    return this.slotCode;
  }

  getRole(): SquadPlayerRole | string {
    return this.role;
  }

  getIsCaptain(): boolean {
    return this.isCaptain;
  }

  getDisplayOrder(): number | null {
    return this.displayOrder;
  }

  updateSlotCode(newSlotCode: string | null): void {
    this.slotCode = newSlotCode ? newSlotCode.trim() : null;
  }

  updateRole(newRole: SquadPlayerRole | string): void {
    if (
      !newRole ||
      !ALLOWED_SQUAD_PLAYER_ROLES.includes(newRole as SquadPlayerRole)
    ) {
      throw new InvalidSquadPlayerRoleError(String(newRole));
    }
    this.role = newRole;
  }

  setCaptain(isCaptain: boolean): void {
    this.isCaptain = !!isCaptain;
  }

  updateDisplayOrder(newDisplayOrder: number | null): void {
    this.displayOrder = newDisplayOrder;
  }

  toJSON() {
    return {
      id: this.id,
      squadId: this.squadId,
      playerId: this.playerId,
      slotCode: this.slotCode,
      role: this.role,
      isCaptain: this.isCaptain,
      displayOrder: this.displayOrder,
      addedAt: this.addedAt,
    };
  }
}
