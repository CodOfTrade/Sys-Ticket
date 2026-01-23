import { IsString, IsOptional, IsObject, IsNumber, IsBoolean, ValidateNested, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Sub-DTOs para SystemInfo
class OsInfoDto {
  @ApiProperty()
  @IsString()
  platform: string;

  @ApiProperty()
  @IsString()
  distro: string;

  @ApiProperty()
  @IsString()
  release: string;

  @ApiProperty()
  @IsString()
  arch: string;

  @ApiProperty()
  @IsString()
  hostname: string;
}

class CpuInfoDto {
  @ApiProperty()
  @IsString()
  manufacturer: string;

  @ApiProperty()
  @IsString()
  brand: string;

  @ApiProperty()
  @IsNumber()
  cores: number;

  @ApiProperty()
  @IsNumber()
  speed: number;
}

class MemoryInfoDto {
  @ApiProperty()
  @IsNumber()
  total: number;

  @ApiProperty()
  @IsNumber()
  used: number;

  @ApiProperty()
  @IsNumber()
  free: number;
}

class DiskInfoDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsNumber()
  size: number;

  @ApiProperty()
  @IsNumber()
  used: number;
}

class NetworkInterfaceDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  ip4: string;

  @ApiProperty()
  @IsString()
  mac: string;
}

class NetworkInfoDto {
  @ApiProperty({ type: [NetworkInterfaceDto] })
  @ValidateNested({ each: true })
  @Type(() => NetworkInterfaceDto)
  interfaces: NetworkInterfaceDto[];
}

class AntivirusInfoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  upToDate?: boolean;
}

export class SystemInfoDto {
  @ApiProperty({ type: OsInfoDto })
  @ValidateNested()
  @Type(() => OsInfoDto)
  os: OsInfoDto;

  @ApiProperty({ type: CpuInfoDto })
  @ValidateNested()
  @Type(() => CpuInfoDto)
  cpu: CpuInfoDto;

  @ApiProperty({ type: MemoryInfoDto })
  @ValidateNested()
  @Type(() => MemoryInfoDto)
  memory: MemoryInfoDto;

  @ApiProperty({ type: [DiskInfoDto] })
  @ValidateNested({ each: true })
  @Type(() => DiskInfoDto)
  disks: DiskInfoDto[];

  @ApiProperty({ type: NetworkInfoDto })
  @ValidateNested()
  @Type(() => NetworkInfoDto)
  network: NetworkInfoDto;

  @ApiPropertyOptional({ type: AntivirusInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AntivirusInfoDto)
  antivirus?: AntivirusInfoDto;
}

// DTO para registro do agente
export class RegisterAgentDto {
  @ApiProperty({ description: 'ID do cliente no SIGE' })
  @IsString()
  clientId: string;

  @ApiPropertyOptional({ description: 'ID do contrato' })
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiProperty({ description: 'Nome da máquina' })
  @IsString()
  machineName: string;

  @ApiPropertyOptional({ description: 'Localização física' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Departamento' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Nome do usuário responsável' })
  @IsOptional()
  @IsString()
  assignedUserName?: string;

  @ApiPropertyOptional({ description: 'Email do usuário responsável' })
  @IsOptional()
  @IsString()
  assignedUserEmail?: string;

  @ApiPropertyOptional({
    description: 'Código do recurso (etiqueta). Se não fornecido, será gerado automaticamente'
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9\-]+$/, {
    message: 'Código do recurso deve conter apenas letras maiúsculas, números e hífens'
  })
  resourceCode?: string;

  @ApiProperty({ description: 'Informações do sistema', type: SystemInfoDto })
  @ValidateNested()
  @Type(() => SystemInfoDto)
  systemInfo: SystemInfoDto;
}

// DTO para heartbeat
class QuickStatusDto {
  @ApiProperty({ description: 'Uso de CPU em porcentagem' })
  @IsNumber()
  cpuUsage: number;

  @ApiProperty({ description: 'Uso de memória em porcentagem' })
  @IsNumber()
  memoryUsage: number;

  @ApiProperty({ description: 'Tempo de atividade em segundos' })
  @IsNumber()
  uptime: number;
}

export class HeartbeatDto {
  @ApiProperty({ description: 'ID do agente' })
  @IsString()
  agentId: string;

  @ApiProperty({ description: 'Timestamp ISO' })
  @IsString()
  timestamp: string;

  @ApiProperty({ description: 'Status rápido do sistema', type: QuickStatusDto })
  @ValidateNested()
  @Type(() => QuickStatusDto)
  quickStatus: QuickStatusDto;
}

// DTO para atualização de inventário
export class UpdateInventoryDto {
  @ApiProperty({ description: 'ID do agente' })
  @IsString()
  agentId: string;

  @ApiProperty({ description: 'Informações completas do sistema', type: SystemInfoDto })
  @ValidateNested()
  @Type(() => SystemInfoDto)
  systemInfo: SystemInfoDto;
}

// DTO para criar ticket via agente
export class CreateAgentTicketDto {
  @ApiProperty({ description: 'ID do agente' })
  @IsString()
  agentId: string;

  @ApiProperty({ description: 'Título do ticket' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Descrição do problema' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Prioridade (low, medium, high, critical)' })
  @IsString()
  priority: string;

  @ApiPropertyOptional({ description: 'Categoria' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Se tem screenshot anexado' })
  @IsBoolean()
  hasScreenshot: boolean;

  @ApiPropertyOptional({ description: 'Screenshot em base64' })
  @IsOptional()
  @IsString()
  screenshotBase64?: string;

  @ApiProperty({ description: 'Informações do sistema no momento' })
  @IsObject()
  systemInfo: Record<string, any>;
}
