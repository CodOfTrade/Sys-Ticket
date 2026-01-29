import {
  Injectable,
  NotFoundException,
  ConflictException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEmailTemplate } from '../entities/notification-email-template.entity';
import { CreateEmailTemplateDto } from '../dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from '../dto/update-email-template.dto';
import {
  adminNotificationTemplate,
  AdminNotificationData,
} from '../../email/templates/notification-admin.template';
import {
  clientNotificationTemplate,
  ClientNotificationData,
} from '../../email/templates/notification-client.template';

@Injectable()
export class EmailTemplateService implements OnModuleInit {
  private readonly logger = new Logger(EmailTemplateService.name);

  constructor(
    @InjectRepository(NotificationEmailTemplate)
    private readonly templateRepository: Repository<NotificationEmailTemplate>,
  ) {}

  /**
   * Inicializa templates padrão se não existirem
   */
  async onModuleInit(): Promise<void> {
    const alertTypes = [
      'license_expiring_30',
      'license_expiring_15',
      'license_expiring_7',
      'license_expired',
    ];

    for (const alertType of alertTypes) {
      // Template para admins
      await this.ensureDefaultTemplate(alertType, 'admin');
      // Template para clientes
      await this.ensureDefaultTemplate(alertType, 'client');
    }
  }

  private async ensureDefaultTemplate(
    alertType: string,
    audience: 'admin' | 'client',
  ): Promise<void> {
    const uniqueKey = `${alertType}_${audience}`;

    const exists = await this.templateRepository.findOne({
      where: { unique_key: uniqueKey },
    });
    if (exists) return;

    // Obter template HTML padrão
    const mockData = this.getMockDataForType(alertType, audience);
    const htmlBody =
      audience === 'admin'
        ? adminNotificationTemplate(mockData as AdminNotificationData)
        : clientNotificationTemplate(mockData as ClientNotificationData);

    // Gerar versão texto
    const textBody = this.generateTextVersion(alertType, audience);

    // Gerar assunto padrão
    const subject = this.getDefaultSubject(alertType, audience);

    // Variáveis disponíveis
    const availableVars = this.getAvailableVariables(audience);

    await this.templateRepository.save(
      this.templateRepository.create({
        alert_type: alertType,
        target_audience: audience,
        unique_key: uniqueKey,
        subject,
        html_body: htmlBody,
        text_body: textBody,
        available_variables: availableVars,
        is_default: true,
      }),
    );

    this.logger.log(`Template padrão criado: ${uniqueKey}`);
  }

  private getMockDataForType(
    alertType: string,
    audience: 'admin' | 'client',
  ): any {
    // Retorna dados com placeholders para gerar template inicial
    if (audience === 'admin') {
      return {
        userName: '{userName}',
        title: '{title}',
        message: '{message}',
        licenseKey: '{licenseKey}',
        productName: '{productName}',
        clientName: '{clientName}',
        expiryDate: '{expiryDate}',
        systemLink: '{systemLink}',
      };
    } else {
      return {
        clientName: '{clientName}',
        title: '{title}',
        message: '{message}',
        productName: '{productName}',
        expiryDate: '{expiryDate}',
        contactPhone: '{contactPhone}',
        contactEmail: '{contactEmail}',
      };
    }
  }

  private generateTextVersion(
    alertType: string,
    audience: string,
  ): string {
    const titles = {
      license_expiring_30: 'Licença expirando em 30 dias',
      license_expiring_15: 'Licença expirando em 15 dias',
      license_expiring_7: 'Licença expirando em 7 dias',
      license_expired: 'Licença expirada',
    };

    if (audience === 'admin') {
      return `Olá {userName},

${titles[alertType]}

{message}

Cliente: {clientName}
Produto: {productName}
Chave: {licenseKey}
Vencimento: {expiryDate}

Acesse o sistema: {systemLink}

--
Infoservice - Sys-Ticket
Este é um email automático. Por favor, não responda.`;
    } else {
      return `Olá {clientName},

${titles[alertType]}

{message}

Produto: {productName}
Data de Vencimento: {expiryDate}

Para garantir a continuidade dos serviços sem interrupções, entre em contato conosco para renovar sua licença.

Contato:
Telefone: {contactPhone}
Email: {contactEmail}

IMPORTANTE: Após o vencimento, o serviço será suspenso automaticamente até a renovação.

--
Infoservice - Sys-Ticket
Para dúvidas ou renovação, entre em contato conosco.`;
    }
  }

