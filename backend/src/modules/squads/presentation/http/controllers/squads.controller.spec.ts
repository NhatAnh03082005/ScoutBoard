import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SquadsController } from './squads.controller';
import { CreateSquadUseCase } from '../../../application/use-cases/create-squad.use-case';
import { GetSquadByIdUseCase } from '../../../application/use-cases/get-squad-by-id.use-case';
import { ListSquadsByOwnerUseCase } from '../../../application/use-cases/list-squads-by-owner.use-case';
import { UpdateSquadUseCase } from '../../../application/use-cases/update-squad.use-case';
import { DeleteSquadUseCase } from '../../../application/use-cases/delete-squad.use-case';
import { AddPlayerToSquadUseCase } from '../../../application/use-cases/add-player-to-squad.use-case';
import { UpdateSquadPlayerUseCase } from '../../../application/use-cases/update-squad-player.use-case';
import { RemovePlayerFromSquadUseCase } from '../../../application/use-cases/remove-player-from-squad.use-case';
import { ListPlayersInSquadUseCase } from '../../../application/use-cases/list-players-in-squad.use-case';
import { Squad } from '../../../domain/entities/squad';
import { SquadPlayer } from '../../../domain/entities/squad-player';
import {
  SquadNotFoundError,
  PlayerNotFoundError,
  PlayerAlreadyInSquadError,
  PlayerNotInSquadError,
  SquadStarterSlotAlreadyOccupiedError,
  SquadCaptainAlreadyAssignedError,
  CaptainMustBeStarterError,
  InvalidSquadNameError,
  InvalidFormationCodeError,
} from '../../../domain/errors/squad.errors';
import { JwtAuthGuard } from '../../../../auth/presentation/http/guards/jwt-auth.guard';
import { FormationCodeEnum, SquadVisibilityEnum } from '../dto/create-squad.dto';
import { SquadPlayerRoleEnum } from '../dto/add-player-to-squad.dto';

