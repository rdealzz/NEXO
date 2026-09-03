import { chromium } from 'playwright';

/*
 * O caminho da pessoa, do jeito que ela faz, num navegador de verdade.
 *
 * A única coisa dublada é a leitura do modelo (/api/capture): ela precisa de
 * chave da Anthropic, que este ambiente não tem. A resposta dublada é a mesma
 * forma que a rota devolve — capture_id, analysis, follow_ups — então tudo o
 * que vem depois (revisão, confirmação, calendário, aviso) é o código real.
 */

const AMANHA = new Date(Date.now() + 6 * 86_400_000).toISOString().slice(0, 10);

const RESPOSTA_DA_IA = {
  capture_id: 'cap_teste',
  analysis: {
    summary: 'Conta de luz da Enel, R$ 187,42',
    category: 'financeiro',
    entity: { name: 'Enel', kind: 'empresa' },
    amount_brl: 187.42,
    clarification: null,
    purchase: null,
    proactive_followups: [],
    reminders: [
      {
        title: 'Pagar conta de luz — Enel',
        due_date: AMANHA,
        due_time: null,
        lead_minutes: [5760, 1440, 0],
        repeat_rule: null,
        category: 'financeiro',
        why: 'Vencimento lido no boleto',
        confidence: 0.94,
        source_quote: 'Vencimento: 10/09',
      },
    ],
  },
  follow_ups: [],
};

const falhas = [];
const ok = [];
function conferir(condicao, oque) {
  (condicao ? ok : falhas).push(oque);
  console.log(`${condicao ? '  ok ' : 'FALHA'}  ${oque}`);
}

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function abrir({ tema = 'claro', mobile = true } = {}) {
  const ctx = await b.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    isMobile: mobile,
    hasTouch: mobile,
    deviceScaleFactor: 2,
  });
  // Só semeia o que ainda não existe: reescrever a cada carregamento apagaria a
  // escolha que o próprio teste quer verificar depois do reload.
  await ctx.addInitScript(
    ([t]) => {
      if (!localStorage.getItem('nexo:tema')) localStorage.setItem('nexo:tema', t);
      localStorage.setItem('nexo:cookies', 'essenciais');
      localStorage.setItem('nexo:avisos-vistos', new Date().toLocaleDateString('en-CA'));
    },
    [tema],
  );
  const p = await ctx.newPage();
  p.on('pageerror', (e) => falhas.push(`erro de JS na página: ${e.message}`));
  return { ctx, p };
}

// ---------------------------------------------------------------- 1. captura
console.log('\n1. Jogar uma conta aqui e confirmar');
{
  const { ctx, p } = await abrir();
  await p.route('**/api/capture', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(RESPOSTA_DA_IA) }),
  );
  await p.goto('http://localhost:3000/inbox', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3400);

  await p.fill('#nexo-drop', 'boleto da luz');
  await p.getByRole('button', { name: 'Mandar' }).click();

  await p.waitForSelector('text=Encontrei algo importante', { timeout: 8000 });
  conferir(true, 'a tela de revisão abre com o que a IA entendeu');
  const camposDaRevisao = await p
    .locator('section input')
    .evaluateAll((els) => els.map((e) => e.value));
  conferir(
    camposDaRevisao.includes('Pagar conta de luz — Enel'),
    'o lembrete lido aparece para conferência, editável',
  );

  const salvou = p.waitForResponse((r) => r.url().includes('/api/reminders') && r.request().method() === 'POST');
  await p.getByRole('button', { name: /Confirmar/ }).click();
  const resposta = await salvou;
  conferir(resposta.status() === 201, `o lembrete é salvo no servidor (HTTP ${resposta.status()})`);
  await p.waitForTimeout(600);

  const naTela = await p.locator('main').innerText();
  conferir(naTela.includes('Pagar conta de luz — Enel'), 'confirmado, o lembrete entra na lista');

  // A aba certa foi aberta sozinha (vence para a frente => "Próximos").
  const abaProximos = await p.getByRole('button', { name: /Próximos/ }).first().getAttribute('aria-pressed');
  conferir(abaProximos === 'true', 'o app abre a aba onde a coisa caiu');

  // ------------------------------------------------------------ 2. calendário
  console.log('\n2. O mesmo lembrete no calendário');
  await p.goto('http://localhost:3000/calendario', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const diasMarcados = await p.locator('.dia-com-lembrete').count();
  conferir(diasMarcados > 0, 'o dia do vencimento fica marcado no mês');

  // ------------------------------------------------------------ 3. concluir
  console.log('\n3. Concluir e a recompensa');
  await p.goto('http://localhost:3000/inbox', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  await p.getByRole('button', { name: /Próximos/ }).click();
  await p.waitForTimeout(300);
  const concluir = p.getByRole('button', { name: /Concluir Pagar conta de luz/ });
  conferir((await concluir.count()) > 0, 'o marcador de concluir existe e está rotulado');
  await concluir.click();
  await p.waitForTimeout(120);
  const desenhou = await p.locator('.risca').count();
  conferir(desenhou > 0, 'o check é desenhado antes do cartão sair');
  await p.waitForTimeout(1400);
  const sobrou = await p.locator('main').innerText();
  conferir(!sobrou.includes('Pagar conta de luz — Enel'), 'o cartão dissolve e sai da lista');

  await ctx.close();
}

// ---------------------------------------------------------------- 4. tema
console.log('\n4. O tema só muda quando eu mando');
{
  const { ctx, p } = await abrir({ tema: 'claro' });
  await p.goto('http://localhost:3000/inbox', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3400);

  const fundoClaro = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  conferir(fundoClaro === 'rgb(255, 255, 255)', `claro é branco 100% (${fundoClaro})`);

  await p.getByRole('button', { name: /Ativar modo escuro/ }).click();
  await p.waitForTimeout(400);
  const fundoEscuro = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  conferir(fundoEscuro === 'rgb(0, 0, 0)', `escuro é preto 100% (${fundoEscuro})`);

  // A escolha sobrevive ao recarregamento.
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(3400);
  const guardado = await p.evaluate(() => document.documentElement.dataset.tema);
  conferir(guardado === 'escuro', 'a escolha do tema fica guardada');

  // E o herói não é mais um bloco de outra cor.
  await p.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3400);
  const heroi = await p.evaluate(() => {
    const c = document.querySelector('canvas');
    const ctx2 = c.getContext('2d');
    const px = ctx2.getImageData(4, 4, 1, 1).data;
    return px[3]; // alfa: 0 = a página aparece atrás
  });
  conferir(heroi === 0, 'a malha não pinta fundo próprio — sem bloco invertido');

  await ctx.close();
}

