import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  MATCH_READ_REPOSITORY,
  MatchReadRepository,
} from '../ports/match-read.repository';
import { MatchOrmEntity } from '../../infrastructure/persistence/typeorm/entities/match.orm-entity';

@Injectable()
export class GetMatchByIdUseCase {
  constructor(
    @Inject(MATCH_READ_REPOSITORY)
    private readonly matchReadRepository: MatchReadRepository,
  ) {}

  async execute(id: string): Promise<MatchOrmEntity> {
    const match = await this.matchReadRepository.findById(id);
    if (!match) {
      throw new NotFoundException('Trận đấu không tồn tại');
    }
    return match;
  }
}
