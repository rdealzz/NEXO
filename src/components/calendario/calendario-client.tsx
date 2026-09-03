"use client";

import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Calendar } from "@/components/ui/calendar";
import type { Reminder } from "@/lib/db";
import { CATEGORY_LABEL, humanLead, humanRepeat, urgencyColor } from "@/lib/format";

/**
 * O mês inteiro numa olhada.
 *
 * A caixa de entrada responde "o que é agora?"; o calendário responde "como está
 * o mês?" — que é a pergunta de quem quer saber se pode viajar, ou quantas
 * contas caem na mesma semana. O ponto embaixo do dia é o que carrega a
 * informação: sem ele o calendário seria só um seletor de data.
 */
export function CalendarioClient({ reminders }: { reminders: Reminder[] }) {
  const [selecionado, setSelecionado] = useState<Date | undefined>(new Date());

  const porDia = useMemo(() => {
    const mapa = new Map<string, Reminder[]>();
    for (const lembrete of reminders) {
      if (!lembrete.due_date || lembrete.status !== "pendente") continue;
      const lista = mapa.get(lembrete.due_date) ?? [];
      lista.push(lembrete);
      mapa.set(lembrete.due_date, lista);
    }
    return mapa;
  }, [reminders]);

  // A data vem como YYYY-MM-DD; construir com meio-dia evita que o fuso jogue
  // o dia para trás no calendário.
  const diasComLembrete = useMemo(
    () => [...porDia.keys()].map((dia) => new Date(`${dia}T12:00:00`)),
    [porDia],
  );

  const chave = selecionado ? formatarChave(selecionado) : null;
  const doDia = chave ? (porDia.get(chave) ?? []) : [];
  const semData = reminders.filter((r) => r.due_date === null && r.status === "pendente");

  return (
    <div className="space-y-6">
      <div className="cartao flex justify-center p-2">
        <Calendar
          mode="single"
          selected={selecionado}
          onSelect={setSelecionado}
          locale={ptBR}
          showOutsideDays
          modifiers={{ comLembrete: diasComLembrete }}
          modifiersClassNames={{ comLembrete: "dia-com-lembrete" }}
          // A largura vem daqui porque o --cell-size do componente não pega no
          // Tailwind v4 (ver nota no fim desta conversa).
          className="w-full max-w-sm"
        />
      </div>

      <section>
        <h2 className="text-sm font-semibold">
          {selecionado
            ? selecionado.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
            : "Escolha um dia"}
        </h2>

        {doDia.length === 0 ? (
          <p className="mt-3 px-4 py-10 text-center text-sm text-muted">Nada marcado para este dia.</p>
        ) : (
          <ul className="entra-em-cascata mt-3 space-y-2">
            {doDia.map((lembrete) => (
              <li key={lembrete.id} className="peca cartao flex gap-3 p-3">
                <span
                  aria-hidden
                  className="mt-1.5 size-2.5 shrink-0 rounded-full"
                  style={{ background: urgencyColor(lembrete.due_date) }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{lembrete.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {lembrete.due_time ? `${lembrete.due_time} · ` : ""}
                    aviso {humanLead(lembrete.lead_minutes)}
                    {humanRepeat(lembrete.repeat_rule) ? ` · ${humanRepeat(lembrete.repeat_rule)}` : ""} ·{" "}
                    {CATEGORY_LABEL[lembrete.category]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {semData.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold">
            {semData.length === 1 ? "1 item sem data" : `${semData.length} itens sem data`}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Estes não aparecem no calendário porque ainda não têm dia.{" "}
            <Link href="/inbox" className="text-accent underline underline-offset-4">
              Dar uma data
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}

function formatarChave(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}