describe('SquadsController (Unit & API Contract)', () => {
  let controller: SquadsController;
  let mockCreateUseCase: jest.Mocked<CreateSquadUseCase>;
  let mockGetByIdUseCase: jest.Mocked<GetSquadByIdUseCase>;
  let mockListByOwnerUseCase: jest.Mocked<ListSquadsByOwnerUseCase>;
  let mockUpdateUseCase: jest.Mocked<UpdateSquadUseCase>;
  let mockDeleteUseCase: jest.Mocked<DeleteSquadUseCase>;
  let mockAddPlayerUseCase: jest.Mocked<AddPlayerToSquadUseCase>;
  let mockUpdatePlayerUseCase: jest.Mocked<UpdateSquadPlayerUseCase>;
  let mockRemovePlayerUseCase: jest.Mocked<RemovePlayerFromSquadUseCase>;
  let mockListPlayersUseCase: jest.Mocked<ListPlayersInSquadUseCase>;

  const authUserA = {
    id: 'user-A',
    email: 'usera@example.com',
    fullName: 'User A',
    status: 'ACTIVE',
    roles: ['USER'],
  };

  const authUserB = {
    id: 'user-B',
    email: 'userb@example.com',
    fullName: 'User B',
    status: 'ACTIVE',
    roles: ['USER'],
  };

  const reqA = { user: authUserA };
  const reqB = { user: authUserB };

  beforeEach(async () => {
    mockCreateUseCase = { execute: jest.fn() } as any;
    mockGetByIdUseCase = { execute: jest.fn() } as any;
    mockListByOwnerUseCase = { execute: jest.fn() } as any;
    mockUpdateUseCase = { execute: jest.fn() } as any;
    mockDeleteUseCase = { execute: jest.fn() } as any;
    mockAddPlayerUseCase = { execute: jest.fn() } as any;
    mockUpdatePlayerUseCase = { execute: jest.fn() } as any;
    mockRemovePlayerUseCase = { execute: jest.fn() } as any;
    mockListPlayersUseCase = { execute: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SquadsController],
      providers: [
        { provide: CreateSquadUseCase, useValue: mockCreateUseCase },
        { provide: GetSquadByIdUseCase, useValue: mockGetByIdUseCase },
        { provide: ListSquadsByOwnerUseCase, useValue: mockListByOwnerUseCase },
        { provide: UpdateSquadUseCase, useValue: mockUpdateUseCase },
        { provide: DeleteSquadUseCase, useValue: mockDeleteUseCase },
        { provide: AddPlayerToSquadUseCase, useValue: mockAddPlayerUseCase },
        { provide: UpdateSquadPlayerUseCase, useValue: mockUpdatePlayerUseCase },
        { provide: RemovePlayerFromSquadUseCase, useValue: mockRemovePlayerUseCase },
        { provide: ListPlayersInSquadUseCase, useValue: mockListPlayersUseCase },
      ],
    }).compile();

    controller = module.get<SquadsController>(SquadsController);
  });

  describe('Squad CRUD', () => {
    it('Create valid squad', async () => {
      const createdSquad = new Squad(
        'squad-1',
        'user-A',
        'Dream Team EPL 2026',
        '4-3-3',
        'season-1',
        'Possession based team',
        'PRIVATE',
      );
      mockCreateUseCase.execute.mockResolvedValue(createdSquad);

      const dto = {
        name: 'Dream Team EPL 2026',
        formationCode: FormationCodeEnum.F_433,
        seasonId: 'season-1',
        description: 'Possession based team',
        visibility: SquadVisibilityEnum.PRIVATE,
      };

      const res = await controller.create(dto, reqA as any);
      expect(res.id).toBe('squad-1');
      expect(res.name).toBe('Dream Team EPL 2026');
    });

    it('List own squads', async () => {
      mockListByOwnerUseCase.execute.mockResolvedValue([
        new Squad('squad-1', 'user-A', 'Squad 1', '4-3-3'),
      ]);

      const res = await controller.findAll(reqA as any);
      expect(res.length).toBe(1);
    });

    it('Get own squad', async () => {
      mockGetByIdUseCase.execute.mockResolvedValue(
        new Squad('squad-1', 'user-A', 'My Squad', '4-3-3'),
      );

      const res = await controller.findOne('squad-1', reqA as any);
      expect(res.name).toBe('My Squad');
    });

    it('Update own squad', async () => {
      mockUpdateUseCase.execute.mockResolvedValue(
        new Squad('squad-1', 'user-A', 'Renamed', '4-2-3-1'),
      );

      const res = await controller.update('squad-1', { name: 'Renamed' }, reqA as any);
      expect(res.name).toBe('Renamed');
    });

    it('Delete own squad', async () => {
      mockDeleteUseCase.execute.mockResolvedValue(undefined);

      const res = await controller.remove('squad-1', reqA as any);
      expect(res.success).toBe(true);
    });
  });

  describe('Squad Player Management (TC-01 through TC-14)', () => {
    it('TC-01: Add starter player', async () => {
      const added = new SquadPlayer('sp-1', 'squad-1', 'player-1', 'GK', 'STARTER', false);
      mockAddPlayerUseCase.execute.mockResolvedValue(added);

      const res = await controller.addPlayer(
        'squad-1',
        {
          playerId: 'player-1',
          slotCode: 'GK',
          role: SquadPlayerRoleEnum.STARTER,
        },
        reqA as any,
      );

      expect(mockAddPlayerUseCase.execute).toHaveBeenCalledWith({
        squadId: 'squad-1',
        ownerId: 'user-A',
        playerId: 'player-1',
        slotCode: 'GK',
        role: 'STARTER',
        isCaptain: undefined,
        displayOrder: undefined,
      });
      expect(res.playerId).toBe('player-1');
      expect(res.slotCode).toBe('GK');
      expect(res.role).toBe('STARTER');
    });

    it('TC-02: Add substitute player', async () => {
      const added = new SquadPlayer('sp-2', 'squad-1', 'player-2', null, 'SUBSTITUTE', false, 1);
      mockAddPlayerUseCase.execute.mockResolvedValue(added);

      const res = await controller.addPlayer(
        'squad-1',
        {
          playerId: 'player-2',
          slotCode: null,
          role: SquadPlayerRoleEnum.SUBSTITUTE,
          displayOrder: 1,
        },
        reqA as any,
      );

      expect(res.role).toBe('SUBSTITUTE');
      expect(res.slotCode).toBeNull();
      expect(res.displayOrder).toBe(1);
    });

    it('TC-03: Duplicate player in same squad should throw ConflictException (409)', async () => {
      mockAddPlayerUseCase.execute.mockRejectedValue(
        new PlayerAlreadyInSquadError('player-1', 'squad-1'),
      );

      await expect(
        controller.addPlayer(
          'squad-1',
          {
            playerId: 'player-1',
            role: SquadPlayerRoleEnum.STARTER,
            slotCode: 'CB-1',
          },
          reqA as any,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('TC-05: Duplicate starter slot should throw ConflictException (409)', async () => {
      mockAddPlayerUseCase.execute.mockRejectedValue(
        new SquadStarterSlotAlreadyOccupiedError('GK', 'squad-1'),
      );

      await expect(
        controller.addPlayer(
          'squad-1',
          {
            playerId: 'player-2',
            role: SquadPlayerRoleEnum.STARTER,
            slotCode: 'GK',
          },
          reqA as any,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('TC-06: Move slot for starter player', async () => {
      const updated = new SquadPlayer('sp-1', 'squad-1', 'player-1', 'CB-2', 'STARTER');
      mockUpdatePlayerUseCase.execute.mockResolvedValue(updated);

      const res = await controller.updatePlayer(
        'squad-1',
        'player-1',
        { slotCode: 'CB-2' },
        reqA as any,
      );

      expect(mockUpdatePlayerUseCase.execute).toHaveBeenCalledWith({
        squadId: 'squad-1',
        ownerId: 'user-A',
        playerId: 'player-1',
        slotCode: 'CB-2',
        role: undefined,
        isCaptain: undefined,
        displayOrder: undefined,
      });
      expect(res.slotCode).toBe('CB-2');
    });

    it('TC-07 & TC-08: Role change (Starter <-> Substitute)', async () => {
      const updatedToSub = new SquadPlayer('sp-1', 'squad-1', 'player-1', null, 'SUBSTITUTE');
      mockUpdatePlayerUseCase.execute.mockResolvedValue(updatedToSub);

      const res = await controller.updatePlayer(
        'squad-1',
        'player-1',
        { role: SquadPlayerRoleEnum.SUBSTITUTE, slotCode: null },
        reqA as any,
      );

      expect(res.role).toBe('SUBSTITUTE');
      expect(res.slotCode).toBeNull();
    });

    it('TC-09: Set captain on starter', async () => {
      const updatedCaptain = new SquadPlayer('sp-1', 'squad-1', 'player-1', 'CM-1', 'STARTER', true);
      mockUpdatePlayerUseCase.execute.mockResolvedValue(updatedCaptain);

      const res = await controller.updatePlayer(
        'squad-1',
        'player-1',
        { isCaptain: true },
        reqA as any,
      );

      expect(res.isCaptain).toBe(true);
    });

    it('TC-10: Reject setting second captain when another captain exists', async () => {
      mockUpdatePlayerUseCase.execute.mockRejectedValue(
        new SquadCaptainAlreadyAssignedError('squad-1'),
      );

      await expect(
        controller.updatePlayer(
          'squad-1',
          'player-2',
          { isCaptain: true },
          reqA as any,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('TC-11: Reject substitute as captain', async () => {
      mockUpdatePlayerUseCase.execute.mockRejectedValue(
        new CaptainMustBeStarterError(),
      );

      await expect(
        controller.updatePlayer(
          'squad-1',
          'player-2',
          { role: SquadPlayerRoleEnum.SUBSTITUTE, isCaptain: true },
          reqA as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('TC-12: Remove player from squad executes successfully', async () => {
      mockRemovePlayerUseCase.execute.mockResolvedValue(undefined);

      const res = await controller.removePlayer('squad-1', 'player-1', reqA as any);

      expect(mockRemovePlayerUseCase.execute).toHaveBeenCalledWith({
        squadId: 'squad-1',
        ownerId: 'user-A',
        playerId: 'player-1',
      });
      expect(res).toEqual({
        success: true,
        message: 'Player removed from squad successfully',
      });
    });

    it('TC-14: Cross-user access denied on player actions', async () => {
      mockAddPlayerUseCase.execute.mockRejectedValue(
        new SquadNotFoundError('squad-1'),
      );

      await expect(
        controller.addPlayer(
          'squad-1',
          {
            playerId: 'player-1',
            role: SquadPlayerRoleEnum.STARTER,
            slotCode: 'GK',
          },
          reqB as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('TC-13: Authentication Guard Check', () => {
    it('Controller should have JwtAuthGuard applied', () => {
      const guards = Reflect.getMetadata('__guards__', SquadsController);
      expect(guards).toBeDefined();
      expect(guards).toContain(JwtAuthGuard);
    });
  });
});
