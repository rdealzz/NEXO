/**
 * Permissões nativas.
 *
 * A regra das lojas (Apple e Google) é a mesma, e é de bom senso: a pessoa
 * precisa saber **por que** o app quer a câmera ou as fotos dela *antes* de o
 * sistema perguntar. Um "Permitir?" que aparece do nada é negado — e uma
 * permissão negada no iOS não volta a perguntar: a pessoa tem que ir nos
 * ajustes do aparelho.
 *
 * Então o caminho aqui é sempre: toque → nossa tela explicando → a pessoa
 * aceita → só então a API nativa.
 */
export type Permissao = "camera" | "galeria" | "avisos";

/** O que o navegador/sistema já respondeu sobre a permissão. */
export type EstadoPermissao = "perguntar" | "concedida" | "negada" | "indisponivel";

export type TextoPermissao = {
  titulo: string;
  justificativa: string;
  /** O que a pessoa ganha, e o que o NEXO não faz. Um por linha. */
  detalhes: string[];
  aceitar: string;
  /** O caminho de volta quando o sistema já negou antes. */
  comoLiberar: string[];
};

export const TEXTOS: Record<Permissao, TextoPermissao> = {
  camera: {
    titulo: "Usar a câmera do aparelho",
    justificativa:
      "Precisamos de acesso à câmera para você fotografar boletos e documentos rapidamente — sem digitar valor, código de barras nem data.",
    detalhes: [
      "A câmera só abre quando você toca em Câmera. Nunca em segundo plano.",
      "Nada vira lembrete sem você confirmar na tela de revisão.",
      "Boletos e notas ficam num armazenamento privado, nunca público.",
    ],
    aceitar: "Entendi, permitir",
    comoLiberar: [
      "No celular: Ajustes → o app NEXO → Câmera → Permitir.",
      "No navegador: toque no cadeado ao lado do endereço e libere a câmera.",
      "Depois volte aqui e toque em Câmera de novo.",
    ],
  },
  avisos: {
    titulo: "Avisar você na hora certa",
    justificativa:
      "Precisamos da permissão de notificações para avisar quando o boleto está para vencer, quando a garantia acaba e quando o compromisso chega — mesmo com o app fechado.",
    detalhes: [
      "Só mandamos o que você mesmo pediu para lembrar. Nada de novidades nem promoção.",
      "Você escolhe a antecedência de cada aviso — de 10 minutos a 30 dias antes.",
      "Dá para desligar a qualquer momento nas Configurações.",
    ],
    aceitar: "Entendi, quero ser avisado",
    comoLiberar: [
      "No celular: Ajustes → o app NEXO → Notificações → Permitir.",
      "No navegador: toque no cadeado ao lado do endereço e libere as notificações.",
      "Depois volte aqui e ligue os avisos de novo.",
    ],
  },
  galeria: {
    titulo: "Acessar todas as fotos",
    justificativa:
      "Precisamos de acesso a todas as fotos para você enviar prints de conversa, comprovantes e fotos de nota fiscal que já estão salvas no aparelho.",
    detalhes: [
      "Escolhendo “Todas as fotos”, a foto certa está sempre a um toque — sem ter que reautorizar item por item.",
      "O NEXO não varre a sua galeria: só recebe a foto que você escolher.",
      "Nada é enviado antes de você confirmar na tela de revisão.",
    ],
    aceitar: "Entendi, escolher foto",
    comoLiberar: [
      "No celular: Ajustes → o app NEXO → Fotos → Todas as fotos.",
      "No navegador: verifique se o site pode acessar arquivos.",
      "Depois volte aqui e toque em Galeria de novo.",
    ],
  },
};

const CHAVE = "nexo:permissao:";

/** Se já explicamos e a pessoa aceitou, não repetimos a tela a cada toque. */
export function jaExplicada(permissao: Permissao): boolean {
  try {
    return localStorage.getItem(CHAVE + permissao) === "aceita";
  } catch {
    return false;
  }
}

export function marcarExplicada(permissao: Permissao): void {
  try {
    localStorage.setItem(CHAVE + permissao, "aceita");
  } catch {
    // Sem armazenamento a explicação reaparece. Chato, não quebrado.
  }
}

/**
 * O que o sistema já decidiu sobre a câmera. A Permissions API não existe em
 * todo navegador (e no Safari não cobre "camera"), daí o "indisponivel": aí só
 * dá para saber tentando.
 */
export async function estadoDaCamera(): Promise<EstadoPermissao> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return "indisponivel";
  try {
    const status = await navigator.permissions.query({ name: "camera" as PermissionName });
    if (status.state === "granted") return "concedida";
    if (status.state === "denied") return "negada";
    return "perguntar";
  } catch {
    return "indisponivel";
  }
}

/** O que o navegador já decidiu sobre os avisos. */
export function estadoDosAvisos(): EstadoPermissao {
  if (typeof window === "undefined" || !("Notification" in window)) return "indisponivel";
  if (Notification.permission === "granted") return "concedida";
  if (Notification.permission === "denied") return "negada";
  return "perguntar";
}

/** Push exige service worker e contexto seguro — não existe em http. */
export function avisosDisponiveis(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/** getUserMedia só existe em contexto seguro (https ou localhost). */
export function cameraDisponivel(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

/** Traduz o erro do getUserMedia para algo que a pessoa entenda. */
export function motivoDaFalha(erro: unknown): { negada: boolean; mensagem: string } {
  const nome = erro instanceof Error ? erro.name : "";
  if (nome === "NotAllowedError" || nome === "SecurityError") {
    return { negada: true, mensagem: "O acesso à câmera está bloqueado neste aparelho." };
  }
  if (nome === "NotFoundError" || nome === "OverconstrainedError") {
    return { negada: false, mensagem: "Não encontrei uma câmera disponível aqui." };
  }
  if (nome === "NotReadableError") {
    return { negada: false, mensagem: "A câmera está ocupada por outro app. Feche ele e tente de novo." };
  }
  return { negada: false, mensagem: "Não consegui abrir a câmera agora." };
}
