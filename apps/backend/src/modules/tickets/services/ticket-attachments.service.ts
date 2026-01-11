import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketAttachment } from '../entities/ticket-attachment.entity';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class TicketAttachmentsService {
  private readonly logger = new Logger(TicketAttachmentsService.name);
  private readonly uploadDir = process.env.UPLOAD_DIR || './uploads/tickets';

  constructor(
    @InjectRepository(TicketAttachment)
    private attachmentRepository: Repository<TicketAttachment>,
  ) {
    this.ensureUploadDirExists();
  }

  private async ensureUploadDirExists() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Diretório de upload garantido: ${this.uploadDir}`);
    } catch (error) {
      this.logger.error('Erro ao criar diretório de upload', error);
    }
  }

  /**
   * Upload de arquivo para um ticket
   */
  async uploadFile(
    ticketId: string,
    file: Express.Multer.File,
    userId: string,
  ): Promise<TicketAttachment> {
    try {
      // Gerar nome único para o arquivo
      const fileExtension = path.extname(file.originalname);
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(8).toString('hex');
      const storedFilename = `${ticketId}_${timestamp}_${randomString}${fileExtension}`;
      const filePath = path.join(this.uploadDir, storedFilename);

      // Salvar arquivo no disco
      await fs.writeFile(filePath, file.buffer);

      // Calcular hash MD5
      const md5Hash = crypto.createHash('md5').update(file.buffer).digest('hex');

      // Determinar tipo de anexo baseado no MIME type
      let attachmentType = 'other';
      if (file.mimetype.startsWith('image/')) {
        attachmentType = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        attachmentType = 'video';
      } else if (file.mimetype.startsWith('audio/')) {
        attachmentType = 'audio';
      } else if (
        file.mimetype.includes('pdf') ||
        file.mimetype.includes('document') ||
        file.mimetype.includes('text') ||
        file.mimetype.includes('word') ||
        file.mimetype.includes('excel') ||
        file.mimetype.includes('spreadsheet')
      ) {
        attachmentType = 'document';
      }

      // Criar registro no banco de dados
      const attachment = this.attachmentRepository.create({
        ticket_id: ticketId,
        filename: file.originalname,
        stored_filename: storedFilename,
        file_path: filePath,
        url: `/uploads/tickets/${storedFilename}`, // URL relativa
        mime_type: file.mimetype,
        file_size: file.size,
        md5_hash: md5Hash,
        attachment_type: attachmentType,
        uploaded_by_id: userId,
      });

      const savedAttachment = await this.attachmentRepository.save(attachment);
      this.logger.log(`Arquivo uploadado: ${file.originalname} -> ${storedFilename}`);

      return savedAttachment;
    } catch (error) {
      this.logger.error(`Erro ao fazer upload do arquivo ${file.originalname}`, error);
      throw error;
    }
  }

  /**
   * Upload múltiplo de arquivos
   */
  async uploadMultipleFiles(
    ticketId: string,
    files: Express.Multer.File[],
    userId: string,
  ): Promise<TicketAttachment[]> {
    const uploadPromises = files.map((file) => this.uploadFile(ticketId, file, userId));
    return Promise.all(uploadPromises);
  }

  /**
   * Buscar anexos de um ticket
   */
  async findByTicket(ticketId: string): Promise<TicketAttachment[]> {
    return this.attachmentRepository.find({
      where: { ticket_id: ticketId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Buscar anexo por ID
   */
  async findOne(id: string): Promise<TicketAttachment> {
    const attachment = await this.attachmentRepository.findOne({
      where: { id },
    });

    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado');
    }

    return attachment;
  }

  /**
   * Buscar múltiplos anexos por IDs
   */
  async findByIds(ids: string[]): Promise<TicketAttachment[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    return this.attachmentRepository.findByIds(ids);
  }

  /**
   * Deletar anexo
   */
  async delete(id: string, userId: string): Promise<void> {
    const attachment = await this.findOne(id);

    // Deletar arquivo físico
    try {
      await fs.unlink(attachment.file_path);
      this.logger.log(`Arquivo deletado: ${attachment.file_path}`);
    } catch (error) {
      this.logger.warn(`Erro ao deletar arquivo físico: ${attachment.file_path}`, error);
      // Continuar mesmo se falhar ao deletar arquivo
    }

    // Deletar registro do banco
    await this.attachmentRepository.remove(attachment);
    this.logger.log(`Registro de anexo deletado: ${id}`);
  }

  /**
   * Obter caminho do arquivo para download
   */
  async getFilePath(id: string): Promise<string> {
    const attachment = await this.findOne(id);
    return attachment.file_path;
  }
}