// ---------------------------------------------------------------- 5. avatar
console.log('\n5. Trocar o bicho no canto');
{
  const { ctx, p } = await abrir();
  await p.goto('http://localhost:3000/inbox', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3400);

  await p.getByRole('button', { name: 'Trocar meu bicho' }).click();
  await p.waitForTimeout(300);
  conferir((await p.locator('text=Escolha seu bicho').count()) > 0, 'o menu de bichos abre no toque');

  await p.getByRole('button', { name: 'Pinguim' }).click();
  await p.waitForTimeout(400);
  const escolhido = await p.evaluate(() => localStorage.getItem('nexo:avatar'));
  conferir(escolhido === 'pinguim', 'sem conta, a escolha fica guardada no aparelho');

  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(3400);
  const retrato = await p.locator('button[aria-label="Trocar meu bicho"] svg').getAttribute('aria-label');
  conferir(retrato === 'Pinguim', 'o bicho escolhido volta depois de recarregar');

  await ctx.close();
}

// ---------------------------------------------------------------- 6. planos
console.log('\n6. Os três planos e o desconto');
{
  const { ctx, p } = await abrir();
  await p.goto('http://localhost:3000/onboarding', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3400);
  for (const rotulo of ['Continuar', 'Continuar', 'Ver o plano']) {
    await p.getByRole('button', { name: rotulo }).first().click();
    await p.waitForTimeout(400);
  }
  // toLocaleString separa "R$" do número com espaço inquebrável: normaliza antes.
  const texto = (await p.locator('body').innerText()).replace(/\u00a0/g, ' ');
  conferir(texto.includes('R$ 19,90'), 'mensal a R$ 19,90');
  conferir(texto.includes('R$ 13,30'), 'trimestral mostra o preço por mês (R$ 13,30)');
  conferir(texto.includes('R$ 12,49'), 'anual mostra o preço por mês (R$ 12,49)');
  conferir(texto.includes('R$ 88,90'), 'a economia do anual aparece em reais');
  conferir(texto.includes('37%'), 'o desconto do anual aparece em porcentagem');
  conferir(texto.includes('Melhor preço') || texto.includes('MELHOR PREÇO'), 'o anual é destacado');

  // Trocar de plano muda o botão de assinar.
  await p.getByRole('button', { name: /3 meses/ }).click();
  await p.waitForTimeout(300);
  const botao = (await p.getByRole('button', { name: /Assinar/ }).innerText()).replace(/\u00a0/g, ' ');
  conferir(botao.includes('R$ 39,90'), `escolher o trimestral muda o botão (${botao.trim()})`);

  await ctx.close();
}

// ---------------------------------------------------------------- 7. login
console.log('\n7. Entrar diz a verdade sobre o ambiente');
{
  const { ctx, p } = await abrir();
  await p.goto('http://localhost:3000/entrar', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3400);
  const texto = await p.locator('body').innerText();
  conferir(texto.includes('não está ligado neste ambiente'), 'o aviso de login desligado aparece antes dos campos');
  const desligado = await p.getByRole('button', { name: 'Me manda o link' }).isDisabled();
  conferir(desligado, 'o botão do link fica desligado em vez de fingir que funciona');
  await ctx.close();
}

// ---------------------------------------------------------------- 8. teste
console.log('\n8. Teste grátis e trava');
{
  const { ctx, p } = await abrir();
  await p.goto('http://localhost:3000/inbox', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3400);
  const texto = await p.locator('body').innerText();
  conferir(texto.includes('Teste grátis'), 'quem chega vê os dias de teste restantes');
  await ctx.close();
}

console.log('\n──────────────────────────────');
console.log(`${ok.length} passaram, ${falhas.length} falharam`);
if (falhas.length) {
  console.log('\nFalhas:');
  for (const f of falhas) console.log(` - ${f}`);
}
await b.close();
process.exit(falhas.length ? 1 : 0);
