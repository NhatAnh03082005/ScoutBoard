import { BadRequestException } from '@nestjs/common';
import { AvatarStorageService } from './avatar-storage.service';

describe('AvatarStorageService', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01,
  ]);

  const createService = (environment: Record<string, string> = {}) => {
    const update = jest.fn().mockResolvedValue({ affected: 1 });
    const getOne = jest.fn().mockResolvedValue(null);
    const queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne,
    };
    const repository = {
      update,
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const dataSource = {
      getRepository: jest.fn().mockReturnValue(repository),
    };
    const configService = {
      get: jest.fn((key: string) => environment[key]),
    };

    return {
      service: new AvatarStorageService(
        configService as any,
        dataSource as any,
      ),
      update,
      getOne,
      queryBuilder,
    };
  };

  it('stores a production avatar in PostgreSQL when Storage is not configured', async () => {
    const { service, update } = createService({
      NODE_ENV: 'production',
      VERCEL_PROJECT_PRODUCTION_URL: 'scoutboard-backend.vercel.app',
    });

    const url = await service.upload(userId, {
      buffer: pngBuffer,
      mimetype: 'image/png',
      originalname: 'avatar.png',
      size: pngBuffer.length,
    });

    expect(update).toHaveBeenCalledWith(userId, {
      avatarData: pngBuffer,
      avatarContentType: 'image/png',
    });
    expect(url).toMatch(
      new RegExp(
        `^https://scoutboard-backend\\.vercel\\.app/api/users/${userId}/avatar\\?v=\\d+$`,
      ),
    );
  });

  it('loads the private binary columns used by the public avatar endpoint', async () => {
    const { service, getOne, queryBuilder } = createService();
    getOne.mockResolvedValue({
      avatarData: pngBuffer,
      avatarContentType: 'image/png',
    });

    await expect(service.getDatabaseAvatar(userId)).resolves.toEqual({
      buffer: pngBuffer,
      contentType: 'image/png',
    });
    expect(queryBuilder.addSelect).toHaveBeenCalledWith([
      'user.avatarData',
      'user.avatarContentType',
    ]);
  });

  it('rejects content that is not an actual supported image', async () => {
    const { service } = createService({ NODE_ENV: 'production' });

    await expect(
      service.upload(userId, {
        buffer: Buffer.from('not-an-image'),
        mimetype: 'image/png',
        originalname: 'fake.png',
        size: 12,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
