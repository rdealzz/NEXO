"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Camera } from "@/components/permissoes/camera";
import { ModalPermissao } from "@/components/permissoes/modal-permissao";
import { Botao } from "@/components/ui/button";
import type { CaptureKind } from "@/lib/nexo/schema";
import {
  cameraDisponivel,
  estadoDaCamera,
  jaExplicada,
  marcarExplicada,
  type Permissao,
} from "@/lib/permissoes";

export type CapturePayload = { kind: CaptureKind; text?: string; file?: File };

type Props = {
  busy: boolean;
  onCapture: (payload: CapturePayload) => void;
};

/** Tipos do MIME que o motor de extração aceita hoje. */
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,application/pdf";

function kindForFile(file: File): CaptureKind {
  return file.type.startsWith("image/") ? "imagem" : "documento";
}

export function DropArea({ busy, onCapture }: Props) {
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<File | null>(null);
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  // O pedido de permissão em curso: qual, e se é para explicar ou para ensinar
  // o caminho de volta depois de o sistema ter negado.
  const [pedido, setPedido] = useState<{ permissao: Permissao; modo: "explicar" | "bloqueada" } | null>(null);
  const [cameraAberta, setCameraAberta] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const galeriaInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);

  const send = useCallback(() => {
    if (busy) return;
    if (pending) {
      onCapture({ kind: kindForFile(pending), text: text.trim() || undefined, file: pending });
      setPending(null);
      setText("");
      return;
    }
    if (text.trim()) {
      onCapture({ kind: "texto", text: text.trim() });
      setText("");
    }
  }, [busy, onCapture, pending, text]);

  /**
   * Foto direto da câmera: manda na hora.
   *
   * A pessoa acabou de enquadrar e disparar — parar para ela tocar em "Mandar"
   * só adiciona um passo entre pensar e poder esquecer.
   */
  const fotografou = useCallback(
    (arquivo: File) => {
      setCameraAberta(false);
      onCapture({ kind: "imagem", file: arquivo });
    },
    [onCapture],
  );

  /** Abre a câmera de verdade — só é chamado depois do aceite. */
  const abrirCamera = useCallback(() => {
    marcarExplicada("camera");
    setPedido(null);
    // Sem getUserMedia (navegador antigo, ou http), o app de câmera do sistema
    // ainda resolve: o <input capture> abre ele.
    if (cameraDisponivel()) setCameraAberta(true);
    else cameraInput.current?.click();
  }, []);

  const abrirGaleria = useCallback(() => {
    marcarExplicada("galeria");
    setPedido(null);
    galeriaInput.current?.click();
  }, []);

  /**
   * O toque em Câmera nunca aciona o hardware direto: ou a pessoa já aceitou a
   * explicação antes (e o sistema já concedeu), ou ela vê a explicação primeiro.
   */
  async function pedirCamera() {
    const estado = await estadoDaCamera();
    if (estado === "negada") {
      setPedido({ permissao: "camera", modo: "bloqueada" });
      return;
    }
    if (estado === "concedida" && jaExplicada("camera")) {
      abrirCamera();
      return;
    }
    setPedido({ permissao: "camera", modo: "explicar" });
  }

  function pedirGaleria() {
    // Não existe Permissions API para o seletor de arquivos: o que dá para
    // lembrar é se já explicamos e a pessoa aceitou.
    if (jaExplicada("galeria")) abrirGaleria();
    else setPedido({ permissao: "galeria", modo: "explicar" });
  }

  // Colar um print direto na página é o caminho mais curto que existe.
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const file = Array.from(event.clipboardData?.files ?? [])[0];
      if (file) {
        event.preventDefault();
        setPending(file);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  function toggleMic() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Ctor =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
    if (!Ctor) {
      setSpeechError("Seu navegador não transcreve áudio. Use Chrome ou Edge, ou digite o que ouviu.");
      return;
    }
    // A transcrição acontece no próprio dispositivo: o áudio nunca sobe.
    const engine = new Ctor();
    engine.lang = "pt-BR";
    engine.continuous = true;
    engine.interimResults = false;
    engine.onresult = (event) => {
      let captured = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        captured += event.results[i][0].transcript;
      }
      setText((current) => `${current}${current ? " " : ""}${captured.trim()}`);
    };
    engine.onerror = () => setSpeechError("Não consegui ouvir. Tenta de novo?");
    engine.onend = () => setListening(false);
    recognition.current = engine;
    setSpeechError(null);
    setListening(true);
    engine.start();
  }

  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) setPending(file);
      }}
      className={`rounded-2xl border-2 border-dashed p-4 transition-colors sm:p-5 ${
        dragging ? "border-accent bg-accent-soft" : "border-line bg-surface"
      }`}
    >
      <label htmlFor="nexo-drop" className="block text-sm font-medium text-muted">
        O que você não quer esquecer?
      </label>

      <textarea
        id="nexo-drop"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) send();
        }}
        rows={3}
        disabled={busy}
        placeholder="Escreva, cole um print, arraste um boleto. Ou fale."
        className="mt-2 w-full resize-none bg-transparent text-base outline-none placeholder:text-muted/60 disabled:opacity-50"
      />

      {pending && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm">
          <span className="truncate">{pending.name}</span>
          <Botao
            size="chip"
            variant="surface"
            onClick={() => setPending(null)}
            className="ml-auto shrink-0"
            aria-label="Remover arquivo"
          >
            remover
          </Botao>
        </div>
      )}

      {speechError && <p className="mb-3 text-sm text-[#e0483a]">{speechError}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <ToolButton onClick={pedirCamera} disabled={busy}>
          Câmera
        </ToolButton>
        <ToolButton onClick={pedirGaleria} disabled={busy}>
          Galeria
        </ToolButton>
        <ToolButton onClick={() => fileInput.current?.click()} disabled={busy}>
          Arquivo
        </ToolButton>
        <ToolButton onClick={toggleMic} disabled={busy} active={listening}>
          {listening ? "Ouvindo…" : "Falar"}
        </ToolButton>

        <Botao
          variant="primary"
          onClick={send}
          disabled={busy || (!text.trim() && !pending)}
          className="ml-auto"
        >
          {busy ? "Entendendo…" : "Mandar"}
        </Botao>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(event) => setPending(event.target.files?.[0] ?? null)}
      />
      <input
        ref={galeriaInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => setPending(event.target.files?.[0] ?? null)}
      />
      {/* Só entra em cena quando não há getUserMedia: abre o app de câmera do sistema. */}
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          const arquivo = event.target.files?.[0];
          if (arquivo) fotografou(arquivo);
        }}
      />

      {pedido && (
        <ModalPermissao
          key={`${pedido.permissao}-${pedido.modo}`}
          permissao={pedido.permissao}
          modo={pedido.modo}
          onAceitar={pedido.permissao === "camera" ? abrirCamera : abrirGaleria}
          onFechar={() => setPedido(null)}
        />
      )}

      {cameraAberta && (
        <Camera
          onFoto={fotografou}
          onFechar={() => setCameraAberta(false)}
          onNegada={() => {
            setCameraAberta(false);
            setPedido({ permissao: "camera", modo: "bloqueada" });
          }}
        />
      )}
    </section>
  );
}

function ToolButton({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Botao
      variant={active ? "soft" : "surface"}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
    >
      {children}
    </Botao>
  );
}

/** A Web Speech API não tem tipos no lib.dom padrão; só o que usamos aqui. */
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: (event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onerror: () => void;
  onend: () => void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
