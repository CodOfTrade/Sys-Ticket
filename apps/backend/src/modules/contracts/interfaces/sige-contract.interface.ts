export interface SigeLancamentoContrato {
  CodigoLancamento: number;
  Valor: number;
  Pago: boolean;
}

export interface SigeContract {
  Codigo: number;
  Empresa: string;
  Cliente: string;
  Tipo: string;
  PlanoDeContas: string;
  FormaDePagamento: string;
  CentroDeCustos: string | null;
  ContaBancaria: string;
  Situacao: string;
  DiaVencimento: number;
  UltimoReajuste: string;
  ProximoReajuste: string;
  DataInicio: string;
  DataTermino: string;
  DiasCarencia: number;
  ValorTotal: number;
  LancamentosContrato: SigeLancamentoContrato[];
  Vendedor: string | null;
  ValorComissaoTotal: number;
  UrlDownload: string;
}

export interface SigeContractResponse {
  data?: SigeContract[];
  // A API do SIGE Cloud retorna um array diretamente, não dentro de "data"
  // Então vamos suportar ambos os casos
  [key: number]: SigeContract;
}
