import Link from "next/link";

import { Planos } from "@/components/assinatura/planos";
import { BotaoLink } from "@/components/ui/button";
import type { Acesso } from "@/lib/assinatura/acesso";
import { TESTE_DIAS } from "@/lib/pricing";

/**
 * A trava.
 *
 * Aparece quando o acesso venceu — fim do teste, ou fim do período pago. Diz o
 * que aconteceu numa linha e põe os planos logo abaixo, porque a única coisa
 * que resolve a tela é escolher um.
 *
 * Nada é apagado enquanto a trava está de pé: o material continua guardado, os
 * lembretes continuam salvos, e voltam a aparecer no primeiro pagamento
 * confirmado. Travar é diferente de perder, e a tela precisa dizer isso — é o
 * que separa uma cobrança de um sequestro.
 */
export function Trava({ acesso, autenticado }: { acesso: Acesso; autenticado: boolean }) {
  const acabouOTeste = acesso.emTeste;

  return (
    <section className="cartao cartao--alto p-5 sm:p-7">
      <p className="inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
        {acabouOTeste ? `Seus ${TESTE_DIAS} dias de teste acabaram` : "Seu acesso venceu"}
      </p>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        {acabouOTeste ? "Gostou? Agora escolha o plano." : "Renove para voltar a ser lembrado."}
      </h1>

      <p className="mt-2 text-sm leading-relaxed text-muted">
        Nada foi apagado: seus lembretes, documentos e avisos continuam guardados e voltam assim que o pagamento for
        confirmado. Enquanto isso o NEXO para de avisar — e é justamente o aviso que você não quer perder.
      </p>

      {autenticado ? (
        <div className="mt-6">
          <Planos autenticado />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <p className="text-sm">
            Para assinar, primeiro entre na sua conta — a assinatura pertence a uma pessoa, não a um aparelho.
          </p>
          <BotaoLink href="/entrar" variant="primary" size="lg" block>
            Entrar e escolher um plano
          </BotaoLink>
        </div>
      )}

      <p className="mt-5 text-center text-xs text-muted">
        Dúvida sobre cobrança?{" "}
        <Link href="/perfil#plano" className="text-accent underline underline-offset-4">
          Ver minha conta
        </Link>
      </p>
    </section>
  );
}
