/**
 * Os avatares do NEXO.
 *
 * São bichos desenhados em SVG, não fotos: carregam em qualquer conexão,
 * ficam nítidos em qualquer tamanho e não dependem de um serviço de terceiros
 * que um dia sai do ar. Vêm em duas famílias — quentes e frios — porque
 * escolher entre 8 iguais é decisão; escolher entre dois climas é gosto.
 */
export type FamiliaAvatar = "quentes" | "frios";

export type Avatar = {
  id: string;
  nome: string;
  familia: FamiliaAvatar;
  /** Fundo do disco e as duas cores do bicho. */
  fundo: string;
  corpo: string;
  detalhe: string;
};

export const AVATARES: Avatar[] = [
  { id: "raposa", nome: "Raposa", familia: "quentes", fundo: "#fde8d7", corpo: "#e8763a", detalhe: "#fff6ef" },
  { id: "leao", nome: "Leão", familia: "quentes", fundo: "#fdefcf", corpo: "#e0a32a", detalhe: "#8a5a12" },
  { id: "tucano", nome: "Tucano", familia: "quentes", fundo: "#ffe6e0", corpo: "#2c2a28", detalhe: "#f2762c" },
  { id: "camelo", nome: "Camelo", familia: "quentes", fundo: "#f6ead6", corpo: "#c99b62", detalhe: "#6b4a24" },
  { id: "pinguim", nome: "Pinguim", familia: "frios", fundo: "#dbeefb", corpo: "#22303c", detalhe: "#f6a723" },
  { id: "coruja", nome: "Coruja", familia: "frios", fundo: "#e2e6f5", corpo: "#5b6b93", detalhe: "#f5d76e" },
  { id: "baleia", nome: "Baleia", familia: "frios", fundo: "#d9edf3", corpo: "#3b7a94", detalhe: "#eaf6fa" },
  { id: "urso", nome: "Urso polar", familia: "frios", fundo: "#e8f1f6", corpo: "#f3f7fa", detalhe: "#25313a" },
];

export function acharAvatar(id: string | null | undefined): Avatar | null {
  if (!id) return null;
  return AVATARES.find((a) => a.id === id) ?? null;
}

/** Sem escolha, o bicho sai do id — estável, e nunca duas pessoas iguais em fila. */
export function avatarPadrao(semente: string): Avatar {
  let soma = 0;
  for (let i = 0; i < semente.length; i += 1) soma = (soma + semente.charCodeAt(i) * (i + 1)) % 9973;
  return AVATARES[soma % AVATARES.length];
}

/**
 * Onde a escolha fica para quem ainda não tem conta. Com conta, o bicho mora no
 * perfil (campo avatar_id) e vale em qualquer aparelho.
 */
export const CHAVE_AVATAR = "nexo:avatar";
