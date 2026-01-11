import { api } from './api';

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  filename: string;
  stored_filename: string;
  file_path: string;
  url: string;
  mime_type: string;
  file_size: number;
  attachment_type: 'image' | 'document' | 'video' | 'audio' | 'other';
  uploaded_by_id: string;
  created_at: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  attachments?: TicketAttachment[];
  attachment?: TicketAttachment;
}

class TicketAttachmentsService {
  /**
   * Upload de múltiplos arquivos para um ticket
   */
  async uploadFiles(ticketId: string, files: File[]): Promise<UploadResponse> {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await api.post<UploadResponse>(
      `/v1/tickets/${ticketId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  }

  /**
   * Upload de arquivo único
   */
  async uploadFile(ticketId: string, file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<UploadResponse>(
      `/v1/tickets/${ticketId}/attachments/single`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  }

  /**
   * Buscar anexos de um ticket
   */
  async getAttachments(ticketId: string): Promise<TicketAttachment[]> {
    const response = await api.get<{ success: boolean; attachments: TicketAttachment[] }>(
      `/v1/tickets/${ticketId}/attachments`
    );
    return response.data.attachments;
  }

  /**
   * Deletar anexo
   */
  async deleteAttachment(ticketId: string, attachmentId: string): Promise<void> {
    await api.delete(`/v1/tickets/${ticketId}/attachments/${attachmentId}`);
  }

  /**
   * Obter URL de download de anexo
   */
  getDownloadUrl(ticketId: string, attachmentId: string): string {
    return `${api.defaults.baseURL}/v1/tickets/${ticketId}/attachments/${attachmentId}/download`;
  }

  /**
   * Obter URL de visualização de anexo
   */
  getViewUrl(ticketId: string, attachmentId: string): string {
    return `${api.defaults.baseURL}/v1/tickets/${ticketId}/attachments/${attachmentId}/view`;
  }
}

export const ticketAttachmentsService = new TicketAttachmentsService();
