import type { Metadata } from "next";
import Link from "next/link";

import { ATUALIZADO_EM, CONTROLADOR } from "@/lib/legal";
import { brl, PLANO } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Termos de Uso — NEXO",
  description: "As regras do serviço: o que o NEXO faz, o que não faz, como funciona a assinatura e o cancelamento.",
};

export default function TermosPage() {
  return (
    <>
      <h1>Termos de Uso</h1>
      <p className="atualizado">Última atualização: {ATUALIZADO_EM}</p>

      <p>
        Estes termos são o contrato entre você e {CONTROLADOR.nome} pelo uso do NEXO. Ao criar uma conta ou usar
        o serviço, você concorda com eles. Estão escritos para serem entendidos — se algo aqui parecer ambíguo,
        escreva para <a href={`mailto:${CONTROLADOR.contato}`}>{CONTROLADOR.contato}</a>.
      </p>

      <h2>1. O que o NEXO é</h2>
      <p>
        O NEXO recebe material que você manda — foto, texto, áudio, PDF, e-mail encaminhado — lê o que há nele e
        cria lembretes com aviso na hora certa. É um auxiliar de memória.
      </p>

      <div className="destaque">
        <p>
          <strong>O que o NEXO não é:</strong> ele não paga contas por você, não marca consultas, não aciona
          garantias e não substitui a sua responsabilidade por prazos. Um aviso pode não chegar — celular
          desligado, sem internet, notificação bloqueada, falha de um provedor. Para obrigações com consequência
          séria (tributos, multas, prazos judiciais), mantenha o seu próprio controle. Não nos responsabilizamos
          por perdas decorrentes de um aviso que não chegou ou chegou errado.
        </p>
      </div>

      <h2>2. Sua conta</h2>
      <p>
        Você precisa ter 18 anos ou mais. As informações que você fornece devem ser verdadeiras, e o acesso à sua
        conta é responsabilidade sua — inclusive o e-mail usado no login por link. Se suspeitar de acesso
        indevido, avise-nos imediatamente.
      </p>

      <h2>3. O conteúdo é seu</h2>
      <p>
        Tudo que você manda continua sendo seu. Você nos concede apenas a licença necessária para executar o
        serviço: armazenar o material, processá-lo para extrair datas e valores, e exibi-lo de volta para você.
        Nada além disso — não publicamos, não licenciamos para terceiros e não usamos o seu conteúdo para treinar
        modelos de inteligência artificial.
      </p>
      <p>
        Em troca, você se compromete a mandar apenas material que seja seu ou que você tenha o direito de enviar,
        e a não usar o NEXO para nada ilícito.
      </p>

      <h2>4. A inteligência artificial erra</h2>
      <p>
        A leitura automática de um boleto ou de uma nota fiscal é uma interpretação, não uma certeza. Datas,
        valores e prazos podem sair errados. Por isso o NEXO mostra o que entendeu antes de criar o lembrete, e
        avisa quando ele mesmo não tem certeza da data. Confira o que aparece na tela — a decisão final é sua.
      </p>

      <h2>5. Assinatura</h2>
      <ul>
        <li>
          O plano custa <strong>{brl(PLANO.precoMensal)} por mês</strong>, cobrado no cartão, renovado
          automaticamente até você cancelar.
        </li>
        <li>
          <strong>Cancelamento a qualquer momento</strong>, dentro do app, sem multa nem fidelidade. O acesso
          continua até o fim do período já pago; não há reembolso proporcional dos dias restantes.
        </li>
        <li>
          <strong>Arrependimento:</strong> se você assinar e desistir em até 7 dias, devolvemos o valor integral
          (art. 49 do Código de Defesa do Consumidor). Basta pedir pelo e-mail de contato.
        </li>
        <li>
          Mudanças de preço são avisadas com pelo menos 30 dias de antecedência e só valem no ciclo seguinte —
          você pode cancelar antes que passem a valer.
        </li>
        <li>Se um pagamento falhar, o acesso pode ser suspenso até a regularização. Seus dados continuam lá.</li>
      </ul>

      <h2>6. Disponibilidade</h2>
      <p>
        Fazemos o possível para manter o NEXO no ar, mas ele pode ficar indisponível por manutenção, falha de
        provedores ou motivos fora do nosso controle. O serviço é oferecido no estado em que se encontra, sem
        garantia de funcionamento ininterrupto.
      </p>

      <h2>7. Uso indevido</h2>
      <p>
        Podemos suspender ou encerrar contas que usem o serviço para atividade ilegal, que tentem burlar limites
        técnicos, sobrecarregar a infraestrutura ou acessar dados de terceiros. Quando possível, avisamos antes.
      </p>

      <h2>8. Encerramento</h2>
      <p>
        Você pode encerrar sua conta quando quiser, em{" "}
        <Link href="/configuracoes">Configurações → Excluir conta</Link>. A exclusão é definitiva: apagamos
        capturas, lembretes, avisos, compras, perfil e arquivos. Não há como recuperar depois.
      </p>

      <h2>9. Limitação de responsabilidade</h2>
      <p>
        Respeitados os direitos garantidos pelo Código de Defesa do Consumidor, nossa responsabilidade por
        eventuais danos relacionados ao serviço fica limitada ao valor pago por você nos 12 meses anteriores ao
        fato.
      </p>

      <h2>10. Mudanças nestes termos</h2>
      <p>
        Se mudarmos algo relevante, avisamos dentro do app antes de a mudança valer. Continuar usando o NEXO
        depois disso significa concordar com a nova versão.
      </p>

      <h2>11. Lei e foro</h2>
      <p>
        Aplica-se a lei brasileira. Fica eleito o foro do domicílio do consumidor para resolver qualquer
        controvérsia.
      </p>

      <p>
        Sobre dados pessoais, leia também a{" "}
        <Link href="/legal/privacidade">Política de Privacidade</Link>.
      </p>
    </>
  );
}
