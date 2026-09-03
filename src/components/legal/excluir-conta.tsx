"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Botao } from "@/components/ui/button";

/**
 * Excluir conta.
 *
 * Uma ação sem volta não pode acontecer por engano nem por um toque distraído:
 * a pessoa precisa abrir o diálogo, ler o que sai do banco e escrever EXCLUIR.
 * E, do outro lado, não pode ser difícil de propósito — a LGPD garante esse
 * direito, então nada de esconder o botão ou pedir para "falar com o suporte".
 */
export function ExcluirConta({ email }: { email: string | null }) {
  const router = useRouter();
  const dialogo = useRef<HTMLDialogElement>(null);
  const [confirmacao, setConfirmacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  // Depois de apagar não há mais tela para voltar: a pessoa vai para a vitrine.
  useEffect(() => {
    if (!pronto) return;
    const ida = setTimeout(() => {
      router.replace("/");
      // A sessão acabou de ser derrubada: sem o refresh, as telas já renderizadas
      // continuariam mostrando os dados de uma conta que não existe mais.
      router.refresh();
    }, 2500);
    return () => clearTimeout(ida);
  }, [pronto, router]);

  async function excluir() {
    setEnviando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/conta/excluir", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmacao: "EXCLUIR" }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.error ?? "Não consegui excluir agora.");
      setPronto(true);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui excluir agora.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <Botao variant="danger" size="sm" onClick={() => dialogo.current?.showModal()}>
        Excluir conta
      </Botao>

      <dialog
        ref={dialogo}
        onClose={() => {
          setConfirmacao("");
          setErro(null);
        }}
        aria-labelledby="excluir-titulo"
        className="vidro m-auto w-[min(30rem,calc(100vw-2rem))] rounded-3xl border p-6 text-foreground"
      >
        {pronto ? (
          <>
            <h2 id="excluir-titulo" className="text-xl font-semibold tracking-tight">
              Conta excluída
            </h2>
            <p className="mt-2 leading-relaxed text-muted">
              Apagamos tudo que era seu. Obrigado por ter usado o NEXO — se um dia quiser voltar, é só criar
              outra conta do zero.
            </p>
          </>
        ) : (
          <>
            <h2 id="excluir-titulo" className="text-xl font-semibold tracking-tight">
              Excluir a conta {email ?? ""}
            </h2>
            <p className="mt-2 leading-relaxed text-muted">
              Isso é definitivo e imediato. Não há lixeira, não há como desfazer, e nós não guardamos uma cópia.
            </p>

            <ul className="mt-4 space-y-1.5 text-sm">
              {[
                "Todos os lembretes e avisos agendados",
                "Todas as capturas e os arquivos originais (boletos, notas fiscais)",
                "O histórico de compras e garantias",
                "Seu perfil, o endereço de entrada por e-mail e o telefone vinculado",
                "O seu login",
              ].map((item) => (
                <li key={item} className="flex gap-2.5 leading-snug">
                  <span aria-hidden className="mt-px shrink-0 font-semibold text-danger">
                    ×
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <label htmlFor="confirmacao" className="mt-5 block text-sm font-medium">
              Para confirmar, escreva <span className="font-mono font-semibold">EXCLUIR</span>:
            </label>
            <input
              id="confirmacao"
              value={confirmacao}
              onChange={(evento) => setConfirmacao(evento.target.value.toUpperCase())}
              autoComplete="off"
              className="campo mt-2 font-mono"
            />

            {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}

            <div className="mt-6 flex flex-col gap-2">
              <Botao
                variant="danger"
                size="lg"
                block
                disabled={confirmacao !== "EXCLUIR" || enviando}
                onClick={excluir}
              >
                {enviando ? "Apagando…" : "Excluir tudo, definitivamente"}
              </Botao>
              <Botao variant="ghost" block onClick={() => dialogo.current?.close()}>
                Cancelar
              </Botao>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
