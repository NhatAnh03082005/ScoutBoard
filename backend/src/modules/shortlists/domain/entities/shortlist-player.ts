export class ShortlistPlayer {
  constructor(
    public readonly id: string,
    public readonly shortlistId: string,
    public readonly playerId: string,
    private note: string | null = null,
    public readonly addedAt?: Date,
  ) {}

  getNote(): string | null {
    return this.note;
  }

  updateNote(newNote: string | null): void {
    this.note =
      newNote !== undefined && newNote !== null ? newNote.trim() : null;
  }

  toJSON() {
    return {
      id: this.id,
      shortlistId: this.shortlistId,
      playerId: this.playerId,
      note: this.note,
      addedAt: this.addedAt,
    };
  }
}
