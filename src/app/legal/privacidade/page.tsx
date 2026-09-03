import type { Metadata } from "next";
import Link from "next/link";

import { ATUALIZADO_EM, EMAIL_CONTATO } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de Privacidade — NEXO",
  description:
    "O que o NEXO coleta, por que coleta, com quem compartilha e como você apaga tudo — incluindo o que o provedor de IA pode fazer com o material que você manda.",
};

export default function PrivacidadePage() {
  return (
    <>
      <h1>Política de Privacidade</h1>
      <p className="atualizado">Última atualização: {ATUALIZADO_EM}</p>

      <p>
        O NEXO existe para guardar o que você não quer esquecer. Isso significa que você nos entrega material
        pessoal — boletos, notas fiscais, prints de conversa, documentos. Esta página explica, sem rodeio, o que
        fazemos com esse material.
      </p>

      <div className="destaque">
        <p>
          <strong>O material que você manda passa pelo Google para ser lido.</strong> O NEXO usa o Gemini, do
          Google, para interpretar cada captura: a foto, o PDF ou o texto vai até lá, é lido, e volta como o
          lembrete que você vê na tela.
        </p>
        <p className="mt-3">
          Hoje o NEXO usa o <strong>nível gratuito</strong> dessa API, e nele o Google pode usar o conteúdo
          enviado para melhorar os produtos e modelos dele. Não temos como impedir isso sem migrar para o nível
          pago — e enquanto essa migração não acontecer, preferimos escrever aqui em vez de deixar você supor o
          contrário. <strong>Não mande pelo NEXO o que você não mandaria para o Google.</strong>
        </p>
        <p className="mt-3">
          O que continua valendo: nós não vendemos, não alugamos e não cedemos seus dados para publicidade, e não
          treinamos modelo nenhum com eles. Seus arquivos ficam em bucket privado, e apagar a conta apaga tudo.
        </p>
      </div>

      <h2>O que coletamos</h2>
      <ul>
        <li>
          <strong>Dados de conta:</strong> seu e-mail. Se você quiser usar o WhatsApp, também o telefone que você
          mesmo verificar por código.
        </li>
        <li>
          <strong>O que você manda:</strong> textos, fotos, prints, PDFs e e-mails encaminhados, além do que o
          NEXO extrai deles — título, valor, data de vencimento, fim de garantia, dados da compra.
        </li>
        <li>
          <strong>Dados de funcionamento:</strong> cookies de sessão para manter você logado, e registros
          técnicos de erro. Não usamos cookies de publicidade nem rastreadores de terceiros.
        </li>
      </ul>
      <p>
        Áudio gravado dentro do app é transcrito no próprio aparelho pelo navegador: o áudio não sobe para os
        nossos servidores. A exceção é o áudio recebido pelo WhatsApp, que precisa ser transcrito no servidor
        porque não há navegador nesse caminho.
      </p>

      <h2>Por que tratamos, e com qual base legal</h2>
      <ul>
        <li>
          <strong>Executar o serviço</strong> — ler o que você manda, criar os lembretes e avisar na hora certa.
          Base legal: execução de contrato (art. 7º, V).
        </li>
        <li>
          <strong>Telefone e WhatsApp</strong> — só se você vincular. Base legal: consentimento (art. 7º, I), que
          você pode retirar a qualquer momento nas Configurações.
        </li>
        <li>
          <strong>Segurança e prevenção a fraude</strong> — registros técnicos. Base legal: legítimo interesse
          (art. 7º, IX).
        </li>
        <li>
          <strong>Cobrança da assinatura</strong> — dados de pagamento tratados pelo gateway. Base legal:
          execução de contrato e obrigação legal e fiscal.
        </li>
      </ul>

      <h2>Com quem compartilhamos</h2>
      <p>
        Apenas com operadores que executam parte do serviço, e somente com o necessário para isso: o provedor do
        modelo de inteligência artificial (que lê o material e devolve a leitura), o provedor de banco de dados e
        armazenamento, o provedor de envio de mensagens e o gateway de pagamento. Todos ficam contratualmente
        proibidos de usar seus dados para outra finalidade.
      </p>
      <p>
        Esses provedores podem processar dados fora do Brasil. A transferência internacional acontece nos termos
        do art. 33 da LGPD, com cláusulas contratuais que mantêm o mesmo nível de proteção.
      </p>
      <p>
        Fora isso, só compartilhamos por ordem judicial ou requisição de autoridade competente — e, quando a lei
        permitir, avisamos você.
      </p>

      <h2>Onde seus documentos ficam</h2>
      <p>
        Fotos de boleto e nota fiscal ficam em armazenamento <strong>privado</strong>, nunca em endereço público.
        O acesso ao banco é protegido por políticas que liberam a leitura apenas para o dono autenticado, e todo
        tráfego é cifrado em trânsito.
      </p>

      <h2>Por quanto tempo guardamos</h2>
      <p>
        Enquanto sua conta existir — porque a garantia que vence em 2029 só serve se estiver guardada até lá. Ao
        excluir a conta, apagamos capturas, lembretes, avisos, compras, perfil e os arquivos originais. O que pode
        permanecer, por prazo legal, são registros fiscais da assinatura e registros de acesso exigidos pelo Marco
        Civil da Internet.
      </p>

      <h2>Seus direitos</h2>
      <p>
        A LGPD (art. 18) garante a você: confirmação de que tratamos seus dados, acesso, correção, anonimização,
        portabilidade, informação sobre compartilhamento, revogação de consentimento e eliminação.
      </p>
      <p>
        A eliminação você mesmo executa: <Link href="/configuracoes">Configurações → Excluir conta</Link>. É
        imediato e definitivo, e cobre tudo — capturas, lembretes, arquivos, compras e o login.
        {EMAIL_CONTATO ? (
          <>
            {" "}
            Para os demais direitos, escreva para <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a> —
            respondemos em até 15 dias.
          </>
        ) : (
          " Para os demais direitos, use o canal de contato indicado no app."
        )}
      </p>

      <h2>Menores de idade</h2>
      <p>
        O NEXO é feito para maiores de 18 anos e não é direcionado a crianças e adolescentes. Se identificarmos
        uma conta criada por menor sem o consentimento dos responsáveis, ela será encerrada e os dados apagados.
      </p>

      <h2>Cookies</h2>
      <p>
        Usamos cookies estritamente necessários: o que mantém sua sessão aberta e o que identifica o dispositivo
        antes de você criar conta. Sua preferência de tema e o aceite deste aviso ficam no armazenamento local do
        seu navegador, e não saem dele. Não há cookies de publicidade nem de medição de terceiros.
      </p>

      <h2>Mudanças nesta política</h2>
      <p>
        Se algo mudar de forma relevante, avisamos dentro do app antes de a mudança valer. A data no topo desta
        página indica a última revisão.
      </p>
    </>
  );
}
