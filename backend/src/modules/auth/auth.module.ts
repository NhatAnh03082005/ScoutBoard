import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { RefreshTokenOrmEntity } from './infrastructure/persistence/typeorm/entities/refresh-token.orm-entity';
import { REFRESH_TOKEN_REPOSITORY } from './domain/repositories/refresh-token.repository';
import { TypeOrmRefreshTokenRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-refresh-token.repository';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher';
import { TOKEN_SERVICE } from './application/ports/token-service.port';
import { JwtTokenService } from './infrastructure/security/jwt-token.service';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RefreshTokensUseCase } from './application/use-cases/refresh-tokens.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { AuthController } from './presentation/http/controllers/auth.controller';
import { JwtStrategy } from './presentation/http/strategies/jwt.strategy';
import { RolesGuard } from './presentation/http/guards/roles.guard';
import { ProfileController } from '../users/presentation/http/controllers/profile.controller';
import { MyProfileService } from '../users/application/services/my-profile.service';
import { AvatarStorageService } from '../users/infrastructure/storage/avatar-storage.service';
import { PublicAvatarController } from '../users/presentation/http/controllers/public-avatar.controller';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    PassportModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([RefreshTokenOrmEntity]),
  ],
  controllers: [AuthController, ProfileController, PublicAvatarController],
  providers: [
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: TypeOrmRefreshTokenRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,
    },
    {
      provide: TOKEN_SERVICE,
      useClass: JwtTokenService,
    },
    RegisterUseCase,
    LoginUseCase,
    RefreshTokensUseCase,
    LogoutUseCase,
    JwtStrategy,
    RolesGuard,
    MyProfileService,
    AvatarStorageService,
  ],
  exports: [
    REFRESH_TOKEN_REPOSITORY,
    PASSWORD_HASHER,
    TOKEN_SERVICE,
    RegisterUseCase,
    LoginUseCase,
  ],
})
export class AuthModule {}
