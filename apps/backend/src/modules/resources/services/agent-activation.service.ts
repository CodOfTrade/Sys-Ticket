import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { AgentActivationCode } from '../entities/agent-activation-code.entity';
import { randomBytes } from 'crypto';

export interface CreateActivationCodeDto {
  description?: string;
  expiresInHours?: number; // Default: 24 horas
  maxUses?: number; // Default: 0 (ilimitado)
  createdByUserId?: string;
  createdByUserName?: string;
}

@Injectable()
export class AgentActivationService {
  private readonly logger = new Logger(AgentActivationService.name);

  constructor(
    @InjectRepository(AgentActivationCode)
    private readonly codeRepository: Repository<AgentActivationCode>,
  ) {}

  /**
   * Gera um código de ativação único
   */
  private generateCode(): string {
    // Formato: XXXX-XXXX-XXXX (letras maiúsculas e números)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem I, O, 0, 1 para evitar confusão
    let code = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Cria um novo código de ativação
   */
  async createCode(dto: CreateActivationCodeDto): Promise<AgentActivationCode> {
    const expiresInHours = dto.expiresInHours || 24;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Gerar código único
    let code: string;
    let attempts = 0;
    do {
      code = this.generateCode();
      const existing = await this.codeRepository.findOne({ where: { code } });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new BadRequestException('Não foi possível gerar código único');
    }

    const activationCode = this.codeRepository.create({
      code,
      description: dto.description || 'Código de ativação para instalação de agentes',
      expires_at: expiresAt,
      max_uses: dto.maxUses || 0,
      times_used: 0,
      is_active: true,
      created_by_user_id: dto.createdByUserId,
      created_by_user_name: dto.createdByUserName,
    });

    await this.codeRepository.save(activationCode);
    this.logger.log(`Código de ativação criado: ${code} (válido até ${expiresAt.toISOString()})`);

    return activationCode;
  }

  /**
   * Valida um código de ativação
   */
  async validateCode(code: string): Promise<{ valid: boolean; message: string }> {
    const activationCode = await this.codeRepository.findOne({
      where: { code: code.toUpperCase().trim() },
    });

    if (!activationCode) {
      return { valid: false, message: 'Código de ativação inválido' };
    }

    if (!activationCode.is_active) {
      return { valid: false, message: 'Código de ativação desativado' };
    }

    if (new Date() > activationCode.expires_at) {
      return { valid: false, message: 'Código de ativação expirado' };
    }

    if (activationCode.max_uses > 0 && activationCode.times_used >= activationCode.max_uses) {
      return { valid: false, message: 'Código de ativação atingiu limite de usos' };
    }

    return { valid: true, message: 'Código válido' };
  }

  /**
   * Registra uso do código (incrementa contador)
   */
  async useCode(code: string): Promise<void> {
    const activationCode = await this.codeRepository.findOne({
      where: { code: code.toUpperCase().trim() },
    });

    if (activationCode) {
      activationCode.times_used += 1;
      await this.codeRepository.save(activationCode);
      this.logger.log(`Código ${code} usado (total: ${activationCode.times_used})`);
    }
  }

  /**
   * Valida código e lança exceção se inválido (para uso em guards/middleware)
   */
  async validateOrThrow(code: string): Promise<void> {
    const result = await this.validateCode(code);
    if (!result.valid) {
      throw new UnauthorizedException(result.message);
    }
  }

  /**
   * Lista códigos ativos
   */
  async listActiveCodes(): Promise<AgentActivationCode[]> {
    return this.codeRepository.find({
      where: {
        is_active: true,
        expires_at: MoreThan(new Date()),
      },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Lista todos os códigos (incluindo expirados)
   */
  async listAllCodes(limit = 50): Promise<AgentActivationCode[]> {
    return this.codeRepository.find({
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  /**
   * Desativa um código
   */
  async deactivateCode(id: string): Promise<void> {
    await this.codeRepository.update(id, { is_active: false });
    this.logger.log(`Código ${id} desativado`);
  }

  /**
   * Remove códigos expirados (para limpeza periódica)
   */
  async cleanupExpiredCodes(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.codeRepository
      .createQueryBuilder()
      .delete()
      .where('expires_at < :date', { date: thirtyDaysAgo })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`${result.affected} códigos expirados removidos`);
    }

    return result.affected || 0;
  }
}
