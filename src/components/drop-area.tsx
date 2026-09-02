"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CaptureKind } from "@/lib/nexo/schema";

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
  const fileInput = useRef<HTMLInputElement>(null);
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
          <button
            type="button"
            onClick={() => setPending(null)}
            className="ml-auto shrink-0 text-muted hover:text-foreground"
            aria-label="Remover arquivo"
          >
            remover
          </button>
        </div>
      )}

      {speechError && <p className="mb-3 text-sm text-[#e0483a]">{speechError}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <ToolButton onClick={() => fileInput.current?.click()} disabled={busy}>
          Arquivo
        </ToolButton>
        <ToolButton onClick={() => cameraInput.current?.click()} disabled={busy}>
          Foto
        </ToolButton>
        <ToolButton onClick={toggleMic} disabled={busy} active={listening}>
          {listening ? "Ouvindo…" : "Falar"}
        </ToolButton>

        <button
          type="button"
          onClick={send}
          disabled={busy || (!text.trim() && !pending)}
          className="ml-auto rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background transition-opacity disabled:opacity-40"
        >
          {busy ? "Entendendo…" : "Mandar"}
        </button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(event) => setPending(event.target.files?.[0] ?? null)}
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => setPending(event.target.files?.[0] ?? null)}
      />
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
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors disabled:opacity-40 ${
        active ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
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
