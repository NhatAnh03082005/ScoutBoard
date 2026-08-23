import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ShortlistsController } from './shortlists.controller';
import { CreateShortlistUseCase } from '../../../application/use-cases/create-shortlist.use-case';
import { GetShortlistByIdUseCase } from '../../../application/use-cases/get-shortlist-by-id.use-case';
import { ListShortlistsByOwnerUseCase } from '../../../application/use-cases/list-shortlists-by-owner.use-case';
import { UpdateShortlistUseCase } from '../../../application/use-cases/update-shortlist.use-case';
import { DeleteShortlistUseCase } from '../../../application/use-cases/delete-shortlist.use-case';
import { AddPlayerToShortlistUseCase } from '../../../application/use-cases/add-player-to-shortlist.use-case';
import { RemovePlayerFromShortlistUseCase } from '../../../application/use-cases/remove-player-from-shortlist.use-case';
import { UpdateShortlistPlayerNoteUseCase } from '../../../application/use-cases/update-shortlist-player-note.use-case';
import { ListPlayersInShortlistUseCase } from '../../../application/use-cases/list-players-in-shortlist.use-case';
import { Shortlist } from '../../../domain/entities/shortlist';
import { ShortlistPlayer } from '../../../domain/entities/shortlist-player';
import {
  ShortlistNotFoundError,
  PlayerNotFoundError,
  PlayerAlreadyInShortlistError,
  InvalidShortlistNameError,
  PlayerNotInShortlistError,
} from '../../../domain/errors/shortlist.errors';

