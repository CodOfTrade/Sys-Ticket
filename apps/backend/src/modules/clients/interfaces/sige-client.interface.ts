export interface SigeClient {
  id: string;
  name: string;
  document: string; // CPF ou CNPJ
  email: string;
  phone: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface SigeClientResponse {
  data: SigeClient[];
  total: number;
  page: number;
  per_page: number;
}
