import type { Metadata } from 'next';
import styles from '../info.module.css';

export const metadata: Metadata = {
  title: 'エンジンオイル交換 費用一覧（参考）',
  description: 'エンジンオイル・オイルエレメント交換の参考価格をご案内します。あくまで目安であり、車種により金額は変動します。',
};

interface SectionImage {
  src: string;
  alt: string;
  title: string;
  description?: string;
}

const IMAGES: SectionImage[] = [
  {
    src: '/info/oil/oil-2026-05.svg',
    alt: 'エンジンオイルとエレメントの費用一覧（鉱物油・部分合成油・全合成油・オイルエレメント・ドレンパッキンの参考価格表）',
    title: 'エンジンオイル / エレメント',
    description: 'グレード（鉱物油・部分合成・全合成）によって価格と推奨交換サイクルが変わります。',
  },
];

export default function OilInfoPage() {
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.title}>エンジンオイル交換 費用一覧（参考価格）</h1>
        <p className={styles.lead}>
          エンジンオイル・エレメントの参考価格をご案内します。
          車種・オイルグレードにより金額は変動しますので、ご来店時にご相談ください。
        </p>
        <div className={styles.note}>
          ※ 表示価格はすべて目安です。お車によって必要量や適合オイルが異なります。
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
        ご来店ご希望日時は、LINE またはお電話にてご連絡ください。
        <br />
        ご来店前のオイル種類のご相談も承ります。
      </footer>
    </main>
  );
}
