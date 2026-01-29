import { api } from './api';

export interface EmailTemplate {
  id: string;
  alert_type: string;
  target_audience: 'admin' | 'client';
  subject: string;
  html_body: string;
  text_body: string;
  available_variables: string[];
  is_default: boolean;
  unique_key: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEmailTemplateDto {
  alert_type: string;
  target_audience: 'admin' | 'client';
  subject: string;
  html_body: string;
  text_body: string;
  available_variables?: string[];
}

export interface UpdateEmailTemplateDto {
  subject?: string;
  html_body?: string;
  text_body?: string;
  available_variables?: string[];
}

class EmailTemplateService {
  private basePath = '/v1/email-templates';

  async getAll(alertType?: string, audience?: string): Promise<EmailTemplate[]> {
    const params: any = {};
    if (alertType) params.alert_type = alertType;
    if (audience) params.audience = audience;

    const response = await api.get<{ success: boolean; data: EmailTemplate[] }>(this.basePath, { params });
    return response.data.data;
  }

  async getOne(id: string): Promise<EmailTemplate> {
    const response = await api.get<{ success: boolean; data: EmailTemplate }>(`${this.basePath}/${id}`);
    return response.data.data;
  }

  async create(dto: CreateEmailTemplateDto): Promise<EmailTemplate> {
    const response = await api.post<{ success: boolean; data: EmailTemplate }>(this.basePath, dto);
    return response.data.data;
  }

  async update(id: string, dto: UpdateEmailTemplateDto): Promise<EmailTemplate> {
    const response = await api.patch<{ success: boolean; data: EmailTemplate }>(`${this.basePath}/${id}`, dto);
    return response.data.data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
  }

  async resetToDefault(id: string): Promise<EmailTemplate> {
    const response = await api.post<{ success: boolean; data: EmailTemplate }>(`${this.basePath}/${id}/reset`);
    return response.data.data;
  }
}

export const emailTemplateService = new EmailTemplateService();
