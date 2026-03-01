import { NextResponse } from "next/server";
import crypto from "crypto";

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Проверка initData Telegram Mini Apps
 * Алгоритм: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function verifyTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);

  const hash = params.get("hash");
  if (!hash) return { ok: false, error: "No hash in initData" };

  params.delete("hash");

  // data_check_string: сортируем по ключу и делаем "key=value" построчно
  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  // secret_key = HMAC_SHA256("WebAppData", bot_token)
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  // computed_hash = HMAC_SHA256(data_check_string, secret_key) hex
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const ok = timingSafeEqual(computedHash, hash);
  return ok ? { ok: true } : { ok: false, error: "Invalid hash" };
}

export async function POST(req: Request) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { ok: false, error: "Server misconfigured: TELEGRAM_BOT_TOKEN is missing" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as { initData?: string };
    const initData = String(body.initData || "");
    if (!initData) {
      return NextResponse.json({ ok: false, error: "initData is required" }, { status: 400 });
    }

    const result = verifyTelegramInitData(initData, botToken);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 401 });
    }

    // Если подпись валидна — можем безопасно читать user из initDataUnsafe на клиенте,
    // но сервер тоже может распарсить "user" из params:
    const params = new URLSearchParams(initData);
    const userRaw = params.get("user"); // JSON строка
    const user = userRaw ? JSON.parse(userRaw) : null;

    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}