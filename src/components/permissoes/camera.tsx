"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Botao } from "@/components/ui/button";
import { motivoDaFalha } from "@/lib/permissoes";

type Props = {
  onFoto: (arquivo: File) => void;
  onFechar: () => void;
  /** Chamado quando o sistema nega o acesso: quem abriu decide o que mostrar. */
  onNegada: () => void;
  /**
   * O navegador já tinha concedido a câmera antes. Nesse caso ela liga sozinha;
   * se não, a tela espera um toque em "Permitir" — no navegador, a pergunta do
   * sistema só aparece a partir de um gesto, e a pessoa precisa ver de onde ela
   * veio.
   */
  jaConcedida?: boolean;
};

type Fase = "aguardando" | "ligando" | "pronta" | "erro";

/**
 * A câmera dentro do app.
 *
 * Enquadrar o boleto na própria tela do NEXO vale mais que mandar para o app de
 * câmera do sistema: a pessoa vê a moldura, dispara e já volta com a foto.
 */
export function Camera({ onFoto, onFechar, onNegada, jaConcedida = false }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const trilha = useRef<MediaStream | null>(null);
  const [lente, setLente] = useState<"environment" | "user">("environment");
  const [fase, setFase] = useState<Fase>(jaConcedida ? "ligando" : "aguardando");
  const [erro, setErro] = useState<string | null>(null);

  const desligar = useCallback(() => {
    trilha.current?.getTracks().forEach((t) => t.stop());
    trilha.current = null;
  }, []);

  /** Conecta no hardware. Não mexe na fase antes do await de propósito: quem
   *  chama já colocou a tela em "ligando". */
  const conectar = useCallback(
    async (comQualLente: "environment" | "user") => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: comQualLente, width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        });
        trilha.current = stream;
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play().catch(() => {});
        }
        setFase("pronta");
      } catch (falha) {
        const { negada, mensagem } = motivoDaFalha(falha);
        desligar();
        if (negada) {
          onNegada();
          return;
        }
        setErro(mensagem);
        setFase("erro");
      }
    },
    [desligar, onNegada],
  );

  function ligar(comQualLente: "environment" | "user") {
    setErro(null);
    setFase("ligando");
    conectar(comQualLente);
  }

  // Quem já concedeu antes não deveria ter que tocar em "Permitir" de novo:
  // a fase já nasce como "ligando", então aqui só falta abrir o stream.
  useEffect(() => {
    // A fase só muda quando o getUserMedia responde, bem depois deste corpo —
    // é o caso de "assinar um sistema externo" que a própria regra descreve
    // como legítimo, mas que o linter não enxerga através do await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (jaConcedida) conectar("environment");
    return desligar;
    // Só na montagem: as trocas de lente passam por virarLente().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function virarLente() {
    const proxima = lente === "environment" ? "user" : "environment";
    desligar();
    setLente(proxima);
    ligar(proxima);
  }

  function disparar() {
    const elemento = video.current;
    if (!elemento || !elemento.videoWidth) return;

    const tela = document.createElement("canvas");
    tela.width = elemento.videoWidth;
    tela.height = elemento.videoHeight;
    tela.getContext("2d")?.drawImage(elemento, 0, 0);

    tela.toBlob(
      (blob) => {
        if (!blob) {
          setErro("Não consegui salvar a foto. Tenta de novo?");
          setFase("erro");
          return;
        }
        desligar();
        onFoto(new File([blob], `nexo-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  }

  function fechar() {
    desligar();
    onFechar();
  }

  // A câmera é preta nos dois temas, então a área inteira se declara escura e
  // os botões pegam a paleta certa sozinhos.
  return (
    <div
      data-tema="escuro"
      className="fixed inset-0 z-50 flex flex-col bg-black"
      role="dialog"
      aria-modal
      aria-label="Câmera"
    >
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={video}
          playsInline
          muted
          autoPlay
          className="size-full object-contain"
          // A frontal espelhada é o que a pessoa espera ver.
          style={lente === "user" ? { transform: "scaleX(-1)" } : undefined}
        />

        {/* Moldura: mostra onde o boleto cabe inteiro. */}
        {fase === "pronta" && (
          <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
            <div className="h-[70%] w-full max-w-md rounded-2xl border-2 border-dashed border-white/40" />
          </div>
        )}

        {/* O botão que liga a câmera fica na própria tela: no navegador, é este
            toque que faz o aviso do sistema aparecer. */}
        {(fase === "aguardando" || fase === "erro" || fase === "ligando") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="max-w-xs text-balance text-white">
              {fase === "ligando"
                ? "Abrindo a câmera…"
                : erro ?? "Toque em Permitir e confirme o aviso do navegador."}
            </p>
            {fase !== "ligando" && (
              <Botao variant="primary" size="lg" onClick={() => ligar(lente)}>
                {fase === "erro" ? "Tentar de novo" : "Permitir câmera"}
              </Botao>
            )}
            {fase !== "ligando" && (
              <Botao variant="ghost" onClick={fechar}>
                Usar a galeria em vez disso
              </Botao>
            )}
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Botao size="sm" variant="surface" onClick={fechar}>
            Cancelar
          </Botao>
          {fase === "pronta" && (
            <Botao size="sm" variant="surface" onClick={virarLente}>
              Virar câmera
            </Botao>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center bg-black px-6 pb-10 pt-6">
        <button
          type="button"
          onClick={disparar}
          disabled={fase !== "pronta"}
          aria-label="Tirar foto"
          className="dot3d size-18 border-4 border-white/85 disabled:opacity-40"
        />
      </div>

      <p className="bg-black pb-6 text-center text-xs text-white/60">
        Nada vira lembrete sem você confirmar.
      </p>
    </div>
  );
}
