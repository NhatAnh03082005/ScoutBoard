import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  NotFoundException,
  BadRequestException,
  ConflictException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../auth/presentation/http/guards/jwt-auth.guard';
import { CreateSquadDto } from '../dto/create-squad.dto';
import { UpdateSquadDto } from '../dto/update-squad.dto';
import { SquadResponseDto } from '../dto/squad-response.dto';
import { AddPlayerToSquadDto } from '../dto/add-player-to-squad.dto';
import { UpdateSquadPlayerDto } from '../dto/update-squad-player.dto';
import { SquadPlayerResponseDto } from '../dto/squad-player-response.dto';
import { CreateSquadUseCase } from '../../../application/use-cases/create-squad.use-case';
import { GetSquadByIdUseCase } from '../../../application/use-cases/get-squad-by-id.use-case';
import { ListSquadsByOwnerUseCase } from '../../../application/use-cases/list-squads-by-owner.use-case';
import { UpdateSquadUseCase } from '../../../application/use-cases/update-squad.use-case';
import { DeleteSquadUseCase } from '../../../application/use-cases/delete-squad.use-case';
import { AddPlayerToSquadUseCase } from '../../../application/use-cases/add-player-to-squad.use-case';
import { UpdateSquadPlayerUseCase } from '../../../application/use-cases/update-squad-player.use-case';
import { RemovePlayerFromSquadUseCase } from '../../../application/use-cases/remove-player-from-squad.use-case';
import { ListPlayersInSquadUseCase } from '../../../application/use-cases/list-players-in-squad.use-case';
import {
  InvalidSquadNameError,
  InvalidSquadOwnerError,
  InvalidFormationCodeError,
  InvalidSquadPlayerRoleError,
  SquadNotFoundError,
  PlayerNotFoundError,
  PlayerAlreadyInSquadError,
  PlayerNotInSquadError,
  SquadStarterSlotAlreadyOccupiedError,
  SquadCaptainAlreadyAssignedError,
  CaptainMustBeStarterError,
} from '../../../domain/errors/squad.errors';

interface RequestWithAuthUser {
  user: {
    id: string;
    email: string;
    fullName: string;
    status: string;
    roles: string[];
  };
}

