import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { UserOrmEntity } from '../persistence/typeorm/entities/user.orm-entity';

export interface UploadedAvatarFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@Injectable()
export class AvatarStorageService {
  private readonly maxFileSize = 2 * 1024 * 1024;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async upload(userId: string, file: UploadedAvatarFile): Promise<string> {
    const contentType = this.detectImageType(file.buffer);

    if (!contentType) {
      throw new BadRequestException(
        'Avatar must be a valid JPG, PNG, or WebP image.',
      );
    }

    if (file.size <= 0 || file.size > this.maxFileSize) {
      throw new BadRequestException('Avatar must be smaller than 2 MB.');
    }

    const storageConfig = this.getStorageConfig();
    if (!storageConfig) {
      if (this.isProduction()) {
        return this.uploadToDatabase(userId, file.buffer, contentType);
      }
      return this.uploadLocally(userId, file.buffer, contentType);
    }
    const { baseUrl, serviceKey, bucket } = storageConfig;
    const objectPath = `${userId}/avatar`;
    const objectUrl = `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${this.encodeObjectPath(objectPath)}`;

    let response: Response;
    try {
      response = await fetch(objectUrl, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        body: new Uint8Array(file.buffer),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Avatar storage is temporarily unavailable.',
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Unable to store the avatar. Check the Supabase Storage configuration.',
      );
    }

    return `${baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${this.encodeObjectPath(objectPath)}?v=${Date.now()}`;
  }

  async remove(userId: string): Promise<void> {
    const storageConfig = this.getStorageConfig();
    if (!storageConfig) {
      if (this.isProduction()) {
        await this.removeFromDatabase(userId);
        return;
      }
      await this.removeLocalAvatar(userId);
      return;
    }
    const { baseUrl, serviceKey, bucket } = storageConfig;
    const objectPath = `${userId}/avatar`;
    const objectUrl = `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}`;

    let response: Response;
    try {
      response = await fetch(objectUrl, {
        method: 'DELETE',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prefixes: [objectPath] }),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Avatar storage is temporarily unavailable.',
      );
    }

    if (!response.ok && response.status !== 404) {
      throw new ServiceUnavailableException('Unable to remove the avatar.');
    }
  }

  private getStorageConfig(): {
    baseUrl: string;
    serviceKey: string;
    bucket: string;
  } | null {
    const baseUrl = (
      this.configService.get<string>('SUPABASE_URL') || ''
    ).replace(/\/$/, '');
    const serviceKey =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || '';
    const bucket =
      this.configService.get<string>('SUPABASE_AVATAR_BUCKET') || 'avatars';

    if (!baseUrl || !serviceKey) return null;

    return { baseUrl, serviceKey, bucket };
  }

  async getDatabaseAvatar(
    userId: string,
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const user = await this.dataSource
      .getRepository(UserOrmEntity)
      .createQueryBuilder('user')
      .addSelect(['user.avatarData', 'user.avatarContentType'])
      .where('user.id = :userId', { userId })
      .getOne();

    if (!user?.avatarData || !user.avatarContentType) return null;
    return { buffer: user.avatarData, contentType: user.avatarContentType };
  }

  private async uploadToDatabase(
    userId: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.dataSource.getRepository(UserOrmEntity).update(userId, {
      avatarData: buffer,
      avatarContentType: contentType,
    });

    return `${this.getPublicBaseUrl()}/api/users/${encodeURIComponent(userId)}/avatar?v=${Date.now()}`;
  }

  private async removeFromDatabase(userId: string): Promise<void> {
    await this.dataSource.getRepository(UserOrmEntity).update(userId, {
      avatarData: null,
      avatarContentType: null,
    });
  }

  private getPublicBaseUrl(): string {
    const configured = this.configService.get<string>('BACKEND_PUBLIC_URL');
    const vercelProduction = this.configService.get<string>(
      'VERCEL_PROJECT_PRODUCTION_URL',
    );
    const vercelDeployment = this.configService.get<string>('VERCEL_URL');
    const candidate = configured || vercelProduction || vercelDeployment;

    if (!candidate) {
      return `http://localhost:${this.configService.get<string>('PORT') || '3000'}`;
    }

    const withProtocol = /^https?:\/\//i.test(candidate)
      ? candidate
      : `https://${candidate}`;
    return withProtocol.replace(/\/$/, '');
  }

  private isProduction(): boolean {
    return (
      (this.configService.get<string>('NODE_ENV') || 'development') ===
      'production'
    );
  }

  private async uploadLocally(
    userId: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    const extension = this.extensionFor(contentType);
    const directory = path.resolve(process.cwd(), 'uploads', 'avatars');
    await mkdir(directory, { recursive: true });
    await this.removeLocalAvatar(userId);
    await writeFile(path.join(directory, `${userId}.${extension}`), buffer);

    const publicBaseUrl = (
      this.configService.get<string>('BACKEND_PUBLIC_URL') ||
      `http://localhost:${this.configService.get<string>('PORT') || '3000'}`
    ).replace(/\/$/, '');
    return `${publicBaseUrl}/uploads/avatars/${encodeURIComponent(userId)}.${extension}?v=${Date.now()}`;
  }

  private async removeLocalAvatar(userId: string): Promise<void> {
    const directory = path.resolve(process.cwd(), 'uploads', 'avatars');
    await Promise.all(
      ['webp', 'jpg', 'png'].map(async (extension) => {
        try {
          await unlink(path.join(directory, `${userId}.${extension}`));
        } catch (error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code !== 'ENOENT') throw error;
        }
      }),
    );
  }

  private extensionFor(contentType: string): 'webp' | 'jpg' | 'png' {
    if (contentType === 'image/png') return 'png';
    if (contentType === 'image/jpeg') return 'jpg';
    return 'webp';
  }

  private encodeObjectPath(path: string): string {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  private detectImageType(buffer: Buffer): string | null {
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return 'image/jpeg';
    }

    if (
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
      return 'image/png';
    }

    if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return 'image/webp';
    }

    return null;
  }
}
