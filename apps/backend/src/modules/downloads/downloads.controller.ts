import {
  Controller,
  Get,
  Res,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import * as fs from 'fs';
import * as path from 'path';

interface VersionsJson {
  latest: string;
  files: {
    installer: string;
    portable: string;
  };
  updatedAt: string;
}

@ApiTags('Downloads')
@Controller('v1/downloads')
export class DownloadsController {
  private readonly logger = new Logger(DownloadsController.name);
  private readonly RELEASES_PATH = '/root/Sys-Ticket/apps/agent-desktop/release';

  private getVersionsJson(): VersionsJson | null {
    try {
      const versionsPath = path.join(this.RELEASES_PATH, 'versions.json');
      if (fs.existsSync(versionsPath)) {
        return JSON.parse(fs.readFileSync(versionsPath, 'utf8'));
      }
    } catch (error) {
      this.logger.error('Erro ao ler versions.json', error);
    }
    return null;
  }

  @Get('agent/versions')
  @Public()
  @ApiOperation({ summary: 'Obter informações sobre versões disponíveis do agente' })
  @ApiResponse({ status: 200, description: 'Informações de versão retornadas com sucesso' })
  async getVersions() {
    const versions = this.getVersionsJson();

    if (!versions) {
      // Retornar informações padrão se versions.json não existir
      return {
        success: true,
        data: {
          latest: '1.0.0',
          files: {
            installer: 'Sys-Ticket-Agent-Setup.exe',
            portable: 'Sys-Ticket-Agent-Portable.exe',
          },
          available: false,
          message: 'Nenhuma versão publicada ainda. Execute o build do agente.',
        },
      };
    }

    // Verificar se os arquivos existem
    const latestDir = path.join(this.RELEASES_PATH, 'latest');
    const installerExists = fs.existsSync(path.join(latestDir, versions.files.installer));
    const portableExists = fs.existsSync(path.join(latestDir, versions.files.portable));

    return {
      success: true,
      data: {
        ...versions,
        available: installerExists || portableExists,
        installerAvailable: installerExists,
        portableAvailable: portableExists,
      },
    };
  }

  @Get('agent/installer')
  @Public()
  @ApiOperation({ summary: 'Download do instalador do agente (NSIS)' })
  @ApiResponse({ status: 200, description: 'Arquivo enviado para download' })
  @ApiResponse({ status: 404, description: 'Arquivo não encontrado' })
  async downloadInstaller(@Res() res: Response) {
    const versions = this.getVersionsJson();
    const filename = versions?.files?.installer || 'Sys-Ticket-Agent-Setup.exe';
    const filepath = path.join(this.RELEASES_PATH, 'latest', filename);

    this.logger.log(`Download solicitado: ${filepath}`);

    if (!fs.existsSync(filepath)) {
      this.logger.warn(`Arquivo não encontrado: ${filepath}`);
      throw new NotFoundException(
        'Instalador não encontrado. Execute o build do agente primeiro.',
      );
    }

    const stats = fs.statSync(filepath);
    const downloadFilename = versions?.latest
      ? `Sys-Ticket-Agent-Setup-${versions.latest}.exe`
      : filename;

    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', stats.size);

    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
  }

  @Get('agent/portable')
  @Public()
  @ApiOperation({ summary: 'Download da versão portátil do agente' })
  @ApiResponse({ status: 200, description: 'Arquivo enviado para download' })
  @ApiResponse({ status: 404, description: 'Arquivo não encontrado' })
  async downloadPortable(@Res() res: Response) {
    const versions = this.getVersionsJson();
    const filename = versions?.files?.portable || 'Sys-Ticket-Agent-Portable.exe';
    const filepath = path.join(this.RELEASES_PATH, 'latest', filename);

    this.logger.log(`Download solicitado: ${filepath}`);

    if (!fs.existsSync(filepath)) {
      this.logger.warn(`Arquivo não encontrado: ${filepath}`);
      throw new NotFoundException(
        'Versão portátil não encontrada. Execute o build do agente primeiro.',
      );
    }

    const stats = fs.statSync(filepath);
    const downloadFilename = versions?.latest
      ? `Sys-Ticket-Agent-Portable-${versions.latest}.exe`
      : filename;

    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', stats.size);

    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
  }
}
