/**
 * Tema do NEXO.
 *
 * Regra do produto: o app **abre no claro**, sempre, inclusive para quem usa o
 * sistema no escuro. O escuro só aparece quando a pessoa pede — e, a partir daí,
 * a escolha dela vale em todo acesso seguinte.
 */
export type Tema = "claro" | "escuro" | "sistema";

export const CHAVE_TEMA = "nexo:tema";
export const TEMA_PADRAO: Tema = "claro";

/** A cor da barra do navegador/sistema em cada tema. */
export const COR_DA_BARRA = { claro: "#f7f7f5", escuro: "#0d0e0c" } as const;

export const TEMAS: { id: Tema; nome: string; descricao: string }[] = [
  { id: "claro", nome: "Claro", descricao: "Como o app abre por padrão." },
  { id: "escuro", nome: "Escuro", descricao: "Para ler à noite sem queimar a vista." },
  { id: "sistema", nome: "Sistema", descricao: "Acompanha o ajuste do seu aparelho." },
];

export function ehTema(valor: unknown): valor is Tema {
  return valor === "claro" || valor === "escuro" || valor === "sistema";
}

/** "sistema" vira claro ou escuro; o resto é ele mesmo. */
export function resolverTema(preferencia: Tema): "claro" | "escuro" {
  if (preferencia !== "sistema") return preferencia;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "escuro"
    : "claro";
}

export function lerPreferencia(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE_TEMA);
    return ehTema(salvo) ? salvo : TEMA_PADRAO;
  } catch {
    return TEMA_PADRAO;
  }
}

/** Aplica no documento e guarda a escolha. Só faz sentido no cliente. */
export function aplicarTema(preferencia: Tema): "claro" | "escuro" {
  const resolvido = resolverTema(preferencia);
  document.documentElement.dataset.tema = resolvido;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COR_DA_BARRA[resolvido]);
  try {
    localStorage.setItem(CHAVE_TEMA, preferencia);
  } catch {
    // Navegador sem armazenamento: o tema vale só nesta sessão. Tudo bem.
  }
  return resolvido;
}

/**
 * Roda antes da primeira pintura, no <body>. Sem isso, quem escolheu escuro vê
 * um flash branco a cada carregamento — o pior jeito de entregar modo escuro.
 */
export const SCRIPT_DO_TEMA = `(function(){try{var p=localStorage.getItem("${CHAVE_TEMA}")||"${TEMA_PADRAO}";var e=p==="escuro"||(p==="sistema"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.tema=e?"escuro":"claro";var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",e?"${COR_DA_BARRA.escuro}":"${COR_DA_BARRA.claro}");}catch(_){document.documentElement.dataset.tema="claro";}})();`;
