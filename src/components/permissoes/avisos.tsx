"use client";

import { useState, useSyncExternalStore } from "react";

import { ModalPermissao } from "@/components/permissoes/modal-permissao";
import { Botao } from "@/components/ui/button";
import { avisosDisponiveis, estadoDosAvisos, jaExplicada, marcarExplicada } from "@/lib/permissoes";

/**
 * Ligar os avisos.
 *
 * Mesma ordem das outras permissões: explicação primeiro, pergunta do sistema
 * depois. Aqui isso importa ainda mais — notificação negada é o fim do produto,
 * porque tudo que o NEXO promete acontece através dela.
 */
const CHAVE_LIGADO = "nexo:push";
const ouvintes = new Set<() => void>();

function inscreverNoEstado(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

/** Ligado = o navegador permitiu E este aparelho já se registrou aqui. */
function estadoLigado(): string {
  try {
    return estadoDosAvisos() === "concedida" && localStorage.getItem(CHAVE_LIGADO) === "sim" ? "sim" : "nao";
  } catch {
    return "nao";
  }
}

function estadoNoServidor(): string {
  return "servidor";
}

export function AtivarAvisos({
  chavePublica,
  compacto = false,
}: {
  chavePublica: string | null;
  /** Na caixa de entrada o convite some assim que os avisos estão ligados. */
  compacto?: boolean;
}) {
  const ligado = useSyncExternalStore(inscreverNoEstado, estadoLigado, estadoNoServidor);
  const [pedido, setPedido] = useState<"explicar" | "bloqueada" | null>(null);
  const [estado, setEstado] = useState<"parado" | "ligando" | "ligado" | "erro">("parado");
  const [erro, setErro] = useState<string | null>(null);

  const indisponivel = !chavePublica;

  async function inscrever() {
    setPedido(null);
    marcarExplicada("avisos");
    setEstado("ligando");
    setErro(null);

    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado("parado");
        setPedido("bloqueada");
        return;
      }

      const registro = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Reaproveita a assinatura existente: reinscrever gera outro endpoint e a
      // pessoa passaria a receber o mesmo aviso duas vezes.
      const assinatura =
        (await registro.pushManager.getSubscription()) ??
        (await registro.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ParaBytes(chavePublica!),
        }));

      const resposta = await fetch("/api/push/inscrever", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(assinatura.toJSON()),
      });
      if (!resposta.ok) throw new Error("Não consegui registrar este aparelho.");

      try {
        localStorage.setItem(CHAVE_LIGADO, "sim");
      } catch {
        // Sem armazenamento o convite reaparece. Registrar de novo é inofensivo:
        // o endpoint é o mesmo, então a linha é atualizada, não duplicada.
      }
      for (const ouvinte of ouvintes) ouvinte();
      setEstado("ligado");
    } catch (falha) {
      setEstado("erro");
      setErro(falha instanceof Error ? falha.message : "Não consegui ligar os avisos.");
    }
  }

  function pedir() {
    if (!avisosDisponiveis()) {
      setEstado("erro");
      setErro("Este navegador não recebe avisos. No iPhone, instale o NEXO na tela de início primeiro.");
      return;
    }
    const atual = estadoDosAvisos();
    if (atual === "negada") {
      setPedido("bloqueada");
      return;
    }
    if (atual === "concedida" && jaExplicada("avisos")) {
      inscrever();
      return;
    }
    setPedido("explicar");
  }

  // Já ligado: em Configurações vira confirmação; na caixa de entrada, some.
  if (estado === "ligado" || ligado === "sim") {
    if (compacto) return null;
    return (
      <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent">
        Avisos ligados neste aparelho. Pode fechar o app — eu chamo você.
      </p>
    );
  }

  // No servidor não dá para saber se já está ligado; o convite da caixa de
  // entrada espera o navegador responder para não piscar na tela de quem já ligou.
  if (compacto && (ligado === "servidor" || indisponivel)) return null;

  if (compacto) {
    return (
      <>
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
          <p className="min-w-0 flex-1 text-sm">
            <strong className="font-medium">Ligue os avisos</strong> — sem eles, o NEXO só lembra quando você
            abre o app.
          </p>
          <Botao variant="primary" size="sm" onClick={pedir} disabled={estado === "ligando"}>
            {estado === "ligando" ? "Ligando…" : "Ligar avisos"}
          </Botao>
        </div>
        {erro && <p className="mb-4 text-sm text-danger">{erro}</p>}
        {pedido && (
          <ModalPermissao
            key={pedido}
            permissao="avisos"
            modo={pedido}
            onAceitar={inscrever}
            onFechar={() => setPedido(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="mt-3">
        <Botao variant="primary" size="sm" onClick={pedir} disabled={estado === "ligando" || indisponivel}>
          {estado === "ligando" ? "Ligando…" : "Ligar avisos neste aparelho"}
        </Botao>
      </div>

      {indisponivel && (
        <p className="mt-2 text-xs text-muted">
          Ainda não configurado neste ambiente (faltam as chaves <code className="font-mono">VAPID_*</code>).
        </p>
      )}
      {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}

      {pedido && (
        <ModalPermissao
          key={pedido}
          permissao="avisos"
          modo={pedido}
          onAceitar={inscrever}
          onFechar={() => setPedido(null)}
        />
      )}
    </>
  );
}

/** A chave VAPID viaja em base64url; o navegador quer bytes. */
function base64ParaBytes(base64url: string): ArrayBuffer {
  const preenchido = base64url.padEnd(base64url.length + ((4 - (base64url.length % 4)) % 4), "=");
  const bruto = atob(preenchido.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(bruto.length);
  for (let i = 0; i < bruto.length; i += 1) bytes[i] = bruto.charCodeAt(i);
  return bytes.buffer;
}
