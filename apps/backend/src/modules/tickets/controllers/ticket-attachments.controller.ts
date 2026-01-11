import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  Req,
  Res,
  UseGuards,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TicketAttachmentsService } from '../services/ticket-attachments.service';

@Controller({ path: 'tickets/:ticketId/attachments', version: '1' })
@UseGuards(JwtAuthGuard)
export class TicketAttachmentsController {
  constructor(private readonly attachmentsService: TicketAttachmentsService) {}

  /**
   * Upload de múltiplos arquivos para um ticket
   */
  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB por arquivo
      },
      fileFilter: (req, file, callback) => {
        // Aceitar apenas tipos específicos
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/csv',
        ];

        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              `Tipo de arquivo não permitido: ${file.mimetype}. Permitidos: imagens, PDF, DOC, XLS, TXT`,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadFiles(
    @Param('ticketId') ticketId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    const userId = req.user.id;
    const attachments = await this.attachmentsService.uploadMultipleFiles(
      ticketId,
      files,
      userId,
    );

    return {
      success: true,
      message: `${files.length} arquivo(s) enviado(s) com sucesso`,
      attachments,
    };
  }

  /**
   * Upload de arquivo único
   */
  @Post('single')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadFile(
    @Param('ticketId') ticketId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    const userId = req.user.id;
    const attachment = await this.attachmentsService.uploadFile(ticketId, file, userId);

    return {
      success: true,
      message: 'Arquivo enviado com sucesso',
      attachment,
    };
  }

  /**
   * Listar anexos de um ticket
   */
  @Get()
  async getAttachments(@Param('ticketId') ticketId: string) {
    const attachments = await this.attachmentsService.findByTicket(ticketId);
    return {
      success: true,
      attachments,
    };
  }

  /**
   * Download de anexo
   */
  @Get(':attachmentId/download')
  async downloadAttachment(
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    const attachment = await this.attachmentsService.findOne(attachmentId);

    res.setHeader('Content-Type', attachment.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
    res.sendFile(attachment.file_path, (err) => {
      if (err) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Erro ao baixar arquivo',
        });
      }
    });
  }

  /**
   * Visualizar anexo (sem forçar download)
   */
  @Get(':attachmentId/view')
  async viewAttachment(
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    const attachment = await this.attachmentsService.findOne(attachmentId);

    res.setHeader('Content-Type', attachment.mime_type);
    res.sendFile(attachment.file_path, (err) => {
      if (err) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Erro ao visualizar arquivo',
        });
      }
    });
  }

  /**
   * Deletar anexo
   */
  @Delete(':attachmentId')
  async deleteAttachment(
    @Param('attachmentId') attachmentId: string,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    await this.attachmentsService.delete(attachmentId, userId);

    return {
      success: true,
      message: 'Anexo deletado com sucesso',
    };
  }
}
