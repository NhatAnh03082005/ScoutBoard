export class ShortlistNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Shortlist '${identifier}' does not exist`);
    this.name = 'ShortlistNotFoundError';
  }
}

export class InvalidShortlistNameError extends Error {
  constructor(message = 'Shortlist name is required and cannot be empty') {
    super(message);
    this.name = 'InvalidShortlistNameError';
  }
}

export class InvalidShortlistOwnerError extends Error {
  constructor(message = 'Shortlist owner ID is required') {
    super(message);
    this.name = 'InvalidShortlistOwnerError';
  }
}

export class PlayerNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Player with id '${identifier}' was not found`);
    this.name = 'PlayerNotFoundError';
  }
}

export class PlayerAlreadyInShortlistError extends Error {
  constructor(playerId: string, shortlistId: string) {
    super(`Player '${playerId}' is already added to shortlist '${shortlistId}'`);
    this.name = 'PlayerAlreadyInShortlistError';
  }
}

export class PlayerNotInShortlistError extends Error {
  constructor(playerId: string, shortlistId: string) {
    super(`Player '${playerId}' is not in shortlist '${shortlistId}'`);
    this.name = 'PlayerNotInShortlistError';
  }
}
