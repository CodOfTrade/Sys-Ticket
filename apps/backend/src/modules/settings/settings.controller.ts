import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SettingsService } from './settings.service';
import { SettingKey } from './entities/system-setting.entity';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('v1/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * GET /v1/settings
   * Buscar todas as configuracoes
   */
  @Get()
  async findAll() {
    const settings = await this.settingsService.findAll();
    return {
      success: true,
      data: settings,
    };
  }

  /**
   * GET /v1/settings/logos
   * Buscar todas as logos (publico para login page)
   */
  @Public()
  @Get('logos')
  async getLogos() {
    const logos = await this.settingsService.getAllLogos();
    return {
      success: true,
      data: logos,
    };
  }

  /**
   * POST /v1/settings/logos/:type
   * Upload de logo
   * Tipos: report, system, login
   */
  @Roles('admin')
  @Post('logos/:type')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @Param('type') type: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }), // 2MB
          new FileTypeValidator({ fileType: 'image/png' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const keyMap: Record<string, SettingKey> = {
      report: SettingKey.LOGO_REPORT,
      system: SettingKey.LOGO_SYSTEM,
      login: SettingKey.LOGO_LOGIN,
    };

    const key = keyMap[type];
    if (!key) {
      throw new BadRequestException(
        'Tipo de logo invalido. Use: report, system ou login',
      );
    }

    const setting = await this.settingsService.uploadLogo(key, file);
    return {
      success: true,
      data: setting,
      message: 'Logo atualizada com sucesso',
    };
  }

  /**
   * DELETE /v1/settings/logos/:type
   * Remover logo
   */
  @Roles('admin')
  @Delete('logos/:type')
  async removeLogo(@Param('type') type: string) {
    const keyMap: Record<string, SettingKey> = {
      report: SettingKey.LOGO_REPORT,
      system: SettingKey.LOGO_SYSTEM,
      login: SettingKey.LOGO_LOGIN,
    };

    const key = keyMap[type];
    if (!key) {
      throw new BadRequestException(
        'Tipo de logo invalido. Use: report, system ou login',
      );
    }

    await this.settingsService.removeLogo(key);
    return {
      success: true,
      message: 'Logo removida com sucesso',
    };
  }

  /**
   * GET /v1/settings/:key
   * Buscar configuracao por chave
   * IMPORTANTE: Esta rota deve ficar por ultimo para nao interceptar as outras
   */
  @Get(':key')
  async findByKey(@Param('key') key: SettingKey) {
    const setting = await this.settingsService.findByKey(key);
    return {
      success: true,
      data: setting,
    };
  }
}
