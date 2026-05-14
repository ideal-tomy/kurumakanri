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

/** LINE Messaging API multicast 用メッセージ（最大 5 件まで公式制限あり） */
export type LineMulticastMessage =
  | { type: 'text'; text: string }
  | { type: 'image'; originalContentUrl: string; previewImageUrl: string };

const MULTICAST_MAX_TO = 500;

/**
 * 同一文面を最大 500 人まで一括送信（`/v2/bot/message/multicast`）。
 * `toUserIds` は 1〜500 件に分割してから呼び出すこと。
 */
export async function sendLineMulticast(
  toUserIds: string[],
  messages: LineMulticastMessage[],
): Promise<LineSendResult> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (toUserIds.length === 0) {
    return { success: false, errorCode: 'EMPTY_TO', errorMessage: '送信先が空です' };
  }
  if (toUserIds.length > MULTICAST_MAX_TO) {
    return {
      success: false,
      errorCode: 'TOO_MANY_RECIPIENTS',
      errorMessage: `multicast は ${MULTICAST_MAX_TO} 件までです（${toUserIds.length} 件）`,
    };
  }
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
      providerMessageId: `mock-multicast-${Date.now()}`,
    };
  }
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/multicast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: toUserIds,
        messages,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      let detail = body.slice(0, 500);
      try {
        const parsed = JSON.parse(body) as { message?: string };
        if (parsed.message) detail = parsed.message;
      } catch {
        // noop
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
