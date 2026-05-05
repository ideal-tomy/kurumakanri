/**
 * LINE Messaging API クライアント
 * スタッフ宛の通知を送るためのプッシュメッセージ送信
 */

const LINE_API_URL = 'https://api.line.me/v2/bot/message/push';

type FlexMessage = {
  type: 'flex';
  altText: string;
  contents: object;
};

type TextMessage = {
  type: 'text';
  text: string;
};

type LineMessage = TextMessage | FlexMessage;

/**
 * LINE Messaging API でプッシュメッセージを送信
 * @param to 送信先のLINE user_id（スタッフのID）
 * @param messages メッセージ配列（最大5件）
 */
export async function sendLinePush(
  to: string,
  messages: LineMessage[]
): Promise<{ success: boolean; error?: string }> {
  const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!channelToken) {
    return { success: false, error: 'LINE_CHANNEL_ACCESS_TOKEN is not set' };
  }

  try {
    const response = await fetch(LINE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${channelToken}`,
      },
      body: JSON.stringify({ to, messages }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `LINE API error: ${response.status} ${errorText}` };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * 連絡対象リストをFlex Messageに整形
 */
export type NotificationTarget = {
  customer_name: string;
  plate_number: string;
  maker: string | null;
  model: string | null;
  inspection_expiry_date: string | null;
  notification_type: string;
  days_until_inspection: number | null;
  oil_change_km_remaining: number | null;
};

export function buildDailyNotificationFlexMessage(
  targets: NotificationTarget[],
  baseUrl: string
): LineMessage {
  if (targets.length === 0) {
    return {
      type: 'text',
      text: '【本日の連絡対象】\n本日は連絡が必要な顧客はいません。',
    };
  }

  // 通知種別ごとにグルーピング
  const grouped: Record<string, NotificationTarget[]> = {};
  for (const t of targets) {
    const key = t.notification_type;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  }

  const typeLabels: Record<string, string> = {
    inspection_6m: '🚗 車検 6ヶ月前',
    inspection_3m: '🚗 車検 3ヶ月前',
    inspection_1m: '⚠️ 車検 1ヶ月前',
    oil_change: '🛢 オイル交換目安',
  };

  const sections: object[] = [];
  for (const [type, items] of Object.entries(grouped)) {
    sections.push({
      type: 'text',
      text: typeLabels[type] || type,
      weight: 'bold',
      size: 'md',
      color: '#1DB446',
      margin: 'md',
    });
    for (const item of items) {
      const detail =
        type === 'oil_change'
          ? `予測残り ${item.oil_change_km_remaining ?? '-'} km`
          : `満了日: ${item.inspection_expiry_date ?? '-'}`;
      sections.push({
        type: 'box',
        layout: 'vertical',
        margin: 'sm',
        contents: [
          {
            type: 'text',
            text: `${item.customer_name} 様`,
            size: 'sm',
            weight: 'bold',
          },
          {
            type: 'text',
            text: `${item.plate_number}  ${item.maker ?? ''} ${item.model ?? ''}`.trim(),
            size: 'xs',
            color: '#888888',
          },
          {
            type: 'text',
            text: detail,
            size: 'xs',
            color: '#555555',
          },
        ],
      });
    }
  }

  return {
    type: 'flex',
    altText: `本日の連絡対象 ${targets.length}件`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `本日の連絡対象 ${targets.length}件`,
            weight: 'bold',
            size: 'lg',
          },
          {
            type: 'text',
            text: new Date().toLocaleDateString('ja-JP'),
            size: 'xs',
            color: '#888888',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: sections,
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#1DB446',
            action: {
              type: 'uri',
              label: '詳細を確認',
              uri: `${baseUrl}/dashboard`,
            },
          },
        ],
      },
    },
  };
}
