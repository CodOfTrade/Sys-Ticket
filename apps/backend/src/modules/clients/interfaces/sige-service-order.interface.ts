export interface CreateServiceOrderDto {
  client_id: string;
  contract_id?: string;
  title: string;
  description: string;
  services: {
    service_id: string;
    quantity: number;
    price: number;
  }[];
  technician_id?: string;
  scheduled_date?: string;
  estimated_hours?: number;
}

export interface SigeServiceOrder {
  id: string;
  order_number: string;
  client_id: string;
  contract_id?: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled';

  // Valores
  total_value: number;
  discount: number;
  final_value: number;

  // Serviços
  services: {
    id: string;
    service_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];

  // Datas
  created_at: string;
  scheduled_date?: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;

  // Técnico
  technician_id?: string;
  technician_name?: string;

  // Horas
  estimated_hours?: number;
  actual_hours?: number;
}

export interface SigeServiceOrderResponse {
  data: SigeServiceOrder;
  message: string;
}
