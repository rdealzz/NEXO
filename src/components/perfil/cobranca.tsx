"use client";

import { useState } from "react";

import { Botao } from "@/components/ui/button";
import type { Profile } from "@/lib/db";

type Campos = {
  billing_cep: string;
  billing_logradouro: string;
  billing_numero: string;
  billing_complemento: string;
  billing_bairro: string;
  billing_cidade: string;
  billing_uf: string;
};

/**
 * Endereço de cobrança.
 *
 * Existe porque boleto e Pix exigem endereço do pagador — não é curiosidade
 * nossa. O CEP busca o resto sozinho: digitar rua, bairro e cidade que a
 * pessoa já informou no CEP é trabalho que o app pode poupar.
 */
export function Cobranca({ perfil }: { perfil: Profile }) {
  const [campos, setCampos] = useState<Campos>({
    billing_cep: perfil.billing_cep ?? "",
    billing_logradouro: perfil.billing_logradouro ?? "",
    billing_numero: perfil.billing_numero ?? "",
    billing_complemento: perfil.billing_complemento ?? "",
    billing_bairro: perfil.billing_bairro ?? "",
    billing_cidade: perfil.billing_cidade ?? "",
    billing_uf: perfil.billing_uf ?? "",
  });
  const [estado, setEstado] = useState<"parado" | "buscando" | "salvando" | "salvo" | "erro">("parado");
  const [erro, setErro] = useState<string | null>(null);

  function mudar(campo: keyof Campos, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
    setEstado("parado");
  }

  async function buscarCep(cep: string) {
    const digitos = cep.replace(/\D+/g, "");
    if (digitos.length !== 8) return;
    setEstado("buscando");
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      const dados = await resposta.json();
      if (dados.erro) throw new Error("CEP não encontrado.");
      setCampos((atual) => ({
        ...atual,
        billing_logradouro: dados.logradouro || atual.billing_logradouro,
        billing_bairro: dados.bairro || atual.billing_bairro,
        billing_cidade: dados.localidade || atual.billing_cidade,
        billing_uf: dados.uf || atual.billing_uf,
      }));
      setEstado("parado");
    } catch {
      // Falhar a busca não pode travar o formulário: dá para digitar à mão.
      setEstado("parado");
    }
  }

  async function salvar() {
    setEstado("salvando");
    setErro(null);
    try {
      const resposta = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(campos),
      });
      if (!resposta.ok) throw new Error("Não consegui salvar o endereço.");
      setEstado("salvo");
    } catch (falha) {
      setEstado("erro");
      setErro(falha instanceof Error ? falha.message : "Não consegui salvar.");
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex gap-2">
        <Campo
          rotulo="CEP"
          valor={campos.billing_cep}
          onChange={(v) => mudar("billing_cep", v)}
          onBlur={() => buscarCep(campos.billing_cep)}
          inputMode="numeric"
          placeholder="00000-000"
          className="w-40"
        />
        {estado === "buscando" && <p className="self-end pb-2 text-xs text-muted">buscando…</p>}
      </div>

      <div className="flex gap-2">
        <Campo
          rotulo="Rua"
          valor={campos.billing_logradouro}
          onChange={(v) => mudar("billing_logradouro", v)}
          className="flex-1"
        />
        <Campo
          rotulo="Número"
          valor={campos.billing_numero}
          onChange={(v) => mudar("billing_numero", v)}
          className="w-24"
        />
      </div>

      <div className="flex gap-2">
        <Campo
          rotulo="Complemento"
          valor={campos.billing_complemento}
          onChange={(v) => mudar("billing_complemento", v)}
          className="flex-1"
        />
        <Campo
          rotulo="Bairro"
          valor={campos.billing_bairro}
          onChange={(v) => mudar("billing_bairro", v)}
          className="flex-1"
        />
      </div>

      <div className="flex gap-2">
        <Campo
          rotulo="Cidade"
          valor={campos.billing_cidade}
          onChange={(v) => mudar("billing_cidade", v)}
          className="flex-1"
        />
        <Campo
          rotulo="UF"
          valor={campos.billing_uf}
          onChange={(v) => mudar("billing_uf", v.toUpperCase().slice(0, 2))}
          className="w-20"
        />
      </div>

      <div className="flex items-center gap-3">
        <Botao size="sm" variant="primary" disabled={estado === "salvando"} onClick={salvar}>
          {estado === "salvando" ? "Salvando…" : "Salvar endereço"}
        </Botao>
        {estado === "salvo" && <span className="text-sm text-accent">Endereço salvo.</span>}
        {erro && <span className="text-sm text-danger">{erro}</span>}
      </div>
    </div>
  );
}

function Campo({
  rotulo,
  valor,
  onChange,
  onBlur,
  className = "",
  ...resto
}: {
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
  onBlur?: () => void;
  className?: string;
} & Omit<React.ComponentProps<"input">, "onChange" | "value" | "className">) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs text-muted">{rotulo}</span>
      <input
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        onBlur={onBlur}
        className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        {...resto}
      />
    </label>
  );
}
