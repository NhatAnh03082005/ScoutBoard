import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { AvatarStorageService } from '../../../infrastructure/storage/avatar-storage.service';

@Controller('users')
export class PublicAvatarController {
  constructor(private readonly avatarStorage: AvatarStorageService) {}

  @Get(':userId/avatar')
  async getAvatar(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const avatar = await this.avatarStorage.getDatabaseAvatar(userId);
    if (!avatar) throw new NotFoundException('Avatar was not found.');

    response.setHeader('Content-Type', avatar.contentType);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return new StreamableFile(avatar.buffer);
  }
}
