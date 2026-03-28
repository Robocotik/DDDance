import React, { useEffect, useState } from 'react';
import styles from './Loading.module.scss';
import Hamster from '../Hamster/Hamster';
import Paragraph from '../Paragraph/Paragraph';

const messages = [
  'Готовим магию',
  'Ещё момент',
  'Почти готово',
  'Финальные штрихи',
  'Секундочку…',
  'Вот-вот',
  'Мы на финишной прямой',
  'Сейчас все будет',
  'Честно-честно',
];

const Loading: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 4000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <Hamster />

        <div className={styles.captionWrapper}>
          <Paragraph key={messages[messageIndex]} className={styles.caption}>
            {messages[messageIndex]}
          </Paragraph>
        </div>
      </div>
    </div>
  );
};

export default Loading;