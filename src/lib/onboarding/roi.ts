/**
 * Quanto custa esquecer.
 *
 * Cada item é um esquecimento comum, com o custo de UMA ocorrência e a conta
 * que produz esse custo. Os números são estimativas conservadoras de mercado —
 * `base` diz de onde vem cada um, e a tela mostra isso para a pessoa. Não
 * inventamos economia: quem multiplica é o próprio usuário, escolhendo quantas
 * vezes aquilo aconteceu com ele no último ano.
 */
export type ItemROI = {
  id: string;
  icone: string;
  titulo: string;
  cenario: string;
  base: string;
  /** Custo de uma ocorrência, em reais. */
  custo: number;
  /** Quantas vezes já vem marcado — o que acontece com quase todo mundo. */
  padrao: number;
  /** O que o NEXO faz para isso não acontecer. */
  comONexo: string;
};

export const ITENS_ROI: ItemROI[] = [
  {
    id: "boleto",
    icone: "🧾",
    titulo: "Boleto pago depois do vencimento",
    cenario: "Conta de R$ 320 paga 10 dias atrasada",
    base: "Multa de 2% + juros de 1% ao mês, o teto do Código de Defesa do Consumidor",
    custo: 8,
    padrao: 3,
    comONexo: "Você fotografa o boleto. O aviso chega 3 dias antes e no dia.",
  },
  {
    id: "religacao",
    icone: "💡",
    titulo: "Luz ou água cortada por atraso",
    cenario: "Taxa de religação depois do corte",
    base: "Faixa cobrada pelas distribuidoras para religação em até 24h",
    custo: 45,
    padrao: 0,
    comONexo: "Conta de consumo vira lembrete recorrente sozinha — todo mês, no mesmo dia.",
  },
  {
    id: "rotativo",
    icone: "💳",
    titulo: "Fatura do cartão que caiu no rotativo",
    cenario: "R$ 1.200 rolando por um mês",
    base: "Juros médios do rotativo do cartão de crédito no Brasil, ~14% ao mês",
    custo: 168,
    padrao: 0,
    comONexo: "O vencimento da fatura entra assim que você manda o print do app do banco.",
  },
  {
    id: "garantia",
    icone: "📺",
    titulo: "Produto que quebrou depois da garantia vencer",
    cenario: "Conserto de uma TV fora do prazo, sem cobertura",
    base: "Orçamento médio de reparo de painel/placa em TV de 50\"",
    custo: 650,
    padrao: 0,
    comONexo: "A nota fiscal já guarda o fim da garantia — e avisa 30 dias antes.",
  },
  {
    id: "consulta",
    icone: "🩺",
    titulo: "Consulta médica esquecida",
    cenario: "Clínica cobra a consulta por falta sem aviso",
    base: "Valor cobrado por no-show em consulta particular",
    custo: 250,
    padrao: 1,
    comONexo: "O print da confirmação vira compromisso com aviso na véspera e 1h antes.",
  },
  {
    id: "licenciamento",
    icone: "🚗",
    titulo: "Licenciamento vencido",
    cenario: "Parado numa blitz com o documento atrasado",
    base: "Infração gravíssima do CTB: R$ 293,47, 7 pontos e remoção do veículo",
    custo: 293,
    padrao: 0,
    comONexo: "Mandou o CRLV? Ele já conhece licenciamento, IPVA, seguro e revisão.",
  },
  {
    id: "assinatura",
    icone: "🔁",
    titulo: "Assinatura que renovou sozinha",
    cenario: "R$ 34,90 por mês durante 6 meses sem usar",
    base: "Ticket médio de streaming/app com renovação automática",
    custo: 209,
    padrao: 1,
    comONexo: "O e-mail de cobrança encaminhado vira aviso antes da próxima renovação.",
  },
];

export function totalPerdido(vezes: Record<string, number>): number {
  return ITENS_ROI.reduce((soma, item) => soma + item.custo * (vezes[item.id] ?? 0), 0);
}

export function vezesPadrao(): Record<string, number> {
  return Object.fromEntries(ITENS_ROI.map((item) => [item.id, item.padrao]));
}
