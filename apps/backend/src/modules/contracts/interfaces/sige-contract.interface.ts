export interface SigeContract {
  id: string;
  client_id: string;
  name: string;
  description: string;
  contract_number: string;
  status: 'active' | 'inactive' | 'suspended' | 'expired';
  start_date: string;
  end_date: string;

  // Valores
  monthly_value: number;
  hourly_rate: number;
  included_hours: number;

  // SLA
  sla_response_time: number; // em minutos
  sla_resolution_time: number; // em minutos

  // Serviços incluídos
  services: {
    id: string;
    name: string;
    description: string;
    price: number;
  }[];

  created_at: string;
  updated_at: string;
}

export interface SigeContractResponse {
  data: SigeContract[];
  total: number;
  page: number;
  per_page: number;
}
