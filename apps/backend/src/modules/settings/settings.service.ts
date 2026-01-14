import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting, SettingKey } from './entities/system-setting.entity';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly uploadDir = process.env.UPLOAD_DIR || './uploads';
  private readonly logosDir: string;

  constructor(
    @InjectRepository(SystemSetting)
    private settingsRepository: Repository<SystemSetting>,
  ) {
    this.logosDir = path.join(this.uploadDir, 'logos');
    this.ensureUploadDirExists();
  }

  private async ensureUploadDirExists() {
    try {
      await fs.mkdir(this.logosDir, { recursive: true });
      this.logger.log(`Diretório de logos garantido: ${this.logosDir}`);
    } catch (error) {
      this.logger.error('Erro ao criar diretório de logos', error);
    }
  }

  /**
   * Buscar todas as configurações
   */
  async findAll(): Promise<SystemSetting[]> {
    return this.settingsRepository.find();
  }

  /**
   * Buscar configuração por chave
   */
  async findByKey(key: SettingKey): Promise<SystemSetting | null> {
    return this.settingsRepository.findOne({ where: { key } });
  }

  /**
   * Buscar valor de uma configuração
   */
  async getValue(key: SettingKey): Promise<string | null> {
    const setting = await this.findByKey(key);
    return setting?.value || null;
  }

  /**
   * Atualizar ou criar configuração
   */
  async setValue(
    key: SettingKey,
    value: string | null,
    description?: string,
  ): Promise<SystemSetting> {
    let setting = await this.findByKey(key);

    if (setting) {
      setting.value = value;
      if (description) {
        setting.description = description;
      }
    } else {
      setting = this.settingsRepository.create({
        key,
        value,
        description,
      });
    }

    return this.settingsRepository.save(setting);
  }

  /**
   * Upload de logo
   */
  async uploadLogo(
    key: SettingKey,
    file: Express.Multer.File,
  ): Promise<SystemSetting> {
    try {
      // Validar que é uma imagem PNG
      if (!file.mimetype.includes('png')) {
        throw new Error('Apenas arquivos PNG são permitidos');
      }

      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(4).toString('hex');
      const storedFilename = `${key}_${timestamp}_${randomString}.png`;
      const filePath = path.join(this.logosDir, storedFilename);

      // Deletar logo antiga se existir
      const oldSetting = await this.findByKey(key);
      if (oldSetting?.value) {
        try {
          const oldPath = path.join(this.uploadDir, oldSetting.value.replace('/uploads/', ''));
          await fs.unlink(oldPath);
          this.logger.log(`Logo antiga deletada: ${oldPath}`);
        } catch (error) {
          this.logger.warn('Logo antiga não encontrada para deletar');
        }
      }

      // Salvar arquivo no disco
      await fs.writeFile(filePath, file.buffer);
      this.logger.log(`Logo salva: ${filePath}`);

      // URL relativa
      const url = `/uploads/logos/${storedFilename}`;

      // Salvar/atualizar configuração
      return this.setValue(key, url, this.getLogoDescription(key));
    } catch (error) {
      this.logger.error(`Erro ao fazer upload de logo ${key}`, error);
      throw error;
    }
  }

  /**
   * Remover logo
   */
  async removeLogo(key: SettingKey): Promise<void> {
    const setting = await this.findByKey(key);

    if (setting?.value) {
      try {
        const filePath = path.join(this.uploadDir, setting.value.replace('/uploads/', ''));
        await fs.unlink(filePath);
        this.logger.log(`Logo removida: ${filePath}`);
      } catch (error) {
        this.logger.warn('Arquivo de logo não encontrado');
      }

      await this.setValue(key, null);
    }
  }

  /**
   * Buscar todas as logos
   */
  async getAllLogos(): Promise<{
    logo_report: string | null;
    logo_system: string | null;
    logo_login: string | null;
  }> {
    const [logoReport, logoSystem, logoLogin] = await Promise.all([
      this.getValue(SettingKey.LOGO_REPORT),
      this.getValue(SettingKey.LOGO_SYSTEM),
      this.getValue(SettingKey.LOGO_LOGIN),
    ]);

    return {
      logo_report: logoReport,
      logo_system: logoSystem,
      logo_login: logoLogin,
    };
  }

  private getLogoDescription(key: SettingKey): string {
    const descriptions: Record<SettingKey, string> = {
      [SettingKey.LOGO_REPORT]: 'Logo para relatórios e apontamentos offline (PDF). Tamanho recomendado: 300x100px',
      [SettingKey.LOGO_SYSTEM]: 'Logo do sistema exibida no header/sidebar. Tamanho recomendado: 180x50px',
      [SettingKey.LOGO_LOGIN]: 'Logo exibida na página de login. Tamanho recomendado: 250x80px',
      [SettingKey.COMPANY_NAME]: 'Nome da empresa',
    };
    return descriptions[key] || '';
  }
}