@ApiTags('Squads')
@ApiBearerAuth()
@Controller('squads')
@UseGuards(JwtAuthGuard)
export class SquadsController {
  constructor(
    private readonly createSquadUseCase: CreateSquadUseCase,
    private readonly getSquadByIdUseCase: GetSquadByIdUseCase,
    private readonly listSquadsByOwnerUseCase: ListSquadsByOwnerUseCase,
    private readonly updateSquadUseCase: UpdateSquadUseCase,
    private readonly deleteSquadUseCase: DeleteSquadUseCase,
    private readonly addPlayerToSquadUseCase: AddPlayerToSquadUseCase,
    private readonly updateSquadPlayerUseCase: UpdateSquadPlayerUseCase,
    private readonly removePlayerFromSquadUseCase: RemovePlayerFromSquadUseCase,
    private readonly listPlayersInSquadUseCase: ListPlayersInSquadUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new tactical squad' })
  @ApiResponse({
    status: 201,
    description: 'Squad created successfully',
    type: SquadResponseDto,
  })
  async create(
    @Body() dto: CreateSquadDto,
    @Request() req: RequestWithAuthUser,
  ): Promise<SquadResponseDto> {
    try {
      const squad = await this.createSquadUseCase.execute({
        ownerId: req.user.id,
        name: dto.name,
        formationCode: dto.formationCode,
        seasonId: dto.seasonId,
        description: dto.description,
        visibility: dto.visibility,
      });
      return SquadResponseDto.fromDomain(squad);
    } catch (err) {
      if (
        err instanceof InvalidSquadNameError ||
        err instanceof InvalidSquadOwnerError ||
        err instanceof InvalidFormationCodeError
      ) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  @Get()
  @ApiOperation({ summary: 'List all squads owned by the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'List of squads',
    type: [SquadResponseDto],
  })
  async findAll(@Request() req: RequestWithAuthUser): Promise<SquadResponseDto[]> {
    const squads = await this.listSquadsByOwnerUseCase.execute(req.user.id);
    return squads.map((s) => SquadResponseDto.fromDomain(s));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific squad by ID' })
  @ApiResponse({
    status: 200,
    description: 'Squad details',
    type: SquadResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Squad not found' })
  async findOne(
    @Param('id') id: string,
    @Request() req: RequestWithAuthUser,
  ): Promise<SquadResponseDto> {
    try {
      const squad = await this.getSquadByIdUseCase.execute({
        id,
        ownerId: req.user.id,
      });
      return SquadResponseDto.fromDomain(squad);
    } catch (err) {
      if (err instanceof SquadNotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an owned squad' })
  @ApiResponse({
    status: 200,
    description: 'Updated squad details',
    type: SquadResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Squad not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSquadDto,
    @Request() req: RequestWithAuthUser,
  ): Promise<SquadResponseDto> {
    try {
      const updated = await this.updateSquadUseCase.execute({
        id,
        ownerId: req.user.id,
        name: dto.name,
        formationCode: dto.formationCode,
        seasonId: dto.seasonId,
        description: dto.description,
        visibility: dto.visibility,
      });
      return SquadResponseDto.fromDomain(updated);
    } catch (err) {
      if (err instanceof SquadNotFoundError) {
        throw new NotFoundException(err.message);
      }
      if (
        err instanceof InvalidSquadNameError ||
        err instanceof InvalidFormationCodeError
      ) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an owned squad' })
  @ApiResponse({ status: 200, description: 'Squad deleted successfully' })
  @ApiResponse({ status: 404, description: 'Squad not found' })
  async remove(
    @Param('id') id: string,
    @Request() req: RequestWithAuthUser,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.deleteSquadUseCase.execute({
        id,
        ownerId: req.user.id,
      });
      return {
        success: true,
        message: 'Squad deleted successfully',
      };
    } catch (err) {
      if (err instanceof SquadNotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Get(':id/players')
  @ApiOperation({ summary: 'List all players in an owned squad with details' })
  @ApiResponse({ status: 200, description: 'List of players in the squad' })
  @ApiResponse({ status: 404, description: 'Squad not found' })
  async listPlayers(
    @Param('id') id: string,
    @Request() req: RequestWithAuthUser,
  ) {
    try {
      return await this.listPlayersInSquadUseCase.execute({
        squadId: id,
        ownerId: req.user.id,
      });
    } catch (err) {
      if (err instanceof SquadNotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Post(':id/players')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a player to an owned squad' })
  @ApiResponse({
    status: 201,
    description: 'Player added to squad',
    type: SquadPlayerResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid role, slot or captain constraints' })
  @ApiResponse({ status: 404, description: 'Squad or Player not found' })
  @ApiResponse({ status: 409, description: 'Player/Slot/Captain conflict' })
  async addPlayer(
    @Param('id') id: string,
    @Body() dto: AddPlayerToSquadDto,
    @Request() req: RequestWithAuthUser,
  ): Promise<SquadPlayerResponseDto> {
    try {
      const added = await this.addPlayerToSquadUseCase.execute({
        squadId: id,
        ownerId: req.user.id,
        playerId: dto.playerId,
        slotCode: dto.slotCode,
        role: dto.role,
        isCaptain: dto.isCaptain,
        displayOrder: dto.displayOrder,
      });
      return SquadPlayerResponseDto.fromDomain(added);
    } catch (err) {
      if (err instanceof SquadNotFoundError || err instanceof PlayerNotFoundError) {
        throw new NotFoundException(err.message);
      }
      if (
        err instanceof PlayerAlreadyInSquadError ||
        err instanceof SquadStarterSlotAlreadyOccupiedError ||
        err instanceof SquadCaptainAlreadyAssignedError
      ) {
        throw new ConflictException(err.message);
      }
      if (
        err instanceof InvalidSquadPlayerRoleError ||
        err instanceof CaptainMustBeStarterError
      ) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  @Patch(':id/players/:playerId')
  @ApiOperation({ summary: 'Update a player within an owned squad (slot, role, captain, order)' })
  @ApiResponse({
    status: 200,
    description: 'Player updated in squad',
    type: SquadPlayerResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid role, slot or captain constraints' })
  @ApiResponse({ status: 404, description: 'Squad or Player not found in squad' })
  @ApiResponse({ status: 409, description: 'Slot or Captain conflict' })
  async updatePlayer(
    @Param('id') id: string,
    @Param('playerId') playerId: string,
    @Body() dto: UpdateSquadPlayerDto,
    @Request() req: RequestWithAuthUser,
  ): Promise<SquadPlayerResponseDto> {
    try {
      const updated = await this.updateSquadPlayerUseCase.execute({
        squadId: id,
        ownerId: req.user.id,
        playerId,
        slotCode: dto.slotCode,
        role: dto.role,
        isCaptain: dto.isCaptain,
        displayOrder: dto.displayOrder,
      });
      return SquadPlayerResponseDto.fromDomain(updated);
    } catch (err) {
      if (err instanceof SquadNotFoundError || err instanceof PlayerNotInSquadError) {
        throw new NotFoundException(err.message);
      }
      if (
        err instanceof SquadStarterSlotAlreadyOccupiedError ||
        err instanceof SquadCaptainAlreadyAssignedError
      ) {
        throw new ConflictException(err.message);
      }
      if (
        err instanceof InvalidSquadPlayerRoleError ||
        err instanceof CaptainMustBeStarterError
      ) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  @Delete(':id/players/:playerId')
  @ApiOperation({ summary: 'Remove a player from an owned squad' })
  @ApiResponse({ status: 200, description: 'Player removed from squad successfully' })
  @ApiResponse({ status: 404, description: 'Squad or Player not found in squad' })
  async removePlayer(
    @Param('id') id: string,
    @Param('playerId') playerId: string,
    @Request() req: RequestWithAuthUser,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.removePlayerFromSquadUseCase.execute({
        squadId: id,
        ownerId: req.user.id,
        playerId,
      });
      return {
        success: true,
        message: 'Player removed from squad successfully',
      };
    } catch (err) {
      if (err instanceof SquadNotFoundError || err instanceof PlayerNotInSquadError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }
}
