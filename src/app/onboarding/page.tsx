import type { Metadata } from "next";

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = {
  title: "NEXO — o app que se paga sozinho",
  description:
    "Veja quanto esquecer um boleto, uma garantia ou uma consulta custou a você no último ano — e por que R$ 19,90 por mês sai mais barato.",
};

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 sm:py-12">
      <OnboardingFlow />
    </main>
  );
}
