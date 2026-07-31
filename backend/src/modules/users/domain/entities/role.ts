export class Role {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly name: string,
    public readonly createdAt?: Date,
  ) {}
}
