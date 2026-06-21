/// <reference lib="webworker" />
const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener("push", (event) => {
  const data = event.data?.json() as { title: string; body: string; url?: string } | undefined;
  if (!data) return;

  event.waitUntil(
    sw.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.png",
      badge: "/icon.png",
      data: { url: data.url ?? "/dashboard" },
      tag: "social-forex-notification",
    }),
  );
});

sw.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url ?? "/dashboard";

  event.waitUntil(
    sw.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(sw.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      sw.clients.openWindow(url);
    }),
  );
});
