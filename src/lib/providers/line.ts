/**
 * LINE Messaging API（Push）クライアント。
 * 環境変数 LINE_CHANNEL_ACCESS_TOKEN が未設定の場合はモック送信（開発用）。
 */

export interface LineSendResult {
  success: boolean;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export async function sendLineMessage(
  toUserId: string,
  text: string,
): Promise<LineSendResult> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        errorCode: 'MISSING_LINE_ACCESS_TOKEN',
        errorMessage: 'LINE_CHANNEL_ACCESS_TOKEN が未設定のため本番送信できません',
      };
    }
    return {
      success: true,
      providerMessageId: `mock-line-${Date.now()}`,
    };
  }
  if (!toUserId) {
    return {
      success: false,
      errorCode: 'NO_LINE_USER_ID',
      errorMessage: '友だち追加が完了しておらず LINE userId が未取得です',
    };
  }
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: toUserId,
        messages: [{ type: 'text', text }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      let detail = body.slice(0, 500);
      try {
        const parsed = JSON.parse(body) as { message?: string; details?: unknown[] };
        if (parsed.message) {
          detail = parsed.message;
        }
      } catch {
        // noop: JSONでない場合は生テキストを使う
      }
      return {
        success: false,
        errorCode: `HTTP_${res.status}`,
        errorMessage: detail,
      };
    }
    const requestId = res.headers.get('x-line-request-id') ?? undefined;
    return { success: true, providerMessageId: requestId };
  } catch (e) {
    return {
      success: false,
      errorCode: 'NETWORK',
      errorMessage: (e as Error).message,
    };
  }
}
