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

  it('should fail validation if nationality exceeds 100 characters', async () => {
    const longNationality = 'A'.repeat(101);
    const dto = plainToInstance(SearchPlayersQueryDto, {
      nationality: longNationality,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('nationality');
  });
});
