import { OTP_LENGTH } from "@varun/shared";

export function generateOtp(): string {
  return Array.from({ length: OTP_LENGTH }, () => Math.floor(Math.random() * 10)).join("");
}

export async function sendOtp(phone: string, code: string): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.log(`📱 OTP for ${phone}: ${code}`);
    return;
  }
  // Gupshup WhatsApp OTP
  await fetch("https://api.gupshup.io/sm/api/v1/msg", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      apikey: process.env.GUPSHUP_API_KEY!,
    },
    body: new URLSearchParams({
      channel: "whatsapp",
      source: "917834811114",
      destination: `91${phone}`,
      message: JSON.stringify({
        type: "text",
        text: `Your Varun Dairy OTP is *${code}*. Valid for 10 minutes.`,
      }),
      "src.name": process.env.GUPSHUP_APP_NAME!,
    }),
  });
}

export async function sendWhatsApp(phone: string, message: string): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.log(`📲 WhatsApp to ${phone}: ${message}`);
    return;
  }
  await fetch("https://api.gupshup.io/sm/api/v1/msg", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      apikey: process.env.GUPSHUP_API_KEY!,
    },
    body: new URLSearchParams({
      channel: "whatsapp",
      source: "917834811114",
      destination: `91${phone}`,
      message: JSON.stringify({ type: "text", text: message }),
      "src.name": process.env.GUPSHUP_APP_NAME!,
    }),
  });
}

export async function sendPushNotification(
  fcmToken: string,
  notification: { title: string; body: string },
  data?: Record<string, string>
): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.log(`🔔 Push to ${fcmToken.slice(0, 10)}…: ${notification.title}`);
    return;
  }

  const { initializeApp, cert, getApps } = await import("firebase-admin/app");
  const { getMessaging } = await import("firebase-admin/messaging");

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }

  await getMessaging().send({ token: fcmToken, notification, data });
}
