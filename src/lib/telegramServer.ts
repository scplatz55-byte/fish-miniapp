import crypto from "crypto";

type TelegramUser = {
  id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
};

export function parseTelegramInitData(initData: string): Record<string, string> {
  const params = new URLSearchParams(initData);
  const data: Record<string, string> = {};

  for (const [key, value] of params.entries()) {
    data[key] = value;
  }

  return data;
}

export function verifyTelegramInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) return false;

  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return computedHash === hash;
}

export function getTelegramUserFromInitData(initData: string): TelegramUser | null {
  const parsed = parseTelegramInitData(initData);
  const userRaw = parsed.user;

  if (!userRaw) return null;

  try {
    return JSON.parse(userRaw) as TelegramUser;
  } catch {
    return null;
  }
}

export function isTelegramAdmin(userId?: number | null): boolean {
  if (!userId) return false;

  const raw = process.env.TELEGRAM_ADMIN_IDS || "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s));

  return ids.includes(userId);
}

export async function sendTelegramMessage(chatId: number, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN!;
  if (!botToken) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN");
  }

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(data?.description || "Telegram sendMessage failed");
  }

  return data.result as {
    message_id: number;
  };
}