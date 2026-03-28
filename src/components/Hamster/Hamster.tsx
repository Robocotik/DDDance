import type { FC } from 'react';
import styles from './Hamster.module.scss';

const Hamster: FC = () => {
  return (
    <div className={styles.hamsterWrapper}>
      <div className={styles.wheel} />
      <div className={styles.hamster}>
        <div className={styles.body}>
          <div className={styles.head}>
            <div className={styles.ear} />
            <div className={styles.eye} />
            <div className={styles.nose} />
          </div>

          <div className={`${styles.limb} ${styles.limbFr}`} />
          <div className={`${styles.limb} ${styles.limbFl}`} />
          <div className={`${styles.limb} ${styles.limbBr}`} />
          <div className={`${styles.limb} ${styles.limbBl}`} />

          <div className={styles.tail} />
        </div>
      </div>
      <div className={styles.spoke} />
    </div>
  );
};

export default Hamster;