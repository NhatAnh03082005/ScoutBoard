import {
  InvalidShortlistNameError,
  InvalidShortlistOwnerError,
} from '../errors/shortlist.errors';

export type ShortlistVisibility = 'PRIVATE' | 'PUBLIC';

export class Shortlist {
  constructor(
    public readonly id: string,
    private ownerId: string,
    private name: string,
    private description: string | null = null,
    private visibility: ShortlistVisibility = 'PRIVATE',
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {
    this.validate();
    this.name = this.name ? this.name.trim() : '';
  }

  private validate(): void {
    if (
      !this.ownerId ||
      typeof this.ownerId !== 'string' ||
      this.ownerId.trim() === ''
    ) {
      throw new InvalidShortlistOwnerError();
    }

    if (
      !this.name ||
      typeof this.name !== 'string' ||
      this.name.trim() === ''
    ) {
      throw new InvalidShortlistNameError();
    }
  }

  getOwnerId(): string {
    return this.ownerId;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string | null {
    return this.description;
  }

  getVisibility(): ShortlistVisibility {
    return this.visibility;
  }

  updateName(newName: string): void {
    if (!newName || typeof newName !== 'string' || newName.trim() === '') {
      throw new InvalidShortlistNameError();
    }
    this.name = newName.trim();
  }

  updateDescription(newDescription: string | null): void {
    this.description = newDescription ? newDescription.trim() : null;
  }

  updateVisibility(newVisibility: ShortlistVisibility): void {
    this.visibility = newVisibility;
  }

  toJSON() {
    return {
      id: this.id,
      ownerId: this.ownerId,
      name: this.name,
      description: this.description,
      visibility: this.visibility,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
