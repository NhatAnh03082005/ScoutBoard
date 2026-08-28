import {
  InvalidSquadNameError,
  InvalidSquadOwnerError,
  InvalidFormationCodeError,
} from '../errors/squad.errors';

export type SquadVisibility = 'PRIVATE' | 'PUBLIC';

export const ALLOWED_FORMATION_CODES = [
  '4-3-3',
  '4-2-3-1',
  '4-4-2',
  '3-5-2',
  '3-4-3',
] as const;

export type FormationCode = typeof ALLOWED_FORMATION_CODES[number];

export class Squad {
  constructor(
    public readonly id: string,
    private ownerId: string,
    private name: string,
    private formationCode: FormationCode | string,
    private seasonId: string | null = null,
    private description: string | null = null,
    private visibility: SquadVisibility = 'PRIVATE',
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {
    this.validate();
    this.name = this.name ? this.name.trim() : '';
  }

  private validate(): void {
    if (!this.ownerId || typeof this.ownerId !== 'string' || this.ownerId.trim() === '') {
      throw new InvalidSquadOwnerError();
    }

    if (!this.name || typeof this.name !== 'string' || this.name.trim() === '') {
      throw new InvalidSquadNameError();
    }

    if (
      !this.formationCode ||
      !ALLOWED_FORMATION_CODES.includes(this.formationCode as FormationCode)
    ) {
      throw new InvalidFormationCodeError(String(this.formationCode));
    }
  }

  getOwnerId(): string {
    return this.ownerId;
  }

  getName(): string {
    return this.name;
  }

  getFormationCode(): FormationCode | string {
    return this.formationCode;
  }

  getSeasonId(): string | null {
    return this.seasonId;
  }

  getDescription(): string | null {
    return this.description;
  }

  getVisibility(): SquadVisibility {
    return this.visibility;
  }

  updateName(newName: string): void {
    if (!newName || typeof newName !== 'string' || newName.trim() === '') {
      throw new InvalidSquadNameError();
    }
    this.name = newName.trim();
  }

  updateFormationCode(newFormationCode: FormationCode | string): void {
    if (
      !newFormationCode ||
      !ALLOWED_FORMATION_CODES.includes(newFormationCode as FormationCode)
    ) {
      throw new InvalidFormationCodeError(String(newFormationCode));
    }
    this.formationCode = newFormationCode;
  }

  updateSeasonId(newSeasonId: string | null): void {
    this.seasonId = newSeasonId || null;
  }

  updateDescription(newDescription: string | null): void {
    this.description = newDescription ? newDescription.trim() : null;
  }

  updateVisibility(newVisibility: SquadVisibility): void {
    this.visibility = newVisibility;
  }

  toJSON() {
    return {
      id: this.id,
      ownerId: this.ownerId,
      seasonId: this.seasonId,
      name: this.name,
      formationCode: this.formationCode,
      description: this.description,
      visibility: this.visibility,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
