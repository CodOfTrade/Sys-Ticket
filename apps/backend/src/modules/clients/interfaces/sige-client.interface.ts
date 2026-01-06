export interface SigeInteracao {
  DataCadastro: string;
  DataRealizacao: string;
  Realizador: number;
  Descricao: string;
  Concluida: boolean;
}

export interface SigeClient {
  id?: string;
  Codigo?: number;
  Descricao?: string;
  DataAbertura?: string;
  DataFechamento?: string;
  DataPrevisaoFechamento?: string;
  DataUltimoEvento?: string;
  Responsavel?: string;
  Origem?: string | null;
  NomeOrigem?: string | null;
  StatusFunil?: string | null;
  Categoria?: string | null;
  Cliente?: string;
  Contato?: string;
  TelefoneContato?: string;
  EmailContato?: string | null;
  Valor?: number;
  Campanha?: string | null;
  Empresa?: string;
  SituacaoNegociacao?: number;
  MotivoCancelamento?: string | null;
  IndicacaoResponsavel?: string | null;
  Interacoes?: SigeInteracao[];
  // Campos adicionais do banco local
  nome?: string;
  razao_social?: string;
  nome_fantasia?: string;
  cpf_cnpj?: string;
  tipo_pessoa?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  ativo?: boolean;
}

export interface SigeClientResponse {
  data?: SigeClient[];
  meta?: {
    current_page: number;
    per_page: number;
    total: number;
  };
  // A API do SIGE Cloud retorna um array diretamente
  [key: number]: SigeClient;
}
