import { DataSource, EntityManager } from 'typeorm';
import { UpdatePlayerPrimaryPositionUseCase } from './update-player-primary-position.use-case';
import { PlayerPositionWriteRepository } from '../ports/player-position-write.repository';

describe('UpdatePlayerPrimaryPositionUseCase', () => {
  it('runs the position update inside a transaction', async () => {
    const manager = {} as EntityManager;
    const updatedPlayer = { id: 'player-1', primaryPosition: 'DM' } as any;
    const writeRepository: jest.Mocked<PlayerPositionWriteRepository> = {
      updatePrimaryPosition: jest.fn().mockResolvedValue(updatedPlayer),
    };
    const dataSource = {
      transaction: jest.fn(
        async (callback: (txManager: EntityManager) => Promise<any>) =>
          callback(manager),
      ),
    } as unknown as DataSource;
    const useCase = new UpdatePlayerPrimaryPositionUseCase(
      dataSource,
      writeRepository,
    );

    await expect(
      useCase.execute({ playerId: 'player-1', positionCode: 'DM' }),
    ).resolves.toBe(updatedPlayer);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(writeRepository.updatePrimaryPosition).toHaveBeenCalledWith(
      manager,
      'player-1',
      'DM',
    );
  });

  it('propagates repository failures so the transaction rolls back', async () => {
    const failure = new Error('write failed');
    const writeRepository: jest.Mocked<PlayerPositionWriteRepository> = {
      updatePrimaryPosition: jest.fn().mockRejectedValue(failure),
    };
    const dataSource = {
      transaction: jest.fn(
        async (callback: (txManager: EntityManager) => Promise<any>) =>
          callback({} as EntityManager),
      ),
    } as unknown as DataSource;
    const useCase = new UpdatePlayerPrimaryPositionUseCase(
      dataSource,
      writeRepository,
    );

    await expect(
      useCase.execute({ playerId: 'player-1', positionCode: 'ST' }),
    ).rejects.toBe(failure);
  });
});
