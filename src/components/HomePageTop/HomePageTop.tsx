import React from 'react';
import { useMediaQuery } from 'react-responsive';
import Button from '../Button/Button';
import Paragraph from '../Paragraph/Paragraph';
import Title from '../Title/Title';
import styles from './HomePageTop.module.scss';

const HomePageTop: React.FC = () => {
	const isMobile = useMediaQuery({ maxWidth: 768 });

	return (
		<>
			{!isMobile && <DesktopHomePageTopView />}
			{isMobile && <MobileHomePageTopView />}
		</>
	);
};

const DesktopHomePageTopView = () => {
	return (
		<div className={styles.container}>
			<div className={styles.information}>
				<Title level="1" className={styles.title}>
					Загрузи
					<br />
					Прокачай
					<br />
					Зажги
				</Title>
				<Paragraph opacity="80" className={styles.text}>
					Загрузи видео — DDDance разобьёт танец на понятные шаги и
					покажет, как повторить каждое движение
				</Paragraph>
				<Button className={styles.btn}>Попробовать</Button>
			</div>
			<div className={styles.rects}>
				<div className={styles.left}>
					<span className={styles.row1}>
						<div className={styles.rect1}></div>
						<div className={styles.rect2}></div>
					</span>
					<span className={styles.row2}>
						<div className={styles.rect3}></div>
						<video className={styles.video} src={'#'}></video>
					</span>
					<div className={styles.rect4}></div>
				</div>
				<div className={styles.right}>
					<div className={styles.rect5}></div>
					<div className={styles.rect6}></div>
				</div>
			</div>
		</div>
	);
};

const MobileHomePageTopView = () => <div className="mobile-layout"></div>;

export default HomePageTop;
