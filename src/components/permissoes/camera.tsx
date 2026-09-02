"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Botao } from "@/components/ui/button";
import { motivoDaFalha } from "@/lib/permissoes";

type Props = {
  onFoto: (arquivo: File) => void;
  onFechar: () => void;
  /** Chamado quando o sistema nega o acesso: quem abriu decide o que mostrar. */
  onNegada: () => void;
};

/**
 * A câmera dentro do app.
 *
 * Ela só é montada depois de a pessoa aceitar a explicação — é aqui que o
 * `getUserMedia` roda e o aparelho faz a pergunta dele. Enquadrar o boleto na
 * própria tela do NEXO vale mais que mandar para o app de câmera do sistema:
 * a pessoa vê a moldura, tira e já volta com a foto.
 */
export function Camera({ onFoto, onFechar, onNegada }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const trilha = useRef<MediaStream | null>(null);
  const [lente, setLente] = useState<"environment" | "user">("environment");
  const [erro, setErro] = useState<string | null>(null);
  const [pronta, setPronta] = useState(false);

  const desligar = useCallback(() => {
    trilha.current?.getTracks().forEach((t) => t.stop());
    trilha.current = null;
  }, []);

  useEffect(() => {
    let cancelado = false;

    async function ligar() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: lente, width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        });
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        trilha.current = stream;
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play().catch(() => {});
        }
        setPronta(true);
      } catch (falha) {
        if (cancelado) return;
        const { negada, mensagem } = motivoDaFalha(falha);
        if (negada) onNegada();
        else setErro(mensagem);
      }
    }

    ligar();
    return () => {
      cancelado = true;
      desligar();
    };
  }, [lente, desligar, onNegada]);

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
          return;
        }
        desligar();
        onFoto(new File([blob], `nexo-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-modal aria-label="Câmera">
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
        {pronta && !erro && (
          <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
            <div className="h-[70%] w-full max-w-md rounded-2xl border-2 border-dashed border-white/40" />
          </div>
        )}

        {erro && (
          <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-2xl bg-white/95 p-4 text-center text-sm text-[#16150f]">
            {erro}
          </p>
        )}

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Botao size="sm" variant="surface" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao
            size="sm"
            variant="surface"
            onClick={() => {
              desligar();
              setPronta(false);
              setLente((atual) => (atual === "environment" ? "user" : "environment"));
            }}
          >
            Virar câmera
          </Botao>
        </div>
      </div>

      <div className="flex items-center justify-center bg-black px-6 pb-10 pt-6">
        <button
          type="button"
          onClick={disparar}
          disabled={!pronta || !!erro}
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
