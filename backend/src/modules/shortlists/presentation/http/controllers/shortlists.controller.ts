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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../auth/presentation/http/guards/jwt-auth.guard';
import { CreateShortlistDto } from '../dto/create-shortlist.dto';
import { UpdateShortlistDto } from '../dto/update-shortlist.dto';
import { ShortlistResponseDto } from '../dto/shortlist-response.dto';
import { AddPlayerToShortlistDto } from '../dto/add-player-to-shortlist.dto';
import { UpdateShortlistPlayerNoteDto } from '../dto/update-shortlist-player-note.dto';
import { ShortlistPlayerResponseDto } from '../dto/shortlist-player-response.dto';
import { CreateShortlistUseCase } from '../../../application/use-cases/create-shortlist.use-case';
import { GetShortlistByIdUseCase } from '../../../application/use-cases/get-shortlist-by-id.use-case';
import { ListShortlistsByOwnerUseCase } from '../../../application/use-cases/list-shortlists-by-owner.use-case';
import { UpdateShortlistUseCase } from '../../../application/use-cases/update-shortlist.use-case';
import { DeleteShortlistUseCase } from '../../../application/use-cases/delete-shortlist.use-case';
import { AddPlayerToShortlistUseCase } from '../../../application/use-cases/add-player-to-shortlist.use-case';
import { RemovePlayerFromShortlistUseCase } from '../../../application/use-cases/remove-player-from-shortlist.use-case';
import { UpdateShortlistPlayerNoteUseCase } from '../../../application/use-cases/update-shortlist-player-note.use-case';
import { ListPlayersInShortlistUseCase } from '../../../application/use-cases/list-players-in-shortlist.use-case';
import {
  InvalidShortlistNameError,
  InvalidShortlistOwnerError,
  ShortlistNotFoundError,
  PlayerNotFoundError,
  PlayerAlreadyInShortlistError,
  PlayerNotInShortlistError,
} from '../../../domain/errors/shortlist.errors';

interface RequestWithAuthUser {
  user: {
    id: string;
    email: string;
    fullName: string;
    status: string;
    roles: string[];
  };
}

