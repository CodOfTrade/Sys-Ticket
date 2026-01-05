import { api } from './api';
import {
  TicketComment,
  TicketAppointment,
  TicketValuation,
  Checklist,
  TicketChecklist,
  CreateCommentDto,
  CreateAppointmentDto,
  StartTimerDto,
  StopTimerDto,
  CreateValuationDto,
  AddChecklistToTicketDto,
  UpdateChecklistItemDto,
} from '@/types/ticket-details.types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// ==================== COMENTÁRIOS ====================

export const commentsService = {
  async getComments(ticketId: string, type?: string): Promise<TicketComment[]> {
    const params = type ? { type } : {};
    const response = await api.get<ApiResponse<TicketComment[]>>(
      `/tickets/${ticketId}/comments`,
      { params }
    );
    return response.data.data;
  },

  async createComment(ticketId: string, data: CreateCommentDto): Promise<TicketComment> {
    const response = await api.post<ApiResponse<TicketComment>>(
      `/tickets/${ticketId}/comments`,
      data
    );
    return response.data.data;
  },

  async updateComment(commentId: string, content: string): Promise<TicketComment> {
    const response = await api.patch<ApiResponse<TicketComment>>(
      `/tickets/comments/${commentId}`,
      { content }
    );
    return response.data.data;
  },

  async deleteComment(commentId: string): Promise<void> {
    await api.delete(`/tickets/comments/${commentId}`);
  },
};

// ==================== APONTAMENTOS ====================

export const appointmentsService = {
  async getAppointments(ticketId: string): Promise<TicketAppointment[]> {
    const response = await api.get<ApiResponse<TicketAppointment[]>>(
      `/tickets/${ticketId}/appointments`
    );
    return response.data.data;
  },

  async getAppointmentsSummary(
    ticketId: string
  ): Promise<{ total_hours: number; total_cost: number }> {
    const response = await api.get<
      ApiResponse<{ total_hours: number; total_cost: number }>
    >(`/tickets/${ticketId}/appointments/summary`);
    return response.data.data;
  },

  async createAppointment(data: CreateAppointmentDto): Promise<TicketAppointment> {
    const response = await api.post<ApiResponse<TicketAppointment>>(
      '/tickets/appointments',
      data
    );
    return response.data.data;
  },

  async startTimer(data: StartTimerDto): Promise<TicketAppointment> {
    const response = await api.post<ApiResponse<TicketAppointment>>(
      '/tickets/appointments/timer/start',
      data
    );
    return response.data.data;
  },

  async stopTimer(data: StopTimerDto): Promise<TicketAppointment> {
    const response = await api.post<ApiResponse<TicketAppointment>>(
      '/tickets/appointments/timer/stop',
      data
    );
    return response.data.data;
  },

  async getActiveTimer(): Promise<TicketAppointment | null> {
    const response = await api.get<ApiResponse<TicketAppointment | null>>(
      '/tickets/appointments/timer/active'
    );
    return response.data.data;
  },

  async updateAppointment(
    appointmentId: string,
    data: Partial<CreateAppointmentDto>
  ): Promise<TicketAppointment> {
    const response = await api.patch<ApiResponse<TicketAppointment>>(
      `/tickets/appointments/${appointmentId}`,
      data
    );
    return response.data.data;
  },

  async deleteAppointment(appointmentId: string): Promise<void> {
    await api.delete(`/tickets/appointments/${appointmentId}`);
  },
};

// ==================== VALORIZAÇÃO ====================

export const valuationsService = {
  async getValuations(ticketId: string, category?: string): Promise<TicketValuation[]> {
    const params = category ? { category } : {};
    const response = await api.get<ApiResponse<TicketValuation[]>>(
      `/tickets/${ticketId}/valuations`,
      { params }
    );
    return response.data.data;
  },

  async getValuationSummary(
    ticketId: string
  ): Promise<{ client_charges: number; internal_costs: number; total: number }> {
    const response = await api.get<
      ApiResponse<{ client_charges: number; internal_costs: number; total: number }>
    >(`/tickets/${ticketId}/valuations/summary`);
    return response.data.data;
  },

  async createValuation(data: CreateValuationDto): Promise<TicketValuation> {
    const response = await api.post<ApiResponse<TicketValuation>>(
      '/tickets/valuations',
      data
    );
    return response.data.data;
  },

  async updateValuation(
    valuationId: string,
    data: Partial<CreateValuationDto>
  ): Promise<TicketValuation> {
    const response = await api.patch<ApiResponse<TicketValuation>>(
      `/tickets/valuations/${valuationId}`,
      data
    );
    return response.data.data;
  },

  async approveValuation(valuationId: string, isApproved: boolean): Promise<TicketValuation> {
    const response = await api.post<ApiResponse<TicketValuation>>(
      '/tickets/valuations/approve',
      { valuation_id: valuationId, is_approved: isApproved }
    );
    return response.data.data;
  },

  async deleteValuation(valuationId: string): Promise<void> {
    await api.delete(`/tickets/valuations/${valuationId}`);
  },
};

// ==================== CHECKLISTS ====================

export const checklistsService = {
  // Templates
  async getTemplates(serviceDeskId?: string, category?: string): Promise<Checklist[]> {
    const params: any = {};
    if (serviceDeskId) params.service_desk_id = serviceDeskId;
    if (category) params.category = category;

    const response = await api.get<ApiResponse<Checklist[]>>(
      '/tickets/checklists/templates',
      { params }
    );
    return response.data.data;
  },

  // Ticket Checklists
  async getTicketChecklists(ticketId: string): Promise<TicketChecklist[]> {
    const response = await api.get<ApiResponse<TicketChecklist[]>>(
      `/tickets/${ticketId}/checklists`
    );
    return response.data.data;
  },

  async addChecklistToTicket(
    ticketId: string,
    data: AddChecklistToTicketDto
  ): Promise<TicketChecklist> {
    const response = await api.post<ApiResponse<TicketChecklist>>(
      `/tickets/${ticketId}/checklists`,
      data
    );
    return response.data.data;
  },

  async updateChecklistItem(
    checklistId: string,
    data: UpdateChecklistItemDto
  ): Promise<TicketChecklist> {
    const response = await api.patch<ApiResponse<TicketChecklist>>(
      `/tickets/checklists/${checklistId}/items`,
      data
    );
    return response.data.data;
  },

  async removeChecklistFromTicket(ticketId: string, checklistId: string): Promise<void> {
    await api.delete(`/tickets/${ticketId}/checklists/${checklistId}`);
  },
};
