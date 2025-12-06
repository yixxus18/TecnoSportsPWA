import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

// Helper to check if running on native platform
const isNativePlatform = () => Capacitor.isNativePlatform();

const VAPID_PUBLIC_KEY =
  "BPRmKpOvbaYBUSJEvemIrERUqnn3Mn_Bgo5o9Bjgq9YxK7CIRQr6i_lnXeDXEi9CX0cYsWC_cLPNuEYP1DbwabY";

// --- Permission Functions ---

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (isNativePlatform()) {
    const permissions = await LocalNotifications.requestPermissions();
    return permissions.display === "granted";
  } else {
    // Web Notification API
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return false; // Notifications not supported
  }
};

export const checkNotificationPermissions = async (): Promise<string> => {
  if (isNativePlatform()) {
    const permissions = await LocalNotifications.checkPermissions();
    return permissions.display;
  } else {
    if ("Notification" in window) {
      return Notification.permission;
    }
    return "denied"; // Notifications not supported
  }
};

// --- Scheduling Functions ---

export interface MatchInfo {
  id: number;
  matchDate: string;
  homeTeamName: string;
  awayTeamName: string;
}

export const scheduleMatchNotifications = async (
  match: MatchInfo
): Promise<boolean> => {
  const matchDate = new Date(match.matchDate);
  const now = new Date();

  if (isNativePlatform()) {
    const notificationsToSchedule = [];

    // 1 hour before
    const oneHourBefore = new Date(matchDate.getTime() - 60 * 60 * 1000);
    if (oneHourBefore > now) {
      notificationsToSchedule.push({
        id: match.id * 1000 + 1,
        title: "¡Partido a punto de empezar!",
        body: `${match.homeTeamName} vs ${match.awayTeamName} en una hora.`,
        schedule: { at: oneHourBefore },
      });
    }

    // At match time
    if (matchDate > now) {
      notificationsToSchedule.push({
        id: match.id * 1000 + 2,
        title: "¡El partido ha comenzado!",
        body: `El partido ${match.homeTeamName} vs ${match.awayTeamName} acaba de empezar.`,
        schedule: { at: matchDate },
      });
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule,
      });
      return true;
    }
    return false;
  } else {
    // Web Notification API with setTimeout
    let scheduled = false;

    const showNotification = (title: string, body: string) => {
      new Notification(title, { body });
    };

    // 1 hour before
    const oneHourBefore = matchDate.getTime() - now.getTime() - 60 * 60 * 1000;
    if (oneHourBefore > 0) {
      setTimeout(() => {
        showNotification(
          "¡Partido a punto de empezar!",
          `${match.homeTeamName} vs ${match.awayTeamName} en una hora.`
        );
      }, oneHourBefore);
      scheduled = true;
    }

    // At match time
    const timeToMatch = matchDate.getTime() - now.getTime();
    if (timeToMatch > 0) {
      setTimeout(() => {
        showNotification(
          "¡El partido ha comenzado!",
          `El partido ${match.homeTeamName} vs ${match.awayTeamName} acaba de empezar.`
        );
      }, timeToMatch);
      scheduled = true;
    }

    return scheduled;
  }
};

export const cancelMatchNotifications = async (matchId: number) => {
  if (isNativePlatform()) {
    await LocalNotifications.cancel({
      notifications: [{ id: matchId * 1000 + 1 }, { id: matchId * 1000 + 2 }],
    });
  } else {
    // On the web, there is no standard way to cancel scheduled `setTimeout` calls
    // from a different context without storing their IDs.
    // For this PWA use case, if the user deselects a favorite, the timeouts will
    // still exist but won't fire if the page is reloaded. This is a limitation
    // of client-side-only scheduling on the web.
    console.warn(
      "Canceling notifications on the web is not fully supported in this implementation."
    );
  }
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const sendSubscriptionToBackend = async (
  subscription: PushSubscription,
  userId: number
) => {
  const url = "https://tecnosportsadmin2-production.up.railway.app/notification-subscription/subscribe";

  // Convert the subscription to the format expected by the backend
  const subscriptionJson = subscription.toJSON();
  
  const payload = {
    endpoint: subscriptionJson.endpoint,
    keys: {
      p256dh: subscriptionJson.keys?.p256dh,
      auth: subscriptionJson.keys?.auth,
    },
    userId: userId,
  };

  console.log('Sending push subscription:', payload);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Push subscription error:', errorText);
    throw new Error("Fallo al enviar la suscripción VAPID al servidor.");
  }
  
  return response.json();
};


export const subscribeToWebPush = async (userId: number): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Web Push no soportado o Service Worker inactivo.');
        return false;
    }
    
    // Si ya tienes la verificación de permisos en tu archivo, puedes reutilizarla:
    let permission = await checkNotificationPermissions();
    if (permission === 'prompt') {
        const granted = await requestNotificationPermissions();
        permission = granted ? 'granted' : 'denied';
    }

    if (permission !== 'granted') {
        console.error('Permiso de notificación denegado para Web Push.');
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        
        // Intentar obtener la suscripción existente para no duplicar
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
             const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
            
             // Generar una nueva suscripción
             subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey,
             });
        }

        // 3. Enviar al backend (NestJS)
        await sendSubscriptionToBackend(subscription, userId);
        console.log('Suscripción VAPID enviada con éxito.');
        return true;

    } catch (error) {
        console.error('Fallo en la suscripción Web Push:', error);
        return false;
    }
};
