/**
 * Service worker do NEXO.
 *
 * Existe por um motivo só: receber o aviso quando o app está fechado. Ele não
 * faz cache de páginas — o produto não ganha nada com isso e cache mal feito
 * mostra lembrete velho, que é pior do que não mostrar nada.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (evento) => evento.waitUntil(self.clients.claim()));

self.addEventListener("push", (evento) => {
  let dados = {};
  try {
    dados = evento.data ? evento.data.json() : {};
  } catch {
    dados = { corpo: evento.data ? evento.data.text() : "" };
  }

  const corpo = dados.corpo || "Você tem algo para hoje.";
  evento.waitUntil(
    self.registration.showNotification(dados.titulo || "NEXO", {
      body: corpo,
      icon: "/icone-notificacao.png",
      badge: "/badge-notificacao.png",
      lang: "pt-BR",
      // A mesma tag substitui o aviso anterior do mesmo lembrete em vez de
      // empilhar dois na tela de bloqueio.
      tag: dados.reminder_id || "nexo",
      renotify: true,
      data: { url: dados.url || "/inbox", reminder_id: dados.reminder_id || null },
      actions: [
        { action: "concluir", title: "Feito" },
        { action: "adiar", title: "Depois" },
      ],
    }),
  );
});

self.addEventListener("notificationclick", (evento) => {
  const { url, reminder_id } = evento.notification.data || {};
  evento.notification.close();

  // Resolver na própria notificação é o que faz o aviso valer: um toque em
  // "Feito" ou "Depois" não deveria exigir abrir o app.
  if (reminder_id && (evento.action === "concluir" || evento.action === "adiar")) {
    const mudanca = evento.action === "concluir" ? { status: "concluido" } : { snooze_minutes: 60 };
    evento.waitUntil(
      fetch(`/api/reminders/${reminder_id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(mudanca),
      }).catch(() => {}),
    );
    return;
  }

  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      // Se o NEXO já está aberto numa aba, traz ela para frente em vez de
      // abrir uma segunda.
      for (const janela of janelas) {
        if (janela.url.includes("/inbox") && "focus" in janela) return janela.focus();
      }
      return self.clients.openWindow(url || "/inbox");
    }),
  );
});