  private getDefaultSubject(alertType: string, audience: string): string {
    const subjects = {
      license_expiring_30: 'Licença expirando em 30 dias',
      license_expiring_15: 'Licença expirando em 15 dias',
      license_expiring_7: 'URGENTE: Licença expirando em 7 dias',
      license_expired: 'ATENÇÃO: Licença expirada',
    };

    return audience === 'admin'
      ? `[Sys-Ticket] ${subjects[alertType]} - {clientName}`
      : `⚠️ ${subjects[alertType]} - {productName}`;
  }

  private getAvailableVariables(audience: 'admin' | 'client'): string[] {
    if (audience === 'admin') {
      return [
        'userName',
        'title',
        'message',
        'licenseKey',
        'productName',
        'clientName',
        'expiryDate',
        'systemLink',
      ];
    } else {
      return [
        'clientName',
        'title',
        'message',
        'productName',
        'expiryDate',
        'contactPhone',
        'contactEmail',
      ];
    }
  }

  // CRUD Methods
  async findAll(): Promise<NotificationEmailTemplate[]> {
    return this.templateRepository.find({
      order: { alert_type: 'ASC', target_audience: 'ASC' },
    });
  }

  async findOne(id: string): Promise<NotificationEmailTemplate> {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Template não encontrado');
    return template;
  }

  async findByAlertType(
    alertType: string,
    audience: 'admin' | 'client',
  ): Promise<NotificationEmailTemplate | null> {
    const uniqueKey = `${alertType}_${audience}`;
    return this.templateRepository.findOne({ where: { unique_key: uniqueKey } });
  }

  async create(
    dto: CreateEmailTemplateDto,
  ): Promise<NotificationEmailTemplate> {
    const uniqueKey = `${dto.alert_type}_${dto.target_audience}`;

    const exists = await this.templateRepository.findOne({
      where: { unique_key: uniqueKey },
    });
    if (exists) {
      throw new ConflictException(
        'Já existe template para este tipo de alerta e público',
      );
    }

    const template = this.templateRepository.create({
      ...dto,
      unique_key: uniqueKey,
      is_default: false,
    });

    return this.templateRepository.save(template);
  }

  async update(
    id: string,
    dto: UpdateEmailTemplateDto,
  ): Promise<NotificationEmailTemplate> {
    const template = await this.findOne(id);

    // Atualizar unique_key se alert_type ou target_audience mudarem
    if (dto.alert_type || dto.target_audience) {
      const alertType = dto.alert_type || template.alert_type;
      const audience = dto.target_audience || template.target_audience;
      template.unique_key = `${alertType}_${audience}`;
    }

    // Marcar como não-default se foi editado
    if (template.is_default) {
      template.is_default = false;
    }

    Object.assign(template, dto);
    return this.templateRepository.save(template);
  }

  async delete(id: string): Promise<void> {
    const template = await this.findOne(id);
    await this.templateRepository.remove(template);
  }

  /**
   * Reseta template para padrão do sistema
   */
  async resetToDefault(id: string): Promise<NotificationEmailTemplate> {
    const template = await this.findOne(id);

    // Deletar template atual
    await this.templateRepository.remove(template);

    // Re-gerar template padrão
    await this.ensureDefaultTemplate(
      template.alert_type,
      template.target_audience,
    );

    // Buscar template recém-criado
    const newTemplate = await this.findByAlertType(
      template.alert_type,
      template.target_audience,
    );

    if (!newTemplate) {
      throw new NotFoundException('Erro ao resetar template');
    }

    return newTemplate;
  }

  /**
   * Renderiza template substituindo variáveis
   */
  renderTemplate(
    template: NotificationEmailTemplate,
    variables: Record<string, any>,
  ): { html: string; text: string; subject: string } {
    let html = template.html_body;
    let text = template.text_body;
    let subject = template.subject;

    // Substituir variáveis no formato {variableName}
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      const safeValue = value !== null && value !== undefined ? String(value) : '';
      const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');

      html = html.replace(regex, safeValue);
      text = text.replace(regex, safeValue);
      subject = subject.replace(regex, safeValue);
    });

    return { html, text, subject };
  }
}
