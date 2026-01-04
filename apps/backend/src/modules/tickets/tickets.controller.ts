import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';

@ApiTags('Tickets')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'tickets', version: '1' })
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os tickets' })
  async findAll() {
    return this.ticketsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar ticket por ID' })
  async findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo ticket' })
  async create(@Body() ticketData: any) {
    return this.ticketsService.create(ticketData);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar ticket' })
  async update(@Param('id') id: string, @Body() ticketData: any) {
    return this.ticketsService.update(id, ticketData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover ticket' })
  async remove(@Param('id') id: string) {
    return this.ticketsService.remove(id);
  }
}
