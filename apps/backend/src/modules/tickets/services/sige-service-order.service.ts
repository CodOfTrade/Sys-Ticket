import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SigeCloudService } from '../../../shared/services/sige-cloud.service';
import { Ticket } from '../entities/ticket.entity';
import { TicketAppointment, ServiceCoverageType } from '../entities/ticket-appointment.entity';
import { TicketValuation, ValuationCategory } from '../entities/ticket-valuation.entity';
import { SigeClient } from '../../clients/entities/sige-client.entity';
import { SigeProduct } from '../../clients/entities/sige-product.entity';
import { ConfigService } from '@nestjs/config';

// Interface para o pedido do SIGE Cloud (baseado no modelo real da API)
interface SigePedidoItem {
  Codigo: string;           // Código do produto no SIGE
  Quantidade: number;
  ValorUnitario: number;
  Descricao?: string;       // Descrição do item (será preenchida automaticamente pelo SIGE)
  Unidade?: string;
  ValorFrete?: number;
  DescontoUnitario?: number;
  ValorTotal?: number;
}

interface SigePedido {
  Codigo?: number;          // Se null, cria novo. Se preenchido, atualiza
  OrigemVenda: string;      // "PDV", "Venda Direta", etc.
  Empresa: string;          // NomeFantasia da empresa
  EmpresaID: string;        // ID da empresa no SIGE
  Deposito: string;         // Nome do depósito
  DepositoID: string;       // ID do depósito no SIGE
  Cliente: string;          // Nome do cliente
  ClienteID: string;        // ID do cliente no SIGE
  PessoaID: string;         // ID do cliente no SIGE (mesmo que ClienteID)
  ClienteCNPJ?: string;     // CNPJ do cliente
  StatusSistema: string;    // "Orçamento", "Pedido", "Pedido Faturado"
  Status?: string;          // Status customizado (opcional)
  Items: SigePedidoItem[];
  Descricao?: string;       // Observações
  Data: string;             // Data do pedido (formato ISO)
  Vendedor?: string;        // Nome do vendedor/técnico
  PlanoDeConta?: string;    // Plano de conta (default: "RECEITAS")
  ValorFrete?: number;
  OutrasDespesas?: number;
  ValorSeguro?: number;
}

interface SigePedidoResponse {
  Codigo: number;
  ID?: string;
  Mensagem?: string;
}

// Códigos dos produtos de serviço no SIGE (conforme cadastrado)
const SIGE_PRODUCT_CODES = {
  ATENDIMENTO_N1: '891637',      // ATENDIMENTO AVULSO N1 - R$ 70,00
  ATENDIMENTO_N2: '891638',      // ATENDIMENTO AVULSO N2 - R$ 120,00
  ATENDIMENTO_CONTRATO: '891639', // ATENDIMENTO AVULSO - em contrato - R$ 70,00
};

@Injectable()
export class SigeServiceOrderService {
  private readonly logger = new Logger(SigeServiceOrderService.name);

