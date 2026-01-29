import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import * as nodemailer from 'nodemailer';
import { Transporter} from 'nodemailer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingsService } from '../settings/settings.service';
import { SettingKey } from '../settings/entities/system-setting.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationConfigService } from '../notifications/services/notification-config.service';
import { UsersService } from '../users/users.service';
import { ClientsService } from '../clients/clients.service';
import { ResourceLicensesService } from '../resources/services/resource-licenses.service';
import { ResourceLicense } from '../resources/entities/resource-license.entity';
import { SigeClient as SigeClientInterface } from '../clients/interfaces/sige-client.interface';
import { adminNotificationTemplate, AdminNotificationData } from './templates/notification-admin.template';
import { clientNotificationTemplate, ClientNotificationData } from './templates/notification-client.template';

export interface SendEmailDto {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
    contentType?: string;
  }>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(
    private configService: ConfigService,
    private settingsService: SettingsService,
    @Inject(forwardRef(() => NotificationConfigService))
    private notificationConfigService: NotificationConfigService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    @Inject(forwardRef(() => ClientsService))
    private clientsService: ClientsService,
    @Inject(forwardRef(() => ResourceLicensesService))
    private licensesService: ResourceLicensesService,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {
    this.initializeTransporter();
  }

  /**
   * Busca a URL absoluta da logo para emails
   */
  private async getLogoUrl(): Promise<string | null> {
    try {
      const logoPath = await this.settingsService.getValue(SettingKey.LOGO_REPORT);
      if (logoPath) {
        // Construir URL absoluta usando a variável de ambiente ou domínio padrão
        const baseUrl = this.configService.get<string>('BASE_URL', 'https://172.31.255.26');
        return `${baseUrl}/api${logoPath}`;
      }
      return null;
    } catch (error) {
      this.logger.warn('Erro ao buscar logo para email:', error);
      return null;
    }
  }

  /**
   * Inicializa o transporter do Nodemailer com configurações SMTP
   */
  private initializeTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const secure = this.configService.get<boolean>('SMTP_SECURE');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');

    if (!host || !port || !user || !pass) {
      this.logger.warn('Configurações SMTP não encontradas. O serviço de email não funcionará.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure, // true para porta 465, false para outras portas
      auth: {
        user,
        pass,
      },
      tls: {
        // Não falhar em certificados inválidos (útil para dev)
        rejectUnauthorized: false,
      },
    });

    this.logger.log(`Transporter SMTP inicializado: ${host}:${port}`);

    // Verificar conexão
    this.verifyConnection();
  }

  /**
   * Remove tags HTML e converte para texto plano
   */
  private stripHtmlTags(html: string): string {
    if (!html) return '';
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Verifica se a conexão SMTP está funcionando
   */
  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('Conexão SMTP verificada com sucesso');
    } catch (error) {
      this.logger.error('Erro ao verificar conexão SMTP:', error);
    }
  }

  /**
   * Envia um email
   */
  async sendEmail(dto: SendEmailDto): Promise<boolean> {
    if (!this.transporter) {
      this.logger.error('Transporter SMTP não inicializado');
      return false;
    }

    try {
      const fromName = this.configService.get<string>('SMTP_FROM_NAME', 'Sys-Ticket');
      const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL', 'noreply@sys-ticket.com');

      const info = await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: Array.isArray(dto.to) ? dto.to.join(', ') : dto.to,
        cc: dto.cc ? (Array.isArray(dto.cc) ? dto.cc.join(', ') : dto.cc) : undefined,
        bcc: dto.bcc ? (Array.isArray(dto.bcc) ? dto.bcc.join(', ') : dto.bcc) : undefined,
        subject: dto.subject,
        text: dto.text,
        html: dto.html,
        attachments: dto.attachments,
      });

      this.logger.log(`Email enviado com sucesso para ${dto.to}. MessageId: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar email para ${dto.to}:`, error);
      return false;
    }
  }

  /**
   * Envia notificação de novo comentário em ticket
   */
  async sendTicketCommentNotification(
    to: string,
    ticketNumber: string,
    ticketTitle: string,
    commentAuthor: string,
    commentContent: string,
    ticketUrl: string,
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 20px; }
            .comment { background-color: white; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0; }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin-top: 20px;
            }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Novo Comentário no Ticket</h1>
            </div>
            <div class="content">
              <h2>Ticket #${ticketNumber}: ${ticketTitle}</h2>
              <p><strong>${commentAuthor}</strong> adicionou um novo comentário:</p>
              <div class="comment">
                ${commentContent}
              </div>
              <a href="${ticketUrl}" class="button">Ver Ticket</a>
            </div>
            <div class="footer">
              <p>Este é um email automático do sistema Sys-Ticket.</p>
              <p>Por favor, não responda este email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `[Ticket #${ticketNumber}] Novo comentário`,
      html,
      text: `Ticket #${ticketNumber}: ${ticketTitle}\n\n${commentAuthor} adicionou um novo comentário:\n\n${commentContent}\n\nAcesse: ${ticketUrl}`,
    });
  }

  /**
   * Envia notificação de novo ticket criado
   */
  async sendNewTicketNotification(
    to: string,
    ticketNumber: string,
    ticketTitle: string,
    ticketDescription: string,
    clientName: string,
    ticketUrl: string,
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 20px; }
            .info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 6px; }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #10b981;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin-top: 20px;
            }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Novo Ticket Criado</h1>
            </div>
            <div class="content">
              <h2>Ticket #${ticketNumber}</h2>
              <div class="info">
                <p><strong>Cliente:</strong> ${clientName}</p>
                <p><strong>Título:</strong> ${ticketTitle}</p>
                <p><strong>Descrição:</strong></p>
                <p>${ticketDescription}</p>
              </div>
              <a href="${ticketUrl}" class="button">Ver Ticket</a>
            </div>
            <div class="footer">
              <p>Este é um email automático do sistema Sys-Ticket.</p>
              <p>Por favor, não responda este email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `[Novo Ticket #${ticketNumber}] ${ticketTitle}`,
      html,
      text: `Novo Ticket Criado\n\nTicket #${ticketNumber}\nCliente: ${clientName}\nTítulo: ${ticketTitle}\n\nDescrição:\n${ticketDescription}\n\nAcesse: ${ticketUrl}`,
    });
  }

  /**
   * Envia notificação de mudança de status do ticket
   */
  async sendTicketStatusChangeNotification(
    to: string,
    ticketNumber: string,
    ticketTitle: string,
    oldStatus: string,
    newStatus: string,
    changedBy: string,
    ticketUrl: string,
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 20px; }
            .status-change {
              background-color: white;
              padding: 15px;
              margin: 15px 0;
              border-radius: 6px;
              text-align: center;
            }
            .status {
              display: inline-block;
              padding: 8px 16px;
              border-radius: 4px;
              font-weight: bold;
              margin: 0 10px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #f59e0b;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin-top: 20px;
            }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Status do Ticket Atualizado</h1>
            </div>
            <div class="content">
              <h2>Ticket #${ticketNumber}: ${ticketTitle}</h2>
              <p><strong>${changedBy}</strong> alterou o status do ticket:</p>
              <div class="status-change">
                <span class="status" style="background-color: #e5e7eb;">${oldStatus}</span>
                <span>→</span>
                <span class="status" style="background-color: #10b981; color: white;">${newStatus}</span>
              </div>
              <a href="${ticketUrl}" class="button">Ver Ticket</a>
            </div>
            <div class="footer">
              <p>Este é um email automático do sistema Sys-Ticket.</p>
              <p>Por favor, não responda este email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `[Ticket #${ticketNumber}] Status alterado para ${newStatus}`,
      html,
      text: `Ticket #${ticketNumber}: ${ticketTitle}\n\n${changedBy} alterou o status do ticket:\n\nDe: ${oldStatus}\nPara: ${newStatus}\n\nAcesse: ${ticketUrl}`,
    });
  }

  /**
   * Envia solicitação de aprovação de ticket
   */
  async sendApprovalRequestEmail(
    to: string,
    approverName: string,
    ticketNumber: string,
    ticketTitle: string,
    ticketDescription: string,
    clientName: string,
    requesterName: string,
    approveUrl: string,
    rejectUrl: string,
    approvalPageUrl: string,
    customMessage?: string,
  ): Promise<boolean> {
    // Buscar logo do sistema
    const logoUrl = await this.getLogoUrl();

    // Limpar HTML da descrição e escapar para exibição segura
    const cleanDescription = this.stripHtmlTags(ticketDescription);
    const safeDescription = cleanDescription
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    const messageSection = customMessage
      ? `<div style="background-color: #dbeafe; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #2563eb;">
           <p style="margin: 0; color: #1e40af;"><strong>Mensagem do técnico:</strong></p>
           <p style="margin: 10px 0 0 0; color: #1e40af;">${customMessage.replace(/\n/g, '<br>')}</p>
         </div>`
      : '';

    // Seção da logo (se existir)
    const logoSection = logoUrl
      ? `<div style="text-align: center; padding: 20px 0;">
           <img src="${logoUrl}" alt="Logo" style="max-width: 200px; max-height: 80px; height: auto;" />
         </div>`
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Solicitação de Aprovação</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Logo -->
            ${logoSection}

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Solicitação de Aprovação</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Ticket #${ticketNumber}</p>
            </div>

            <!-- Content -->
            <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <p style="margin: 0 0 20px 0; font-size: 16px;">
                Olá <strong>${approverName}</strong>,
              </p>
              <p style="margin: 0 0 20px 0;">
                Você recebeu uma solicitação de aprovação para o seguinte ticket:
              </p>

              <!-- Ticket Info -->
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; width: 120px;">
                      <strong style="color: #64748b;">Ticket:</strong>
                    </td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">
                      <strong>#${ticketNumber}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                      <strong style="color: #64748b;">Título:</strong>
                    </td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">
                      ${ticketTitle}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                      <strong style="color: #64748b;">Cliente:</strong>
                    </td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">
                      ${clientName}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0;">
                      <strong style="color: #64748b;">Solicitante:</strong>
                    </td>
                    <td style="padding: 10px 0; color: #1e293b;">
                      ${requesterName}
                    </td>
                  </tr>
                </table>

                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                  <strong style="color: #64748b;">Descrição:</strong>
                  <p style="margin: 10px 0 0 0; color: #475569; line-height: 1.6;">
                    ${safeDescription || '<em style="color: #94a3b8;">Sem descrição</em>'}
                  </p>
                </div>
              </div>

              ${messageSection}

              <!-- Action Buttons -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${approvalPageUrl}?action=approve"
                   style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 0 10px 10px 0; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.25);">
                  ✓ APROVAR
                </a>
                <a href="${approvalPageUrl}?action=reject"
                   style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.25);">
                  ✗ REJEITAR
                </a>
              </div>

              <!-- Info -->
              <div style="text-align: center; margin: 20px 0; padding: 15px; background-color: #f1f5f9; border-radius: 8px;">
                <p style="margin: 0; color: #64748b; font-size: 14px;">
                  Ao clicar, você será direcionado para uma página onde poderá adicionar um comentário antes de confirmar.
                </p>
              </div>

              <!-- Warning -->
              <div style="margin-top: 25px; padding: 15px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">
                <p style="margin: 0; font-size: 13px; color: #991b1b;">
                  <strong>⚠ Importante:</strong> Este link expira em <strong>48 horas</strong>.
                </p>
                <p style="margin: 5px 0 0 0; font-size: 13px; color: #991b1b;">
                  Se você não solicitou esta aprovação, ignore este email.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 20px; padding: 20px; color: #64748b; font-size: 12px;">
              <p style="margin: 0; font-weight: 600; color: #475569;">Sys-Ticket</p>
              <p style="margin: 5px 0 0 0;">Este é um email automático. Por favor, não responda.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const plainText = `
Solicitação de Aprovação

Olá ${approverName},

Você recebeu uma solicitação de aprovação para o seguinte ticket:

Ticket: #${ticketNumber}
Título: ${ticketTitle}
Cliente: ${clientName}
Solicitante: ${requesterName}

Descrição:
${ticketDescription || 'Sem descrição'}

${customMessage ? `Mensagem do técnico:\n${customMessage}\n\n` : ''}
Para APROVAR, acesse:
${approvalPageUrl}?action=approve

Para REJEITAR, acesse:
${approvalPageUrl}?action=reject

Você será direcionado para uma página onde poderá adicionar um comentário antes de confirmar.

IMPORTANTE: Este link expira em 48 horas.

---
Sys-Ticket - Este é um email automático. Por favor, não responda.
    `.trim();

    return this.sendEmail({
      to,
      subject: `[Aprovação Necessária] Ticket #${ticketNumber}: ${ticketTitle}`,
      html,
      text: plainText,
    });
  }

  /**
   * Listener para evento de notificação criada
   * Envia email automaticamente se configurado
   */
  @OnEvent('notification.created')
  async handleNotificationCreatedForEmail(notification: Notification): Promise<void> {
    try {
      this.logger.log(`Processando notificação ${notification.id} para envio de email`);

      // 1. Buscar configuração do alerta
      const config = await this.notificationConfigService.findByAlertType(notification.type);

      // 2. Se config não encontrada ou não ativa, ignora
      if (!config || !config.is_active) {
        this.logger.debug(`Config não encontrada ou inativa para tipo ${notification.type}`);
        return;
      }

      let emailSent = false;

      // 3. Enviar email para admins (se email_admins=true)
      if (config.email_admins && notification.target_user_id) {
        this.logger.log(`Enviando email para admin ${notification.target_user_id}`);
        const success = await this.sendNotificationEmailToAdmin(notification);
        if (success) emailSent = true;
      }

      // 4. Enviar email para cliente (se email_clients=true)
      if (config.email_clients && notification.client_id) {
        this.logger.log(`Enviando email para cliente ${notification.client_id}`);
        const success = await this.sendNotificationEmailToClient(notification);
        if (success) emailSent = true;
      }

      // 5. Atualizar notificação: is_email_sent=true, email_sent_at=now
      if (emailSent) {
        await this.notificationRepository.update(notification.id, {
          is_email_sent: true,
          email_sent_at: new Date(),
        });
        this.logger.log(`Email enviado e notificação ${notification.id} atualizada`);
      }
    } catch (error) {
      this.logger.error(`Erro ao processar notificação ${notification.id} para email:`, error);
    }
  }

  /**
   * Envia email de notificação para admin
   */
  private async sendNotificationEmailToAdmin(notification: Notification): Promise<boolean> {
    try {
      // Buscar usuário admin
      const user = await this.usersService.findOne(notification.target_user_id);
      if (!user || !user.email) {
        this.logger.warn(`Usuário ${notification.target_user_id} não encontrado ou sem email`);
        return false;
      }

      // Buscar dados da licença (se referência for licença)
      let license: ResourceLicense | null = null;
      let client: SigeClientInterface | null = null;

      if (notification.reference_type === 'license' && notification.reference_id) {
        try {
          license = await this.licensesService.findOne(notification.reference_id);
          if (license && license.client_id) {
            client = await this.clientsService.findOne(license.client_id);
          }
        } catch (error) {
          this.logger.warn(`Erro ao buscar licença ${notification.reference_id}:`, error);
        }
      }

      // Construir dados do template
      const baseUrl = this.configService.get<string>('BASE_URL', 'https://172.31.255.26');
      const systemLink = `${baseUrl}/licenses/${license?.id || ''}`;

      const templateData: AdminNotificationData = {
        userName: user.name || user.email,
        title: notification.title,
        message: notification.message,
        systemLink,
      };

      if (license) {
        templateData.licenseKey = license.license_key || 'N/A';
        templateData.productName = license.product_name || 'N/A';
        templateData.clientName = client?.nome || client?.razao_social || 'N/A';

        if (license.expiry_date) {
          const expiryDate = new Date(license.expiry_date);
          templateData.expiryDate = expiryDate.toLocaleDateString('pt-BR');
        }
      }

      // Renderizar template HTML
      const html = adminNotificationTemplate(templateData);

      // Enviar email
      return await this.sendEmail({
        to: user.email,
        subject: notification.title,
        html,
      });
    } catch (error) {
      this.logger.error(`Erro ao enviar email para admin:`, error);
      return false;
    }
  }

  /**
   * Envia email de notificação para cliente
   */
  private async sendNotificationEmailToClient(notification: Notification): Promise<boolean> {
    try {
      // Buscar cliente
      const client = await this.clientsService.findOne(notification.client_id);
      if (!client || !client.email) {
        this.logger.warn(`Cliente ${notification.client_id} não encontrado ou sem email`);
        return false;
      }

      // Buscar licença para pegar email específico (se houver)
      let license: ResourceLicense | null = null;
      let recipientEmail = client.email;

      if (notification.reference_type === 'license' && notification.reference_id) {
        try {
          license = await this.licensesService.findOne(notification.reference_id);

          // Prioridade: license.notification_email > license.linked_email > client.email
          if (license) {
            if (license['notification_email']) {
              recipientEmail = license['notification_email'];
            } else if (license.linked_email) {
              recipientEmail = license.linked_email;
            }
          }
        } catch (error) {
          this.logger.warn(`Erro ao buscar licença ${notification.reference_id}:`, error);
        }
      }

      // Construir dados do template
      const templateData: ClientNotificationData = {
        clientName: client.nome_fantasia || client.razao_social || client.nome || 'Cliente',
        title: notification.title,
        message: notification.message,
        contactPhone: '(41) 3668-6468', // Telefone da Infoservice (adicionar em variável de ambiente depois)
        contactEmail: 'contato@infoservice.tec.br', // Email da Infoservice
      };

      if (license) {
        templateData.productName = license.product_name;

        if (license.expiry_date) {
          const expiryDate = new Date(license.expiry_date);
          templateData.expiryDate = expiryDate.toLocaleDateString('pt-BR');
        }
      }

      // Renderizar template HTML
      const html = clientNotificationTemplate(templateData);

      // Enviar email
      return await this.sendEmail({
        to: recipientEmail,
        subject: notification.title,
        html,
      });
    } catch (error) {
      this.logger.error(`Erro ao enviar email para cliente:`, error);
      return false;
    }
  }
}
