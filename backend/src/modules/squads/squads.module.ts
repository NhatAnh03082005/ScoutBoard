import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SquadOrmEntity } from './infrastructure/persistence/typeorm/entities/squad.orm-entity';
import { SquadPlayerOrmEntity } from './infrastructure/persistence/typeorm/entities/squad-player.orm-entity';
import { SQUAD_REPOSITORY } from './domain/repositories/squad.repository';
import { SQUAD_PLAYER_REPOSITORY } from './domain/repositories/squad-player.repository';
import { TypeOrmSquadRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-squad.repository';
import { TypeOrmSquadPlayerRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-squad-player.repository';
import { PlayersModule } from '../players/players.module';
import { CreateSquadUseCase } from './application/use-cases/create-squad.use-case';
import { GetSquadByIdUseCase } from './application/use-cases/get-squad-by-id.use-case';
import { ListSquadsByOwnerUseCase } from './application/use-cases/list-squads-by-owner.use-case';
import { UpdateSquadUseCase } from './application/use-cases/update-squad.use-case';
import { DeleteSquadUseCase } from './application/use-cases/delete-squad.use-case';
import { AddPlayerToSquadUseCase } from './application/use-cases/add-player-to-squad.use-case';
import { UpdateSquadPlayerUseCase } from './application/use-cases/update-squad-player.use-case';
import { RemovePlayerFromSquadUseCase } from './application/use-cases/remove-player-from-squad.use-case';
import { ListPlayersInSquadUseCase } from './application/use-cases/list-players-in-squad.use-case';
import { SquadsController } from './presentation/http/controllers/squads.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SquadOrmEntity, SquadPlayerOrmEntity]),
    PlayersModule,
  ],
  controllers: [SquadsController],
  providers: [
    {
      provide: SQUAD_REPOSITORY,
      useClass: TypeOrmSquadRepository,
    },
    {
      provide: SQUAD_PLAYER_REPOSITORY,
      useClass: TypeOrmSquadPlayerRepository,
    },
    CreateSquadUseCase,
    GetSquadByIdUseCase,
    ListSquadsByOwnerUseCase,
    UpdateSquadUseCase,
    DeleteSquadUseCase,
    AddPlayerToSquadUseCase,
    UpdateSquadPlayerUseCase,
    RemovePlayerFromSquadUseCase,
    ListPlayersInSquadUseCase,
  ],
  exports: [
    SQUAD_REPOSITORY,
    SQUAD_PLAYER_REPOSITORY,
    CreateSquadUseCase,
    GetSquadByIdUseCase,
    ListSquadsByOwnerUseCase,
    UpdateSquadUseCase,
    DeleteSquadUseCase,
    AddPlayerToSquadUseCase,
    UpdateSquadPlayerUseCase,
    RemovePlayerFromSquadUseCase,
    ListPlayersInSquadUseCase,
  ],
})
export class SquadsModule {}
