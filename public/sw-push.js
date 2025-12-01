// Service Worker for Push Notifications

self.addEventListener("push", (event) => {
  console.log("[SW] Push received:", event);
  
  let data = { title: "Appel entrant", body: "Vous avez un appel" };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    vibrate: [500, 200, 500, 200, 500],
    tag: "incoming-call",
    requireInteraction: true,
    actions: [
      { action: "answer", title: "Répondre" },
      { action: "decline", title: "Refuser" },
    ],
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action);
  event.notification.close();

  const data = event.notification.data;
  
  if (event.action === "answer" && data?.callId) {
    event.waitUntil(
      clients.openWindow(`/call/${data.callId}?resident=true`)
    );
  } else if (event.action === "decline") {
    // Just close notification
  } else {
    // Default: open app
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow("/");
        }
      })
    );
  }
});
