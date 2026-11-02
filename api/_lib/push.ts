import webPush from 'web-push';

let vapidConfigured = false;

export function configureWebPush(): void {
  if (vapidConfigured) {
    return;
  }

  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    throw new Error('Missing VAPID configuration in environment variables.');
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  tag: string;
}

export interface PushTarget {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

export type SendResult =
  | { status: 'sent'; endpoint: string }
  | { status: 'gone'; endpoint: string }
  | { status: 'failed'; endpoint: string; error: string };

export async function sendWebPush(
  target: PushTarget,
  payload: PushPayload,
  ttl: number = 3600
): Promise<SendResult> {
  configureWebPush();

  const pushSubscription = {
    endpoint: target.endpoint,
    keys: {
      p256dh: target.p256dh_key,
      auth: target.auth_key,
    },
  };

  try {
    await webPush.sendNotification(pushSubscription, JSON.stringify(payload), {
      TTL: ttl,
    });
    return { status: 'sent', endpoint: target.endpoint };
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      return { status: 'gone', endpoint: target.endpoint };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'failed', endpoint: target.endpoint, error: message };
  }
}
