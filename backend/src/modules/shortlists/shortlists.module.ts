import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShortlistOrmEntity } from './infrastructure/persistence/typeorm/entities/shortlist.orm-entity';
import { ShortlistPlayerOrmEntity } from './infrastructure/persistence/typeorm/entities/shortlist-player.orm-entity';
import { SHORTLIST_REPOSITORY } from './domain/repositories/shortlist.repository';
import { SHORTLIST_PLAYER_REPOSITORY } from './domain/repositories/shortlist-player.repository';
import { TypeOrmShortlistRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-shortlist.repository';
import { TypeOrmShortlistPlayerRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-shortlist-player.repository';
import { PlayersModule } from '../players/players.module';
import { CreateShortlistUseCase } from './application/use-cases/create-shortlist.use-case';
import { GetShortlistByIdUseCase } from './application/use-cases/get-shortlist-by-id.use-case';
import { ListShortlistsByOwnerUseCase } from './application/use-cases/list-shortlists-by-owner.use-case';
import { UpdateShortlistUseCase } from './application/use-cases/update-shortlist.use-case';
import { DeleteShortlistUseCase } from './application/use-cases/delete-shortlist.use-case';
import { AddPlayerToShortlistUseCase } from './application/use-cases/add-player-to-shortlist.use-case';
import { RemovePlayerFromShortlistUseCase } from './application/use-cases/remove-player-from-shortlist.use-case';
import { UpdateShortlistPlayerNoteUseCase } from './application/use-cases/update-shortlist-player-note.use-case';
import { ListPlayersInShortlistUseCase } from './application/use-cases/list-players-in-shortlist.use-case';
import { ShortlistsController } from './presentation/http/controllers/shortlists.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShortlistOrmEntity, ShortlistPlayerOrmEntity]),
    PlayersModule,
  ],
  controllers: [ShortlistsController],
  providers: [
    {
      provide: SHORTLIST_REPOSITORY,
      useClass: TypeOrmShortlistRepository,
    },
    {
      provide: SHORTLIST_PLAYER_REPOSITORY,
      useClass: TypeOrmShortlistPlayerRepository,
    },
    CreateShortlistUseCase,
    GetShortlistByIdUseCase,
    ListShortlistsByOwnerUseCase,
    UpdateShortlistUseCase,
    DeleteShortlistUseCase,
    AddPlayerToShortlistUseCase,
    RemovePlayerFromShortlistUseCase,
    UpdateShortlistPlayerNoteUseCase,
    ListPlayersInShortlistUseCase,
  ],
  exports: [
    SHORTLIST_REPOSITORY,
    SHORTLIST_PLAYER_REPOSITORY,
    CreateShortlistUseCase,
    GetShortlistByIdUseCase,
    ListShortlistsByOwnerUseCase,
    UpdateShortlistUseCase,
    DeleteShortlistUseCase,
    AddPlayerToShortlistUseCase,
    RemovePlayerFromShortlistUseCase,
    UpdateShortlistPlayerNoteUseCase,
    ListPlayersInShortlistUseCase,
  ],
})
export class ShortlistsModule {}
