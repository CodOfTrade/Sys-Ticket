import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

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

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
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
}
