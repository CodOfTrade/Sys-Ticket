export interface SigeInteracao {
  DataCadastro: string;
  DataRealizacao: string;
  Realizador: number;
  Descricao: string;
  Concluida: boolean;
}

export interface SigeClient {
  Codigo: number;
  Descricao: string;
  DataAbertura: string;
  DataFechamento: string;
  DataPrevisaoFechamento: string;
  DataUltimoEvento: string;
  Responsavel: string;
  Origem: string | null;
  NomeOrigem: string | null;
  StatusFunil: string | null;
  Categoria: string | null;
  Cliente: string;
  Contato: string;
  TelefoneContato: string;
  EmailContato: string | null;
  Valor: number;
  Campanha: string | null;
  Empresa: string;
  SituacaoNegociacao: number;
  MotivoCancelamento: string | null;
  IndicacaoResponsavel: string | null;
  Interacoes: SigeInteracao[];
}

export interface SigeClientResponse {
  data?: SigeClient[];
  // A API do SIGE Cloud retorna um array diretamente
  [key: number]: SigeClient;
}
