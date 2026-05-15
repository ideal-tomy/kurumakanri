import { redirect } from 'next/navigation';

/** 旧URL互換: 本日の作業はホーム（通知リスト）に統合 */
export default function PrioritiesRedirectPage() {
  redirect('/');
}
