import { api } from './api';
import {
  Queue,
  CreateQueueDto,
  UpdateQueueDto,
  AssignToQueueDto,
  QueueStats,
} from '../types/queue.types';

class QueueService {
  /**
   * Listar todas as filas
   */
  async getAll(serviceDeskId?: string): Promise<Queue[]> {
    const params = serviceDeskId ? { service_desk_id: serviceDeskId } : {};
    const response = await api.get('/v1/queues', { params });
    return response.data;
  }

  /**
   * Buscar fila por ID
   */
  async getById(id: string): Promise<Queue> {
    const response = await api.get(`/v1/queues/${id}`);
    return response.data;
  }

  /**
   * Criar nova fila
   */
  async create(data: CreateQueueDto): Promise<Queue> {
    const response = await api.post('/v1/queues', data);
    return response.data;
  }

  /**
   * Atualizar fila
   */
  async update(id: string, data: UpdateQueueDto): Promise<Queue> {
    const response = await api.patch(`/v1/queues/${id}`, data);
    return response.data;
  }

  /**
   * Deletar fila
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/v1/queues/${id}`);
  }

  /**
   * Adicionar membro à fila
   */
  async addMember(queueId: string, userId: string): Promise<Queue> {
    const response = await api.post(`/v1/queues/${queueId}/members/${userId}`);
    return response.data;
  }

  /**
   * Remover membro da fila
   */
  async removeMember(queueId: string, userId: string): Promise<Queue> {
    const response = await api.delete(`/v1/queues/${queueId}/members/${userId}`);
    return response.data;
  }

  /**
   * Obter estatísticas da fila
   */
  async getStats(queueId: string): Promise<QueueStats> {
    const response = await api.get(`/v1/queues/${queueId}/stats`);
    return response.data;
  }

  /**
   * Atribuir ticket à fila
   */
  async assignTicket(
    queueId: string,
    ticketId: string,
    data: AssignToQueueDto,
  ): Promise<any> {
    const response = await api.post(
      `/v1/queues/${queueId}/assign-ticket/${ticketId}`,
      data,
    );
    return response.data;
  }
}

export const queueService = new QueueService();
export default queueService;
