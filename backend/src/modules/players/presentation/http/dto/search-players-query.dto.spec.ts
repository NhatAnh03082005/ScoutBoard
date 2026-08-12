import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SearchPlayersQueryDto } from './search-players-query.dto';
import { PreferredFoot } from '../../../domain/enums/preferred-foot.enum';

describe('SearchPlayersQueryDto (Validation Unit)', () => {
  it('should pass validation with valid preferredFoot enum values', async () => {
    for (const foot of [
      PreferredFoot.LEFT,
      PreferredFoot.RIGHT,
      PreferredFoot.BOTH,
    ]) {
      const dto = plainToInstance(SearchPlayersQueryDto, {
        preferredFoot: foot,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });

  it('should fail validation with invalid preferredFoot strings', async () => {
    const invalidValues = ['left', 'Right', 'UNKNOWN', 'INVALID'];
    for (const val of invalidValues) {
      const dto = plainToInstance(SearchPlayersQueryDto, {
        preferredFoot: val,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('preferredFoot');
    }
  });

  it('should trim nationality string and convert empty string to undefined', async () => {
    const dto = plainToInstance(SearchPlayersQueryDto, {
      nationality: '  Brazil  ',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.nationality).toBe('Brazil');

    const emptyDto = plainToInstance(SearchPlayersQueryDto, {
      nationality: '   ',
    });
    expect(emptyDto.nationality).toBeUndefined();
  });

  it('should pass validation for valid currentTeamId, competitionId, minAge, maxAge, minHeightCm, maxHeightCm', async () => {
    const dto = plainToInstance(SearchPlayersQueryDto, {
      currentTeamId: '1eaece5e-59e9-4a16-b521-bec5c13845b3',
      competitionId: '9c5e531b-bbad-426e-9164-0d91e7e19151',
      position: 'LW',
      minAge: 18,
      maxAge: 30,
      minHeightCm: 170,
      maxHeightCm: 190,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation for invalid UUID in currentTeamId or competitionId', async () => {
    const dto = plainToInstance(SearchPlayersQueryDto, {
      currentTeamId: 'invalid-uuid',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('currentTeamId');
  });

  it('should fail validation for out of range age or height values', async () => {
    const dto = plainToInstance(SearchPlayersQueryDto, {
      minAge: -5,
      maxAge: 150,
      minHeightCm: 100,
      maxHeightCm: 250,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
