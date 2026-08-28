export class SquadNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Squad '${identifier}' does not exist`);
    this.name = 'SquadNotFoundError';
  }
}

export class InvalidSquadNameError extends Error {
  constructor(message = 'Squad name is required and cannot be empty') {
    super(message);
    this.name = 'InvalidSquadNameError';
  }
}

export class InvalidSquadOwnerError extends Error {
  constructor(message = 'Squad owner ID is required') {
    super(message);
    this.name = 'InvalidSquadOwnerError';
  }
}

export class InvalidFormationCodeError extends Error {
  constructor(formation: string) {
    super(`Invalid formation code '${formation}'. Allowed formations: 4-3-3, 4-2-3-1, 4-4-2, 3-5-2, 3-4-3`);
    this.name = 'InvalidFormationCodeError';
  }
}

export class InvalidSquadPlayerRoleError extends Error {
  constructor(role: string) {
    super(`Invalid squad player role '${role}'. Allowed roles: STARTER, SUBSTITUTE`);
    this.name = 'InvalidSquadPlayerRoleError';
  }
}

export class PlayerNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Player with id '${identifier}' was not found`);
    this.name = 'PlayerNotFoundError';
  }
}

export class PlayerAlreadyInSquadError extends Error {
  constructor(playerId: string, squadId: string) {
    super(`Player '${playerId}' is already added to squad '${squadId}'`);
    this.name = 'PlayerAlreadyInSquadError';
  }
}

export class PlayerNotInSquadError extends Error {
  constructor(playerId: string, squadId: string) {
    super(`Player '${playerId}' is not in squad '${squadId}'`);
    this.name = 'PlayerNotInSquadError';
  }
}

export class SquadStarterSlotAlreadyOccupiedError extends Error {
  constructor(slotCode: string, squadId: string) {
    super(`Slot '${slotCode}' is already occupied in starter lineup for squad '${squadId}'`);
    this.name = 'SquadStarterSlotAlreadyOccupiedError';
  }
}

export class SquadCaptainAlreadyAssignedError extends Error {
  constructor(squadId: string) {
    super(`A captain is already assigned to squad '${squadId}'`);
    this.name = 'SquadCaptainAlreadyAssignedError';
  }
}

export class CaptainMustBeStarterError extends Error {
  constructor() {
    super('Captain can only be assigned to a STARTER player');
    this.name = 'CaptainMustBeStarterError';
  }
}
