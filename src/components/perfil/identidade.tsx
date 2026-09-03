"use client";

import { useState } from "react";

import { AvatarNexo } from "@/components/perfil/avatar";
import { Botao } from "@/components/ui/button";
import { AVATARES, type FamiliaAvatar } from "@/lib/avatares";

const FAMILIAS: { id: FamiliaAvatar; nome: string; explica: string }[] = [
  { id: "quentes", nome: "Quentes", explica: "Bichos de sol, cor quente." },
  { id: "frios", nome: "Frios", explica: "Bichos de gelo, cor fria." },
];

/**
 * Nome e retrato.
 *
 * O avatar salva no toque — escolher figurinha não é formulário. O nome espera
 * o "Salvar" porque é texto, e salvar a cada tecla mandaria uma requisição por
 * letra.
 */
export function Identidade({
  nomeInicial,
  avatarInicial,
  email,
}: {
  nomeInicial: string;
  avatarInicial: string | null;
  email: string | null;
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [salvo, setSalvo] = useState(nomeInicial);
  const [avatar, setAvatar] = useState(avatarInicial);
  const [familia, setFamilia] = useState<FamiliaAvatar>(
    AVATARES.find((a) => a.id === avatarInicial)?.familia ?? "quentes",
  );
  const [estado, setEstado] = useState<"parado" | "salvando" | "erro">("parado");

  async function guardar(mudanca: Record<string, string | null>) {
    setEstado("salvando");
    try {
      const resposta = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mudanca),
      });
      if (!resposta.ok) throw new Error();
      setEstado("parado");
      return true;
    } catch {
      setEstado("erro");
      return false;
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <AvatarNexo id={avatar} semente={email ?? "nexo"} className="size-16" />
        <div className="min-w-0 flex-1">
          <label htmlFor="nome" className="text-sm font-medium">
            Como quer ser chamado
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="nome"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              placeholder="Seu nome"
              maxLength={40}
              className="min-w-0 flex-1 campo campo--sm"
            />
            <Botao
              size="sm"
              variant="primary"
              disabled={nome.trim() === salvo.trim() || estado === "salvando"}
              onClick={async () => {
                if (await guardar({ display_name: nome })) setSalvo(nome);
              }}
            >
              Salvar
            </Botao>
          </div>
          {email && <p className="mt-1.5 text-xs text-muted">{email}</p>}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium">Escolha seu bicho</p>
        <div className="mt-2 flex gap-2">
          {FAMILIAS.map((f) => (
            <Botao
              key={f.id}
              size="chip"
              variant={familia === f.id ? "primary" : "surface"}
              aria-pressed={familia === f.id}
              title={f.explica}
              onClick={() => setFamilia(f.id)}
            >
              {f.nome}
            </Botao>
          ))}
        </div>

        <ul className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-4">
          {AVATARES.filter((a) => a.familia === familia).map((a) => {
            const escolhido = avatar === a.id;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    setAvatar(a.id);
                    guardar({ avatar_id: a.id });
                  }}
                  aria-pressed={escolhido}
                  className={`flex w-full flex-col items-center gap-1.5 rounded-2xl border p-2 transition-colors ${
                    escolhido ? "border-accent bg-accent-soft" : "border-transparent hover:bg-accent-soft/50"
                  }`}
                >
                  <AvatarNexo id={a.id} className="size-14" />
                  <span className="text-[11px] leading-tight text-muted">{a.nome}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {estado === "erro" && <p className="mt-3 text-sm text-danger">Não consegui salvar. Tente de novo.</p>}
    </div>
  );
}
