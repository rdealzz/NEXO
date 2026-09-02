import type { Subscription } from "@/lib/db";

const BANDEIRAS: Record<string, string> = {
  VISA: "Visa",
  MASTERCARD: "Mastercard",
  ELO: "Elo",
  AMEX: "American Express",
  HIPERCARD: "Hipercard",
  DINERS: "Diners",
};

/**
 * O cartão cadastrado.
 *
 * O NEXO nunca vê o número: ele é digitado na página do gateway, que devolve só
 * bandeira e os quatro últimos dígitos. É isso que dá para mostrar — e é o
 * suficiente para a pessoa reconhecer qual cartão está pagando.
 */
export function Cartao({ assinatura }: { assinatura: Subscription | null }) {
  if (!assinatura?.card_last4) {
    return (
      <p className="mt-1 text-sm text-muted">
        Nenhum cartão salvo. O NEXO também aceita Pix e boleto — a forma de pagamento é escolhida na hora do
        pagamento, na página segura do provedor.
      </p>
    );
  }

  const bandeira = BANDEIRAS[assinatura.card_brand?.toUpperCase() ?? ""] ?? assinatura.card_brand ?? "Cartão";

  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-line px-4 py-3">
      <span aria-hidden className="text-2xl leading-none">
        💳
      </span>
      <div>
        <p className="text-sm font-medium">
          {bandeira} •••• {assinatura.card_last4}
        </p>
        <p className="text-xs text-muted">
          Guardado pelo provedor de pagamento. O NEXO nunca vê o número completo.
        </p>
      </div>
    </div>
  );
}