@ApiTags('Shortlists')
@ApiBearerAuth()
@Controller('shortlists')
@UseGuards(JwtAuthGuard)
export class ShortlistsController {
  constructor(
    private readonly createShortlistUseCase: CreateShortlistUseCase,
    private readonly getShortlistByIdUseCase: GetShortlistByIdUseCase,
    private readonly listShortlistsByOwnerUseCase: ListShortlistsByOwnerUseCase,
    private readonly updateShortlistUseCase: UpdateShortlistUseCase,
    private readonly deleteShortlistUseCase: DeleteShortlistUseCase,
    private readonly addPlayerToShortlistUseCase: AddPlayerToShortlistUseCase,
    private readonly removePlayerFromShortlistUseCase: RemovePlayerFromShortlistUseCase,
    private readonly updateShortlistPlayerNoteUseCase: UpdateShortlistPlayerNoteUseCase,
    private readonly listPlayersInShortlistUseCase: ListPlayersInShortlistUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new shortlist' })
  @ApiResponse({
    status: 201,
    description: 'Shortlist created successfully',
    type: ShortlistResponseDto,
  })
  async create(
    @Body() dto: CreateShortlistDto,
    @Request() req: RequestWithAuthUser,
  ): Promise<ShortlistResponseDto> {
    try {
      const shortlist = await this.createShortlistUseCase.execute({
        ownerId: req.user.id,
        name: dto.name,
        description: dto.description,
        visibility: dto.visibility,
      });
      return ShortlistResponseDto.fromDomain(shortlist);
    } catch (err) {
      if (
        err instanceof InvalidShortlistNameError ||
        err instanceof InvalidShortlistOwnerError
      ) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  @Get()
  @ApiOperation({
    summary: 'List all shortlists owned by the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'List of shortlists',
    type: [ShortlistResponseDto],
  })
  async findAll(
    @Request() req: RequestWithAuthUser,
  ): Promise<ShortlistResponseDto[]> {
    const shortlists = await this.listShortlistsByOwnerUseCase.execute(
      req.user.id,
    );
    return shortlists.map((s) => ShortlistResponseDto.fromDomain(s));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific shortlist by ID' })
  @ApiResponse({
    status: 200,
    description: 'Shortlist details',
    type: ShortlistResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Shortlist not found' })
  async findOne(
    @Param('id') id: string,
    @Request() req: RequestWithAuthUser,
  ): Promise<ShortlistResponseDto> {
    try {
      const shortlist = await this.getShortlistByIdUseCase.execute({
        id,
        ownerId: req.user.id,
      });
      return ShortlistResponseDto.fromDomain(shortlist);
    } catch (err) {
      if (err instanceof ShortlistNotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an owned shortlist' })
  @ApiResponse({
    status: 200,
    description: 'Updated shortlist details',
    type: ShortlistResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Shortlist not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateShortlistDto,
    @Request() req: RequestWithAuthUser,
  ): Promise<ShortlistResponseDto> {
    try {
      const updated = await this.updateShortlistUseCase.execute({
        id,
        ownerId: req.user.id,
        name: dto.name,
        description: dto.description,
        visibility: dto.visibility,
      });
      return ShortlistResponseDto.fromDomain(updated);
    } catch (err) {
      if (err instanceof ShortlistNotFoundError) {
        throw new NotFoundException(err.message);
      }
      if (err instanceof InvalidShortlistNameError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an owned shortlist' })
  @ApiResponse({ status: 200, description: 'Shortlist deleted successfully' })
  @ApiResponse({ status: 404, description: 'Shortlist not found' })
  async remove(
    @Param('id') id: string,
    @Request() req: RequestWithAuthUser,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.deleteShortlistUseCase.execute({
        id,
        ownerId: req.user.id,
      });
      return {
        success: true,
        message: 'Shortlist deleted successfully',
      };
    } catch (err) {
      if (err instanceof ShortlistNotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Get(':id/players')
  @ApiOperation({ summary: 'List all players in an owned shortlist' })
  @ApiResponse({ status: 200, description: 'List of players in the shortlist' })
  @ApiResponse({ status: 404, description: 'Shortlist not found' })
  async listPlayers(
    @Param('id') id: string,
    @Request() req: RequestWithAuthUser,
  ) {
    try {
      return await this.listPlayersInShortlistUseCase.execute({
        shortlistId: id,
        ownerId: req.user.id,
      });
    } catch (err) {
      if (err instanceof ShortlistNotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Post(':id/players')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a player to an owned shortlist' })
  @ApiResponse({
    status: 201,
    description: 'Player added to shortlist',
    type: ShortlistPlayerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Shortlist or Player not found' })
  @ApiResponse({
    status: 409,
    description: 'Player is already in this shortlist',
  })
  async addPlayer(
    @Param('id') id: string,
    @Body() dto: AddPlayerToShortlistDto,
    @Request() req: RequestWithAuthUser,
  ): Promise<ShortlistPlayerResponseDto> {
    try {
      const added = await this.addPlayerToShortlistUseCase.execute({
        shortlistId: id,
        ownerId: req.user.id,
        playerId: dto.playerId,
        note: dto.note,
      });
      return ShortlistPlayerResponseDto.fromDomain(added);
    } catch (err) {
      if (
        err instanceof ShortlistNotFoundError ||
        err instanceof PlayerNotFoundError
      ) {
        throw new NotFoundException(err.message);
      }
      if (err instanceof PlayerAlreadyInShortlistError) {
        throw new ConflictException(err.message);
      }
      throw err;
    }
  }

  @Delete(':id/players/:playerId')
  @ApiOperation({ summary: 'Remove a player from an owned shortlist' })
  @ApiResponse({
    status: 200,
    description: 'Player removed from shortlist successfully',
  })
  @ApiResponse({ status: 404, description: 'Shortlist or Player not found' })
  async removePlayer(
    @Param('id') id: string,
    @Param('playerId') playerId: string,
    @Request() req: RequestWithAuthUser,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.removePlayerFromShortlistUseCase.execute({
        shortlistId: id,
        ownerId: req.user.id,
        playerId,
      });
      return {
        success: true,
        message: 'Player removed from shortlist successfully',
      };
    } catch (err) {
      if (
        err instanceof ShortlistNotFoundError ||
        err instanceof PlayerNotInShortlistError
      ) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Patch(':id/players/:playerId/note')
  @ApiOperation({
    summary: 'Update scout note for a player in an owned shortlist',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated shortlist player record',
    type: ShortlistPlayerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Shortlist or Player not found' })
  async updatePlayerNote(
    @Param('id') id: string,
    @Param('playerId') playerId: string,
    @Body() dto: UpdateShortlistPlayerNoteDto,
    @Request() req: RequestWithAuthUser,
  ): Promise<ShortlistPlayerResponseDto> {
    try {
      const updated = await this.updateShortlistPlayerNoteUseCase.execute({
        shortlistId: id,
        ownerId: req.user.id,
        playerId,
        note: dto.note,
      });
      return ShortlistPlayerResponseDto.fromDomain(updated);
    } catch (err) {
      if (
        err instanceof ShortlistNotFoundError ||
        err instanceof PlayerNotInShortlistError
      ) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }
}
