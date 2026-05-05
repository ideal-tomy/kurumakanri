/**
 * 毎朝6時に呼ばれるエンドポイント
 *
 * Vercel Cron / Supabase pg_cron / 外部cronサービスから叩く想定。
 * 認証は CRON_SECRET ヘッダで保護。
 *
 * 動作:
 * 1. daily_notification_targets ビューから本日の連絡対象を取得
 * 2. notifications テーブルに記録（重複防止のためupsert）
 * 3. LINE スタッフグループ（または個別スタッフ）にプッシュ送信
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import {
  sendLinePush,
  buildDailyNotificationFlexMessage,
  type NotificationTarget,
} from '@/lib/line';

export async function GET(req: NextRequest) {
  // 認証チェック
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // 1. 連絡対象を取得
  const { data: targets, error: queryError } = await supabase
    .from('daily_notification_targets')
    .select('*');

  if (queryError) {
    return NextResponse.json(
      { error: 'Failed to query targets', details: queryError.message },
      { status: 500 }
    );
  }

  const notificationTargets = (targets ?? []) as NotificationTarget[] &
    {
      customer_id: string;
      vehicle_id: string;
    }[];

  // 2. notificationsテーブルに記録（重複時はスキップ）
  if (notificationTargets.length > 0) {
    const records = notificationTargets.map((t) => ({
      customer_id: (t as any).customer_id,
      vehicle_id: (t as any).vehicle_id,
      notification_type: t.notification_type,
      recipient_type: 'staff',
      channel: 'line',
      status: 'pending',
      scheduled_at: new Date().toISOString(),
    }));

    // 重複は無視して挿入（unique制約で弾かれる）
    await supabase.from('notifications').upsert(records, {
      onConflict: 'vehicle_id,notification_type,scheduled_at',
      ignoreDuplicates: true,
    });
  }

  // 3. スタッフのLINE user_idリストにプッシュ送信
  const staffUserIds = (process.env.LINE_STAFF_USER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (staffUserIds.length === 0) {
    return NextResponse.json({
      message: 'No staff configured',
      target_count: notificationTargets.length,
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://example.com';
  const message = buildDailyNotificationFlexMessage(notificationTargets, baseUrl);

  const results = await Promise.all(
    staffUserIds.map(async (userId) => {
      const result = await sendLinePush(userId, [message]);
      return { userId, ...result };
    })
  );

  // 送信結果をnotificationsテーブルに反映
  const allSent = results.every((r) => r.success);
  if (allSent && notificationTargets.length > 0) {
    await supabase
      .from('notifications')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('status', 'pending')
      .eq('recipient_type', 'staff')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());
  }

  return NextResponse.json({
    target_count: notificationTargets.length,
    staff_count: staffUserIds.length,
    results,
  });
}
