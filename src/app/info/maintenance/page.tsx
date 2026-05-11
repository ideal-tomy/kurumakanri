import type { Metadata } from 'next';
import styles from '../info.module.css';

export const metadata: Metadata = {
  title: '車検整備 費用一覧（参考）',
  description: '車検時に発生する可能性のある整備項目の参考価格をご案内します。あくまで目安であり、車両状態により金額は変動します。',
};

interface SectionImage {
  src: string;
  alt: string;
  title: string;
  description?: string;
}

const IMAGES: SectionImage[] = [
  {
    src: '/info/maintenance/tires-2026-05.svg',
    alt: 'タイヤ関連の整備費用一覧（タイヤ交換工賃・バランス調整・アライメント・パンク修理・バルブ交換の参考価格表）',
    title: 'タイヤ関連',
    description: '溝の減り・ひび割れ・偏摩耗がある場合は交換目安です。',
  },
  {
    src: '/info/maintenance/suspension-2026-05.svg',
    alt: '足回りの整備費用一覧（ショックアブソーバー・スタビライザーリンク・ロアアームブッシュ・ドライブシャフトブーツの参考価格表）',
    title: '足回り',
    description: '異音やオイル滲み、ブーツ破れがある場合は車検通過に整備が必要です。',
  },
  {
    src: '/info/maintenance/lights-2026-05.svg',
    alt: 'ライト関連の整備費用一覧（ヘッドライトバルブ・LEDバルブ・ヘッドライトレンズ磨き・ウインカー球の参考価格表）',
    title: 'ライト関連',
    description: '光量不足や黄ばみは車検時に指摘されやすい項目です。',
  },
  {
    src: '/info/maintenance/battery-2026-05.svg',
    alt: 'バッテリー・電装の整備費用一覧（標準バッテリー・アイドリングストップ車用・ハイブリッド補機バッテリー・点検充電の参考価格表）',
    title: 'バッテリー・電装',
    description: '3年以上経過 / セルの回りが弱いと感じる場合は交換目安です。',
  },
  {
    src: '/info/maintenance/oil-2026-05.svg',
    alt: 'エンジンオイルとエレメントの整備費用一覧（鉱物油・部分合成油・全合成油・オイルエレメント・ドレンパッキンの参考価格表）',
    title: 'エンジンオイル / エレメント',
    description: '走行距離・前回交換時期により、車検と同時に行うと割安になる場合があります。',
  },
];

export default function MaintenanceInfoPage() {
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.title}>車検整備 費用一覧（参考価格）</h1>
        <p className={styles.lead}>
          車検時に発生する可能性のある整備項目の参考価格をご案内します。
          内容はお車の状態によって異なるため、実際の費用は実車確認後にお見積いたします。
        </p>
        <div className={styles.note}>
          ※ 表示価格はすべて目安です。車両状態・部品グレード・税により変動します。
        </div>
      </header>

      <div className={styles.sections}>
        {IMAGES.map((img) => (
          <section key={img.src} className={styles.section}>
            <div className={styles.sectionTitle}>{img.title}</div>
            {img.description ? <div className={styles.sectionDesc}>{img.description}</div> : null}
            <img className={styles.image} src={img.src} alt={img.alt} loading="lazy" />
          </section>
        ))}
      </div>

      <footer className={styles.footer}>
        ご不明点や正式なお見積のご希望は、店舗までお気軽にお問い合わせください。
        <br />
        本ページの内容は予告なく更新される場合があります。
      </footer>
    </main>
  );
}
