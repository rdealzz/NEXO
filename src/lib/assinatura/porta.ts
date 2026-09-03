import { avaliar, type Acesso } from "@/lib/assinatura/acesso";
import { asaasConfigurado } from "@/lib/assinatura/asaas";
import { store } from "@/lib/db";
import type { Owner } from "@/lib/owner";

/**
 * A porta do app.
 *
 * Uma pergunta só, feita no topo de cada tela que guarda material da pessoa:
 * este acesso ainda vale? Vale enquanto o período pago não venceu ou enquanto o
 * teste de estreia não acabou.
 *
 * Quem tem conta conta o teste a partir da criação dela; quem ainda não tem
 * conta, a partir da primeira visita ao aparelho (o carimbo do middleware).
 */
export async function acessoDoDono(owner: Owner): Promise<Acesso> {
  if (!owner.authenticated) return avaliar(null, { inicioDaConta: owner.desde, email: owner.email });

  const [assinatura, perfil] = await Promise.all([
    store().getSubscription(owner.id),
    store().getProfile(owner.id),
  ]);
  return avaliar(assinatura, { inicioDaConta: perfil?.created_at ?? owner.desde, email: owner.email });
}

/**
 * Se a tela deve travar.
 *
 * Sem gateway configurado o app não trava ninguém: seria uma porta trancada sem
 * fechadura do outro lado — a pessoa veria "assine" e não teria como assinar.
 */
export function deveTravar(acesso: Acesso): boolean {
  return !acesso.liberado && asaasConfigurado();
}
