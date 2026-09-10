import {
  InvalidSquadNameError,
  InvalidSquadOwnerError,
  InvalidFormationCodeError,
} from '../errors/squad.errors';

export {
  InvalidSquadNameError,
  InvalidSquadOwnerError,
  InvalidFormationCodeError,
};

export type FormationCode =
  | '4-3-3 Attack'
  | '4-3-3'
  | '4-5-1'
  | '4-1-2-1-2 Wide'
  | '4-2-4'
  | '4-3-3 Defend'
  | '4-3-3 False 9'
  | '4-2-3-1 Narrow'
  | '4-5-1 Flat'
  | '4-3-3 Holding'
  | '4-2-2-2'
  | '4-2-3-1 Wide'
  | '4-3-1-2'
  | '4-1-2-1-2 Narrow'
  | '5-2-2-1'
  | '5-2-1-2'
  | '4-1-4-1'
  | '5-3-2'
  | '4-4-2 Flat'
  | '3-4-3 Flat'
  | '3-4-3 Diamond'
  | '4-4-2 Holding'
  | '4-4-1-1 Attack'
  | '4-4-1-1 Flat'
  | '3-4-1-2'
  | '5-4-1 Holding'
  | '5-4-1 Defend'
  | '3-5-1-1'
  | '3-5-2'
  | '4-3-2-1'
  | '3-4-2-1'
  | '4-2-1-3'
  | '4-1-3-2'
  | '3-1-4-2'
  | '4-4-2'
  | '4-2-3-1'
  | '4-3-3 Flat'
  | '3-4-3';

export type SquadVisibility = 'PRIVATE' | 'PUBLIC';

export const ALLOWED_FORMATION_CODES: readonly FormationCode[] = [
  '4-3-3 Attack',
  '4-3-3',
  '4-5-1',
  '4-1-2-1-2 Wide',
  '4-2-4',
  '4-3-3 Defend',
  '4-3-3 False 9',
  '4-2-3-1 Narrow',
  '4-5-1 Flat',
  '4-3-3 Holding',
  '4-2-2-2',
  '4-2-3-1 Wide',
  '4-3-1-2',
  '4-1-2-1-2 Narrow',
  '5-2-2-1',
  '5-2-1-2',
  '4-1-4-1',
  '5-3-2',
  '4-4-2 Flat',
  '3-4-3 Flat',
  '3-4-3 Diamond',
  '4-4-2 Holding',
  '4-4-1-1 Attack',
  '4-4-1-1 Flat',
  '3-4-1-2',
  '5-4-1 Holding',
  '5-4-1 Defend',
  '3-5-1-1',
  '3-5-2',
  '4-3-2-1',
  '3-4-2-1',
  '4-2-1-3',
  '4-1-3-2',
  '3-1-4-2',
  '4-4-2',
  '4-2-3-1',
  '4-3-3 Flat',
  '3-4-3',
] as const;

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

  public getOwnerId(): string {
    return this.ownerId;
  }

  public getName(): string {
    return this.name;
  }

  public getFormationCode(): string {
    return this.formationCode;
  }

  public getSeasonId(): string | null {
    return this.seasonId ?? null;
  }

  public getDescription(): string | null {
    return this.description ?? null;
  }

  public getVisibility(): SquadVisibility {
    return this.visibility;
  }

  public updateName(name: string): void {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new InvalidSquadNameError();
    }
    this.name = name.trim();
  }

  public updateFormation(formationCode: FormationCode | string): void {
    this.updateFormationCode(formationCode);
  }

  public updateFormationCode(formationCode: FormationCode | string): void {
    if (
      !formationCode ||
      !ALLOWED_FORMATION_CODES.includes(formationCode as any)
    ) {
      throw new InvalidFormationCodeError(
        `Formation code "${formationCode}" is invalid`,
      );
    }
    this.formationCode = formationCode;
  }

  public updateSeasonId(seasonId?: string | null): void {
    this.seasonId = seasonId ? seasonId.trim() : null;
  }

  public updateDescription(description?: string | null): void {
    this.description = description ? description.trim() : null;
  }

  public updateVisibility(visibility: SquadVisibility): void {
    this.visibility = visibility;
  }

  public toJSON() {
    return {
      id: this.id,
      ownerId: this.ownerId,
      seasonId: this.seasonId ?? null,
      name: this.name,
      formationCode: this.formationCode,
      description: this.description ?? null,
      visibility: this.visibility,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private validate(): void {
    if (
      !this.ownerId ||
      typeof this.ownerId !== 'string' ||
      this.ownerId.trim() === ''
    ) {
      throw new InvalidSquadOwnerError();
    }
    if (
      !this.name ||
      typeof this.name !== 'string' ||
      this.name.trim() === ''
    ) {
      throw new InvalidSquadNameError();
    }
    if (
      !this.formationCode ||
      !ALLOWED_FORMATION_CODES.includes(this.formationCode as any)
    ) {
      throw new InvalidFormationCodeError(
        `Formation code "${this.formationCode}" is invalid`,
      );
    }
  }
}