describe('ShortlistsController (Unit & API Contract)', () => {
  let controller: ShortlistsController;
  let mockCreateUseCase: jest.Mocked<CreateShortlistUseCase>;
  let mockGetByIdUseCase: jest.Mocked<GetShortlistByIdUseCase>;
  let mockListByOwnerUseCase: jest.Mocked<ListShortlistsByOwnerUseCase>;
  let mockUpdateUseCase: jest.Mocked<UpdateShortlistUseCase>;
  let mockDeleteUseCase: jest.Mocked<DeleteShortlistUseCase>;
  let mockAddPlayerUseCase: jest.Mocked<AddPlayerToShortlistUseCase>;
  let mockRemovePlayerUseCase: jest.Mocked<RemovePlayerFromShortlistUseCase>;
  let mockUpdateNoteUseCase: jest.Mocked<UpdateShortlistPlayerNoteUseCase>;
  let mockListPlayersUseCase: jest.Mocked<ListPlayersInShortlistUseCase>;

  const authUserA = {
    id: 'user-A',
    email: 'usera@example.com',
    fullName: 'User A',
    status: 'ACTIVE',
    roles: ['USER'],
  };

  const reqA = { user: authUserA };

  beforeEach(async () => {
    mockCreateUseCase = { execute: jest.fn() } as any;
    mockGetByIdUseCase = { execute: jest.fn() } as any;
    mockListByOwnerUseCase = { execute: jest.fn() } as any;
    mockUpdateUseCase = { execute: jest.fn() } as any;
    mockDeleteUseCase = { execute: jest.fn() } as any;
    mockAddPlayerUseCase = { execute: jest.fn() } as any;
    mockRemovePlayerUseCase = { execute: jest.fn() } as any;
    mockUpdateNoteUseCase = { execute: jest.fn() } as any;
    mockListPlayersUseCase = { execute: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShortlistsController],
      providers: [
        { provide: CreateShortlistUseCase, useValue: mockCreateUseCase },
        { provide: GetShortlistByIdUseCase, useValue: mockGetByIdUseCase },
        { provide: ListShortlistsByOwnerUseCase, useValue: mockListByOwnerUseCase },
        { provide: UpdateShortlistUseCase, useValue: mockUpdateUseCase },
        { provide: DeleteShortlistUseCase, useValue: mockDeleteUseCase },
        { provide: AddPlayerToShortlistUseCase, useValue: mockAddPlayerUseCase },
        { provide: RemovePlayerFromShortlistUseCase, useValue: mockRemovePlayerUseCase },
        { provide: UpdateShortlistPlayerNoteUseCase, useValue: mockUpdateNoteUseCase },
        { provide: ListPlayersInShortlistUseCase, useValue: mockListPlayersUseCase },
      ],
    }).compile();

    controller = module.get<ShortlistsController>(ShortlistsController);
  });

  describe('Shortlist CRUD', () => {
    it('TC-01 & TC-02: Create - server extracts ownerId from JWT, ignoring any client-sent owner_id', async () => {
      const createdShortlist = new Shortlist(
        'sl-1',
        'user-A',
        'European U21 Targets',
        'Young players to monitor',
        'PRIVATE',
        new Date(),
        new Date(),
      );
      mockCreateUseCase.execute.mockResolvedValue(createdShortlist);

      const dto = {
        name: 'European U21 Targets',
        description: 'Young players to monitor',
        visibility: 'PRIVATE' as const,
        owner_id: 'malicious-injected-owner',
      };

      const res = await controller.create(dto as any, reqA as any);

      expect(mockCreateUseCase.execute).toHaveBeenCalledWith({
        ownerId: 'user-A',
        name: 'European U21 Targets',
        description: 'Young players to monitor',
        visibility: 'PRIVATE',
      });
      expect(res.ownerId).toBe('user-A');
      expect(res.name).toBe('European U21 Targets');
    });

    it('TC-03: List Own Shortlists - returns exactly the shortlists belonging to current user', async () => {
      const lists = [
        new Shortlist('sl-1', 'user-A', 'List 1'),
        new Shortlist('sl-2', 'user-A', 'List 2'),
      ];
      mockListByOwnerUseCase.execute.mockResolvedValue(lists);

      const res = await controller.findAll(reqA as any);

      expect(mockListByOwnerUseCase.execute).toHaveBeenCalledWith('user-A');
      expect(res.length).toBe(2);
      expect(res[0].id).toBe('sl-1');
      expect(res[1].id).toBe('sl-2');
    });

    it('TC-04 & TC-05: Get Owned Shortlist vs Cross-User Isolation', async () => {
      const ownShortlist = new Shortlist('sl-1', 'user-A', 'List 1');
      mockGetByIdUseCase.execute.mockResolvedValue(ownShortlist);

      const ownRes = await controller.findOne('sl-1', reqA as any);
      expect(ownRes.id).toBe('sl-1');

      mockGetByIdUseCase.execute.mockRejectedValue(new ShortlistNotFoundError('sl-2'));

      await expect(controller.findOne('sl-2', reqA as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('TC-06 & TC-07: Update Owned Shortlist vs Another User Shortlist', async () => {
      const updated = new Shortlist(
        'sl-1',
        'user-A',
        'Updated Name',
        'Updated Desc',
        'PUBLIC',
      );
      mockUpdateUseCase.execute.mockResolvedValue(updated);

      const res = await controller.update(
        'sl-1',
        { name: 'Updated Name', description: 'Updated Desc', visibility: 'PUBLIC' as any },
        reqA as any,
      );
      expect(res.name).toBe('Updated Name');
      expect(res.visibility).toBe('PUBLIC');

      mockUpdateUseCase.execute.mockRejectedValue(new ShortlistNotFoundError('sl-99'));

      await expect(
        controller.update('sl-99', { name: 'Hacked' }, reqA as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('TC-08 & TC-09: Delete Owned Shortlist vs Another User Shortlist', async () => {
      mockDeleteUseCase.execute.mockResolvedValue(undefined);

      const res = await controller.remove('sl-1', reqA as any);
      expect(res).toEqual({ success: true, message: 'Shortlist deleted successfully' });

      mockDeleteUseCase.execute.mockRejectedValue(new ShortlistNotFoundError('sl-99'));

      await expect(controller.remove('sl-99', reqA as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('TC-10: Invalid Input - throws BadRequestException when domain validation fails', async () => {
      mockCreateUseCase.execute.mockRejectedValue(new InvalidShortlistNameError());

      await expect(
        controller.create({ name: '' } as any, reqA as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Player Membership (POST, DELETE, PATCH note, GET players)', () => {
    it('listPlayers - returns players list for owned shortlist', async () => {
      const players = [{ id: 'sp-1', shortlistId: 'sl-1', playerId: 'p-1' }];
      mockListPlayersUseCase.execute.mockResolvedValue(players);

      const res = await controller.listPlayers('sl-1', reqA as any);

      expect(mockListPlayersUseCase.execute).toHaveBeenCalledWith({
        shortlistId: 'sl-1',
        ownerId: 'user-A',
      });
      expect(res).toEqual(players);
    });

    it('TC-01: addPlayer - adds player to owned shortlist', async () => {
      const sp = new ShortlistPlayer('rel-1', 'sl-1', 'player-1', 'Scout note', new Date());
      mockAddPlayerUseCase.execute.mockResolvedValue(sp);

      const res = await controller.addPlayer(
        'sl-1',
        { playerId: 'player-1', note: 'Scout note' },
        reqA as any,
      );

      expect(mockAddPlayerUseCase.execute).toHaveBeenCalledWith({
        shortlistId: 'sl-1',
        ownerId: 'user-A',
        playerId: 'player-1',
        note: 'Scout note',
      });
      expect(res.id).toBe('rel-1');
      expect(res.shortlistId).toBe('sl-1');
      expect(res.playerId).toBe('player-1');
      expect(res.note).toBe('Scout note');
    });

    it('TC-02: addPlayer - throws ConflictException (409) if player already in shortlist', async () => {
      mockAddPlayerUseCase.execute.mockRejectedValue(
        new PlayerAlreadyInShortlistError('player-1', 'sl-1'),
      );

      await expect(
        controller.addPlayer('sl-1', { playerId: 'player-1' }, reqA as any),
      ).rejects.toThrow(ConflictException);
    });

    it('TC-04: addPlayer - throws NotFoundException (404) if player or shortlist not found', async () => {
      mockAddPlayerUseCase.execute.mockRejectedValue(
        new PlayerNotFoundError('non-existent'),
      );

      await expect(
        controller.addPlayer('sl-1', { playerId: 'non-existent' }, reqA as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('TC-05: removePlayer - removes relationship successfully', async () => {
      mockRemovePlayerUseCase.execute.mockResolvedValue(undefined);

      const res = await controller.removePlayer('sl-1', 'player-1', reqA as any);

      expect(mockRemovePlayerUseCase.execute).toHaveBeenCalledWith({
        shortlistId: 'sl-1',
        ownerId: 'user-A',
        playerId: 'player-1',
      });
      expect(res).toEqual({
        success: true,
        message: 'Player removed from shortlist successfully',
      });
    });

    it('TC-06: updatePlayerNote - updates scout note for player in shortlist', async () => {
      const sp = new ShortlistPlayer(
        'rel-1',
        'sl-1',
        'player-1',
        'Strong 1v1 defender',
        new Date(),
      );
      mockUpdateNoteUseCase.execute.mockResolvedValue(sp);

      const res = await controller.updatePlayerNote(
        'sl-1',
        'player-1',
        { note: 'Strong 1v1 defender' },
        reqA as any,
      );

      expect(mockUpdateNoteUseCase.execute).toHaveBeenCalledWith({
        shortlistId: 'sl-1',
        ownerId: 'user-A',
        playerId: 'player-1',
        note: 'Strong 1v1 defender',
      });
      expect(res.note).toBe('Strong 1v1 defender');
    });

    it('TC-07: cross-user membership operations reject with 404', async () => {
      mockAddPlayerUseCase.execute.mockRejectedValue(new ShortlistNotFoundError('sl-B'));
      mockRemovePlayerUseCase.execute.mockRejectedValue(new ShortlistNotFoundError('sl-B'));
      mockUpdateNoteUseCase.execute.mockRejectedValue(new ShortlistNotFoundError('sl-B'));
      mockListPlayersUseCase.execute.mockRejectedValue(new ShortlistNotFoundError('sl-B'));

      await expect(
        controller.addPlayer('sl-B', { playerId: 'player-1' }, reqA as any),
      ).rejects.toThrow(NotFoundException);

      await expect(
        controller.removePlayer('sl-B', 'player-1', reqA as any),
      ).rejects.toThrow(NotFoundException);

      await expect(
        controller.updatePlayerNote('sl-B', 'player-1', { note: 'test' }, reqA as any),
      ).rejects.toThrow(NotFoundException);

      await expect(
        controller.listPlayers('sl-B', reqA as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
