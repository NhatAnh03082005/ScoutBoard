import { Squad, ALLOWED_FORMATION_CODES } from './squad';
import { SquadPlayer } from './squad-player';
import {
  InvalidSquadNameError,
  InvalidSquadOwnerError,
  InvalidFormationCodeError,
  InvalidSquadPlayerRoleError,
} from '../errors/squad.errors';
import * as fs from 'fs';
import * as path from 'path';

describe('Squad & SquadPlayer Domain Entities (Unit)', () => {
  const validId = '11111111-1111-1111-1111-111111111111';
  const validOwnerId = '22222222-2222-2222-2222-222222222222';
  const validSeasonId = '33333333-3333-3333-3333-333333333333';
  const validName = 'Dream Team EPL 2026';
  const validFormation = '4-3-3';
  const validDescription = 'Attacking tactic focused on high pressing and wing play';
  const createdAt = new Date();
  const updatedAt = new Date();

  describe('Squad Entity', () => {
    it('TC-01: should successfully create a valid Squad domain entity with full parameters', () => {
      const squad = new Squad(
        validId,
        validOwnerId,
        validName,
        validFormation,
        validSeasonId,
        validDescription,
        'PRIVATE',
        createdAt,
        updatedAt,
      );

      expect(squad).toBeInstanceOf(Squad);
      expect(squad.id).toBe(validId);
      expect(squad.getOwnerId()).toBe(validOwnerId);
      expect(squad.getName()).toBe(validName);
      expect(squad.getFormationCode()).toBe('4-3-3');
      expect(squad.getSeasonId()).toBe(validSeasonId);
      expect(squad.getDescription()).toBe(validDescription);
      expect(squad.getVisibility()).toBe('PRIVATE');
      expect(squad.createdAt).toBe(createdAt);
      expect(squad.updatedAt).toBe(updatedAt);
    });

    it('TC-02: should reject missing, empty, or whitespace-only name', () => {
      expect(() => {
        new Squad(validId, validOwnerId, '', validFormation);
      }).toThrow(InvalidSquadNameError);

      expect(() => {
        new Squad(validId, validOwnerId, '   ', validFormation);
      }).toThrow(InvalidSquadNameError);

      expect(() => {
        new Squad(validId, validOwnerId, null as any, validFormation);
      }).toThrow(InvalidSquadNameError);
    });

    it('TC-03: should reject missing, empty, or whitespace-only ownerId', () => {
      expect(() => {
        new Squad(validId, '', validName, validFormation);
      }).toThrow(InvalidSquadOwnerError);

      expect(() => {
        new Squad(validId, '   ', validName, validFormation);
      }).toThrow(InvalidSquadOwnerError);

      expect(() => {
        new Squad(validId, null as any, validName, validFormation);
      }).toThrow(InvalidSquadOwnerError);
    });

    it('TC-04: should accept all allowed formation codes', () => {
      ALLOWED_FORMATION_CODES.forEach((formation) => {
        const squad = new Squad(
          validId,
          validOwnerId,
          `Squad with ${formation}`,
          formation,
        );
        expect(squad.getFormationCode()).toBe(formation);
      });
    });

    it('TC-05: should reject invalid formation codes', () => {
      expect(() => {
        new Squad(validId, validOwnerId, validName, '5-5-0');
      }).toThrow(InvalidFormationCodeError);

      expect(() => {
        new Squad(validId, validOwnerId, validName, 'invalid-formation');
      }).toThrow(InvalidFormationCodeError);

      expect(() => {
        new Squad(validId, validOwnerId, validName, '');
      }).toThrow(InvalidFormationCodeError);
    });

    it('should support updating name, formation, season, description, and visibility', () => {
      const squad = new Squad(
        validId,
        validOwnerId,
        validName,
        '4-3-3',
      );

      squad.updateName('New Tactical Squad');
      expect(squad.getName()).toBe('New Tactical Squad');

      expect(() => squad.updateName('  ')).toThrow(InvalidSquadNameError);

      squad.updateFormationCode('4-2-3-1');
      expect(squad.getFormationCode()).toBe('4-2-3-1');

      expect(() => squad.updateFormationCode('9-0-1')).toThrow(InvalidFormationCodeError);

      squad.updateSeasonId(validSeasonId);
      expect(squad.getSeasonId()).toBe(validSeasonId);

      squad.updateDescription('Updated tactics');
      expect(squad.getDescription()).toBe('Updated tactics');

      squad.updateDescription(null);
      expect(squad.getDescription()).toBeNull();

      squad.updateVisibility('PUBLIC');
      expect(squad.getVisibility()).toBe('PUBLIC');
    });

    it('should serialize cleanly to JSON', () => {
      const squad = new Squad(
        validId,
        validOwnerId,
        validName,
        validFormation,
        validSeasonId,
        validDescription,
        'PRIVATE',
        createdAt,
        updatedAt,
      );

      expect(squad.toJSON()).toEqual({
        id: validId,
        ownerId: validOwnerId,
        seasonId: validSeasonId,
        name: validName,
        formationCode: validFormation,
        description: validDescription,
        visibility: 'PRIVATE',
        createdAt,
        updatedAt,
      });
    });
  });

  describe('SquadPlayer Entity', () => {
    const validSquadPlayerId = '44444444-4444-4444-4444-444444444444';
    const validSquadId = validId;
    const validPlayerId = '55555555-5555-5555-5555-555555555555';

    it('TC-06: should successfully create a valid starter SquadPlayer', () => {
      const starter = new SquadPlayer(
        validSquadPlayerId,
        validSquadId,
        validPlayerId,
        'GK',
        'STARTER',
        false,
        null,
        createdAt,
      );

      expect(starter).toBeInstanceOf(SquadPlayer);
      expect(starter.id).toBe(validSquadPlayerId);
      expect(starter.squadId).toBe(validSquadId);
      expect(starter.playerId).toBe(validPlayerId);
      expect(starter.getSlotCode()).toBe('GK');
      expect(starter.getRole()).toBe('STARTER');
      expect(starter.getIsCaptain()).toBe(false);
      expect(starter.getDisplayOrder()).toBeNull();
      expect(starter.addedAt).toBe(createdAt);
    });

    it('TC-07: should successfully create a valid substitute SquadPlayer', () => {
      const substitute = new SquadPlayer(
        validSquadPlayerId,
        validSquadId,
        validPlayerId,
        null,
        'SUBSTITUTE',
        false,
        1,
      );

      expect(substitute.getRole()).toBe('SUBSTITUTE');
      expect(substitute.getSlotCode()).toBeNull();
      expect(substitute.getDisplayOrder()).toBe(1);
    });

    it('TC-08: should handle captain state correctly', () => {
      const captain = new SquadPlayer(
        validSquadPlayerId,
        validSquadId,
        validPlayerId,
        'CM-1',
        'STARTER',
        true,
      );

      expect(captain.getIsCaptain()).toBe(true);

      captain.setCaptain(false);
      expect(captain.getIsCaptain()).toBe(false);

      captain.setCaptain(true);
      expect(captain.getIsCaptain()).toBe(true);
    });

    it('should reject invalid roles', () => {
      expect(() => {
        new SquadPlayer(
          validSquadPlayerId,
          validSquadId,
          validPlayerId,
          'GK',
          'RESERVE' as any,
        );
      }).toThrow(InvalidSquadPlayerRoleError);
    });

    it('should support updating slot code, role, and display order', () => {
      const player = new SquadPlayer(
        validSquadPlayerId,
        validSquadId,
        validPlayerId,
        'CB-1',
        'STARTER',
      );

      player.updateSlotCode('CB-2');
      expect(player.getSlotCode()).toBe('CB-2');

      player.updateRole('SUBSTITUTE');
      expect(player.getRole()).toBe('SUBSTITUTE');

      player.updateDisplayOrder(2);
      expect(player.getDisplayOrder()).toBe(2);
    });

    it('should serialize cleanly to JSON', () => {
      const player = new SquadPlayer(
        validSquadPlayerId,
        validSquadId,
        validPlayerId,
        'ST',
        'STARTER',
        true,
        null,
        createdAt,
      );

      expect(player.toJSON()).toEqual({
        id: validSquadPlayerId,
        squadId: validSquadId,
        playerId: validPlayerId,
        slotCode: 'ST',
        role: 'STARTER',
        isCaptain: true,
        displayOrder: null,
        addedAt: createdAt,
      });
    });
  });

  describe('Domain Independence (Zero TypeORM leak)', () => {
    it('TC-09: domain files should not import TypeORM or NestJS decorators', () => {
      const squadEntityPath = path.resolve(__dirname, './squad.ts');
      const squadEntityCode = fs.readFileSync(squadEntityPath, 'utf8');

      expect(squadEntityCode).not.toContain('typeorm');
      expect(squadEntityCode).not.toContain('@nestjs');
      expect(squadEntityCode).not.toContain('Entity(');
      expect(squadEntityCode).not.toContain('Column(');

      const squadPlayerEntityPath = path.resolve(__dirname, './squad-player.ts');
      const squadPlayerEntityCode = fs.readFileSync(squadPlayerEntityPath, 'utf8');

      expect(squadPlayerEntityCode).not.toContain('typeorm');
      expect(squadPlayerEntityCode).not.toContain('@nestjs');

      const squadRepoPath = path.resolve(__dirname, '../repositories/squad.repository.ts');
      const squadRepoCode = fs.readFileSync(squadRepoPath, 'utf8');

      expect(squadRepoCode).not.toContain('typeorm');
      expect(squadRepoCode).not.toContain('@nestjs');

      const squadPlayerRepoPath = path.resolve(__dirname, '../repositories/squad-player.repository.ts');
      const squadPlayerRepoCode = fs.readFileSync(squadPlayerRepoPath, 'utf8');

      expect(squadPlayerRepoCode).not.toContain('typeorm');
      expect(squadPlayerRepoCode).not.toContain('@nestjs');
    });
  });
});