  constructor(
    private readonly sigeCloudService: SigeCloudService,
    private readonly configService: ConfigService,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketAppointment)
    private appointmentRepository: Repository<TicketAppointment>,
    @InjectRepository(TicketValuation)
    private valuationRepository: Repository<TicketValuation>,
    @InjectRepository(SigeClient)
    private sigeClientRepository: Repository<SigeClient>,
    @InjectRepository(SigeProduct)
    private sigeProductRepository: Repository<SigeProduct>,
  ) {}

  /**
   * Criar Ordem de Serviço no SIGE Cloud ao aprovar ticket
   * O pedido é criado e faturado automaticamente usando /SalvarEFaturar
   */
  async createServiceOrderFromTicket(ticketId: string, userId: string, observacoes?: string): Promise<{
    success: boolean;
    sigeOrderId?: number;
    message: string;
    totalValue?: number;
  }> {
    try {
      this.logger.log(`Criando OS no SIGE para ticket ${ticketId}`);

      // 1. Buscar ticket com relacionamentos
      const ticket = await this.ticketRepository.findOne({
        where: { id: ticketId },
        relations: ['assigned_to', 'service_desk'],
      });

      if (!ticket) {
        return { success: false, message: 'Ticket não encontrado' };
      }

      // 2. Buscar cliente no SIGE pelo client_id do ticket
      // O client_id pode ser um UUID local ou um ID do SIGE (hex string)
      let sigeClient: SigeClient | null = null;
      if (ticket.client_id) {
        // Verificar se é um UUID válido
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticket.client_id);

        if (isUUID) {
          // Buscar pelo UUID local
          sigeClient = await this.sigeClientRepository.findOne({
            where: { id: ticket.client_id },
          });
        } else {
          // Buscar pelo ID do SIGE (hex string)
          sigeClient = await this.sigeClientRepository.findOne({
            where: { sigeId: ticket.client_id },
          });
        }
      }

      if (!sigeClient) {
        this.logger.warn(`Cliente SIGE não encontrado para client_id ${ticket.client_id}`);
        // Continua mesmo sem cliente - usará o client_name
      } else {
        this.logger.log(`Cliente encontrado: ${sigeClient.nome}, CPF/CNPJ: ${sigeClient.cpfCnpj}`);
      }

      // 3. Buscar apontamentos faturáveis (billable) do ticket
      const appointments = await this.appointmentRepository.find({
        where: { ticket_id: ticketId },
      });

      // 4. Buscar valorizações do tipo client_charge
      const valuations = await this.valuationRepository.find({
        where: {
          ticket_id: ticketId,
          category: ValuationCategory.CLIENT_CHARGE,
        },
      });

      // 5. Montar itens do pedido
      const items: SigePedidoItem[] = [];
      let totalValue = 0;

      // 5.1 Processar apontamentos faturáveis
      const billableAppointments = appointments.filter(
        a => a.coverage_type === ServiceCoverageType.BILLABLE && a.total_amount > 0
      );

      // Agrupar apontamentos por tipo (N1, N2, Contrato)
      const appointmentsByLevel = this.groupAppointmentsByLevel(billableAppointments);

      for (const [level, apps] of Object.entries(appointmentsByLevel)) {
        const totalHours = apps.reduce((sum, a) => sum + (a.duration_minutes / 60), 0);
        const totalAmount = apps.reduce((sum, a) => sum + Number(a.total_amount), 0);
        const avgUnitPrice = totalHours > 0 ? totalAmount / totalHours : 0;

        if (totalAmount > 0) {
          const productCode = this.getProductCodeByLevel(level);
          items.push({
            Codigo: productCode,
            Quantidade: parseFloat(totalHours.toFixed(2)),
            ValorUnitario: parseFloat(avgUnitPrice.toFixed(2)),
            Descricao: `Atendimento ${level} - Ticket #${ticket.ticket_number}`,
          });
          totalValue += totalAmount;
        }
      }

      // 5.2 Processar apontamentos em contrato (se houver cobrança extra)
      const contractAppointments = appointments.filter(
        a => a.coverage_type === ServiceCoverageType.CONTRACT && a.total_amount > 0
      );

      if (contractAppointments.length > 0) {
        const totalHours = contractAppointments.reduce((sum, a) => sum + (a.duration_minutes / 60), 0);
        const totalAmount = contractAppointments.reduce((sum, a) => sum + Number(a.total_amount), 0);
        const avgUnitPrice = totalHours > 0 ? totalAmount / totalHours : 0;

        if (totalAmount > 0) {
          items.push({
            Codigo: SIGE_PRODUCT_CODES.ATENDIMENTO_CONTRATO,
            Quantidade: parseFloat(totalHours.toFixed(2)),
            ValorUnitario: parseFloat(avgUnitPrice.toFixed(2)),
            Descricao: `Atendimento Contrato - Ticket #${ticket.ticket_number}`,
          });
          totalValue += totalAmount;
        }
      }

      // 5.3 Processar valorizações (produtos/serviços extras)
      for (const valuation of valuations) {
        if (valuation.final_amount > 0) {
          // Se tem produto SIGE vinculado, usar o código dele
          const productCode = valuation.sige_product_code || valuation.sige_product_id;

          if (productCode) {
            items.push({
              Codigo: productCode,
              Quantidade: parseFloat(valuation.quantity.toString()),
              ValorUnitario: parseFloat(valuation.unit_price.toString()),
              Descricao: valuation.description,
            });
          } else {
            // Se não tem produto vinculado, usar descrição genérica
            // Nesse caso, pode ser necessário criar um produto genérico no SIGE
            this.logger.warn(`Valorização ${valuation.id} sem produto SIGE vinculado`);
          }
          totalValue += Number(valuation.final_amount);
        }
      }

      // Se não há itens para faturar, retornar sucesso sem criar OS
      if (items.length === 0) {
        this.logger.log(`Ticket ${ticketId} não possui itens faturáveis`);
        return {
          success: true,
          message: 'Ticket aprovado sem itens para faturamento',
          totalValue: 0,
        };
      }

      // 6. Montar payload do pedido SIGE (seguindo modelo real da API)
      // IDs fixos da Infoservice (conforme dados do SIGE)
      const EMPRESA_ID = '603e5f19fe1ad70dfc322954';
      const DEPOSITO_ID = '6036575cfe1ad809806199e5';

      // Verificar se temos o sigeId do cliente
      if (!sigeClient?.sigeId) {
        this.logger.error(`Cliente não possui sigeId para criar pedido no SIGE`);
        return {
          success: false,
          message: 'Cliente não está sincronizado com o SIGE. Sincronize o cliente primeiro.',
        };
      }

      // Calcular valor final total
      const valorFinal = items.reduce((sum, item) => sum + (item.Quantidade * item.ValorUnitario), 0);

      // Montar observações do pedido
      const obsTexto = [
        `Ticket #${ticket.ticket_number} - ${ticket.title}`,
        observacoes ? `\nComentário: ${observacoes}` : '',
      ].filter(Boolean).join('');

      // Payload seguindo modelo da API SIGE para criar Pedido e Faturar
      // Endpoint /SalvarEFaturar cria o pedido e fatura automaticamente
      const pedido = {
        StatusSistema: 'Pedido',
        DataAprovacaoPedido: new Date().toISOString(),
        Cliente: sigeClient.nome,
        ClienteCNPJ: sigeClient.cpfCnpj,
        Empresa: 'Infoservice Informática',
        Deposito: 'PADRÃO',
        ValorFinal: valorFinal,
        CEP: sigeClient.cep ? parseInt(sigeClient.cep.replace(/\D/g, '')) : 0,
        PlanoDeConta: 'RECEITAS PDV',
        Observacoes: obsTexto,
        // Campos para faturamento automático
        FormaPagamento: 'Crédito Loja',
        ContaBancaria: 'SIGE BANK',
        DataFaturamento: new Date().toISOString(),
        Finalizado: true,
        // Array de pagamentos necessário para faturar
        Pagamentos: [{
          FormaPagamento: 'Crédito Loja',
          ValorPagamento: valorFinal,
          Quitar: false,
        }],
        Items: items.map(item => ({
          Codigo: item.Codigo,
          Descricao: item.Descricao || '',
          Quantidade: item.Quantidade,
          ValorUnitario: item.ValorUnitario,
          ValorFrete: 0,
          DescontoUnitario: 0,
          ValorTotal: 0,
          PesoKG: 0,
          Comprimento: 0,
          Altura: 0,
          Largura: 0,
          FreteGratis: false,
          ValorUnitarioFrete: 0,
          PrazoEntregaFrete: 0,
          Seguro: 0,
          ProductGroupId: 0,
        })),
      };

      this.logger.log(`Payload do pedido SIGE: ${JSON.stringify(pedido, null, 2)}`);

      // 7. Enviar para o SIGE Cloud - usando POST para criar e faturar pedido
      const response = await this.sigeCloudService.post<SigePedidoResponse>(
        '/request/Pedidos/SalvarEFaturar',
        pedido,
      );

      // Log da resposta completa do SIGE para debug
      this.logger.log(`Resposta completa do SIGE: ${JSON.stringify(response, null, 2)}`);

      // Extrair código do pedido da resposta
      // A resposta pode vir como objeto com Codigo ou como string "PEDIDO 11205 SALVO COM SUCESSO!"
      let sigeOrderId: number | undefined = (response as SigePedidoResponse)?.Codigo;

      // Se não veio como objeto, tentar extrair da string
      const responseStr = String(response);
      if (!sigeOrderId) {
        // Tentar extrair o número do pedido da mensagem de sucesso
        const match = responseStr.match(/PEDIDO\s+(\d+)\s+SALVO/i);
        if (match) {
          sigeOrderId = parseInt(match[1], 10);
          this.logger.log(`Código do pedido extraído da mensagem: ${sigeOrderId}`);
        }
      }

      if (!sigeOrderId) {
        this.logger.error('SIGE não retornou o código do pedido');
        // Mesmo sem código, o pedido foi criado se a resposta contém "SUCESSO"
        if (responseStr.includes('SUCESSO')) {
          return {
            success: true,
            message: 'Pedido criado no SIGE (código não retornado)',
            totalValue,
          };
        }
        return {
          success: false,
          message: 'Erro ao criar pedido no SIGE: código não retornado',
        };
      }

      this.logger.log(`Pedido criado no SIGE com código: ${sigeOrderId}`);

      // 8. Lançamento financeiro REMOVIDO - o pedido é criado sem faturar
      // O faturamento será feito manualmente no SIGE quando necessário

      // 9. Atualizar apontamentos e valorizações com o ID da OS
      await this.markItemsAsSynced(ticketId, sigeOrderId.toString());

      return {
        success: true,
        sigeOrderId,
        message: `OS #${sigeOrderId} criada com sucesso no SIGE`,
        totalValue,
      };

    } catch (error) {
      this.logger.error(`Erro ao criar OS no SIGE para ticket ${ticketId}`, error);
      return {
        success: false,
        message: `Erro ao criar OS no SIGE: ${error.message}`,
      };
    }
  }

  /**
   * Agrupa apontamentos por nível de serviço (N1, N2, etc.)
   */
  private groupAppointmentsByLevel(appointments: TicketAppointment[]): Record<string, TicketAppointment[]> {
    const grouped: Record<string, TicketAppointment[]> = {
      'N1': [],
      'N2': [],
    };

    for (const appointment of appointments) {
      const level = appointment.service_level || 'n1';
      const key = level.toUpperCase();

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(appointment);
    }

    return grouped;
  }

  /**
   * Retorna o código do produto SIGE baseado no nível de serviço
   */
  private getProductCodeByLevel(level: string): string {
    switch (level.toUpperCase()) {
      case 'N2':
        return SIGE_PRODUCT_CODES.ATENDIMENTO_N2;
      case 'N1':
      default:
        return SIGE_PRODUCT_CODES.ATENDIMENTO_N1;
    }
  }

  /**
   * Marca apontamentos e valorizações como sincronizados com SIGE
   */
  private async markItemsAsSynced(ticketId: string, serviceOrderId: string): Promise<void> {
    // Atualizar apontamentos
    await this.appointmentRepository.update(
      { ticket_id: ticketId },
      { service_order_id: serviceOrderId },
    );

    // Atualizar valorizações
    await this.valuationRepository.update(
      { ticket_id: ticketId, category: ValuationCategory.CLIENT_CHARGE },
      {
        synced_to_sige: true,
        synced_at: new Date(),
        service_order_id: serviceOrderId,
      },
    );

    this.logger.log(`Itens do ticket ${ticketId} marcados como sincronizados com OS ${serviceOrderId}`);
  }

  /**
   * Buscar empresas cadastradas no SIGE Cloud
   */
  async getSigeEmpresas(): Promise<any> {
    try {
      this.logger.log('Buscando empresas no SIGE Cloud');
      const response = await this.sigeCloudService.get<any>('/request/Empresas/GetAll');
      this.logger.log(`Empresas encontradas: ${JSON.stringify(response, null, 2)}`);
      return response;
    } catch (error) {
      this.logger.error('Erro ao buscar empresas no SIGE', error);
      throw error;
    }
  }

  /**
   * Buscar resumo de valores a faturar de um ticket
   */
  async getTicketBillingSummary(ticketId: string): Promise<{
    appointments: {
      n1: { hours: number; amount: number };
      n2: { hours: number; amount: number };
      contract: { hours: number; amount: number };
      total: { hours: number; amount: number };
    };
    valuations: {
      count: number;
      amount: number;
    };
    grandTotal: number;
  }> {
    // Buscar apontamentos
    const appointments = await this.appointmentRepository.find({
      where: { ticket_id: ticketId },
    });

    // Buscar valorizações client_charge
    const valuations = await this.valuationRepository.find({
      where: {
        ticket_id: ticketId,
        category: ValuationCategory.CLIENT_CHARGE,
      },
    });

    // Calcular apontamentos por tipo
    const billableApps = appointments.filter(a => a.coverage_type === ServiceCoverageType.BILLABLE);
    const contractApps = appointments.filter(a => a.coverage_type === ServiceCoverageType.CONTRACT);

    const n1Apps = billableApps.filter(a => !a.service_level || a.service_level === 'n1');
    const n2Apps = billableApps.filter(a => a.service_level === 'n2');

    const calcHoursAndAmount = (apps: TicketAppointment[]) => ({
      hours: apps.reduce((sum, a) => sum + (a.duration_minutes / 60), 0),
      amount: apps.reduce((sum, a) => sum + Number(a.total_amount), 0),
    });

    const n1Summary = calcHoursAndAmount(n1Apps);
    const n2Summary = calcHoursAndAmount(n2Apps);
    const contractSummary = calcHoursAndAmount(contractApps);
    const totalAppointments = calcHoursAndAmount([...billableApps, ...contractApps.filter(a => a.total_amount > 0)]);

    // Calcular valorizações
    const valuationAmount = valuations.reduce((sum, v) => sum + Number(v.final_amount), 0);

    return {
      appointments: {
        n1: n1Summary,
        n2: n2Summary,
        contract: contractSummary,
        total: totalAppointments,
      },
      valuations: {
        count: valuations.length,
        amount: valuationAmount,
      },
      grandTotal: totalAppointments.amount + valuationAmount,
    };
  }
}
