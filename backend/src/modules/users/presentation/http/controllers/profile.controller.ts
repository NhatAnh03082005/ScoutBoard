import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Patch,
  Put,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../../auth/presentation/http/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../../../auth/presentation/http/strategies/jwt.strategy';
import { MyProfileService } from '../../../application/services/my-profile.service';
import type { UploadedAvatarFile } from '../../../infrastructure/storage/avatar-storage.service';
import { ChangeMyPasswordDto, UpdateMyProfileDto } from '../dto/profile.dto';

interface RequestWithAuthUser {
  user: AuthenticatedUser;
}

@Controller('users/me')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: MyProfileService) {}

  @Patch('profile')
  updateProfile(
    @Request() request: RequestWithAuthUser,
    @Body() dto: UpdateMyProfileDto,
  ) {
    return this.profileService.updateProfile(request.user.id, dto.fullName);
  }

  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @Patch('password')
  changePassword(
    @Request() request: RequestWithAuthUser,
    @Body() dto: ChangeMyPasswordDto,
  ) {
    return this.profileService.changePassword(
      request.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Put('avatar')
  @UseInterceptors(
    FileInterceptor('avatar', { limits: { fileSize: 2 * 1024 * 1024 } }),
  )
  updateAvatar(
    @Request() request: RequestWithAuthUser,
    @UploadedFile() file?: UploadedAvatarFile,
  ) {
    if (!file) throw new BadRequestException('Please select an avatar image.');
    return this.profileService.updateAvatar(request.user.id, file);
  }

  @Delete('avatar')
  removeAvatar(@Request() request: RequestWithAuthUser) {
    return this.profileService.removeAvatar(request.user.id);
  }
}
