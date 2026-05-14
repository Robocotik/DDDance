import type { ChangeEvent, FormEvent } from 'react';
import React, { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import InstaLogo from '../../assets/svg/insta-logo.svg';
import tiktokLogo from '../../assets/svg/tiktok-logo.svg';
import VkClipsLogo from '../../assets/svg/vkclips-logo.svg';
import Title from '../../components/Title/Title';
import actions from '../../redux/features/lesson/actions';
import Button from '../Button/Button';
import Paragraph from '../Paragraph/Paragraph';
import styles from './VideoUploader.module.scss';
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const VideoUploader: React.FC = () => {
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const inputRef = useRef<HTMLInputElement | null>(null);

	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [videoLink, setVideoLink] = useState('');

	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0] || null;

		if (!file) {
			return;
		}

		if (file.size > MAX_FILE_SIZE) {
			return;
		}

		setSelectedFile(file);
	};

	const handleLinkChange = (event: ChangeEvent<HTMLInputElement>) => {
		setVideoLink(event.target.value);
	};

	const handleOpenFilePicker = () => {
		inputRef.current?.click();
	};

	const handleStartAnalysis = () => {
		const trimmedLink = videoLink.trim();

		if (selectedFile) {
			dispatch(actions.uploadLessonByVideoAction(selectedFile) as any);
			navigate('/lesson');
			return;
		}

		if (trimmedLink) {
			dispatch(actions.uploadLessonByLinkAction(trimmedLink) as any);
			navigate('/lesson');
		}
	};

	const handleSubmitLink = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		handleStartAnalysis();
	};

	const isStartDisabled = !selectedFile && !videoLink.trim();

	return (
		<div id="video-uploader" className={styles.container}>
			<Title className={styles.title}>Сделай первый шаг к своему танцу</Title>

			<div className={styles.workWithRow}>
				<Paragraph opacity="80" className={styles.subtitle2}>
					Мы работаем с:
				</Paragraph>
				<img src={tiktokLogo} alt="TikTok" className={styles.tiktokLogo} />
				<img src={VkClipsLogo} alt="VkClips" className={styles.tiktokLogo} />
				<img src={InstaLogo} alt="Instagram" className={styles.tiktokLogo} />
			</div>

			<form className={styles.linkForm} onSubmit={handleSubmitLink}>
				<input
					type="text"
					value={videoLink}
					onChange={handleLinkChange}
					placeholder="Ссылка на видео"
					className={styles.linkInput}
				/>
			</form>

			<Title className={styles.title2}>ИЛИ</Title>

			<div className={styles.buttonsBlock}>
				<Button
					type="button"
					className={styles.uploadButton}
					onClick={handleOpenFilePicker}
					title={selectedFile ? selectedFile.name : 'Загрузить файл'}
				>
					<span className={styles.buttonText}>
						{selectedFile ? selectedFile.name : 'Загрузить файл'}
					</span>
				</Button>

				<input
					ref={inputRef}
					type="file"
					accept="video/mp4,video/avi,video/mov,video/mkv"
					onChange={handleFileChange}
					style={{ display: 'none' }}
				/>

				<Paragraph opacity="80" className={styles.subtitle}>
					Форматы: MP4, MOV <br />
					Вес файла: не более 25 МБ
				</Paragraph>

				<Button
					type="button"
					className={styles.startButton}
					onClick={handleStartAnalysis}
					disabled={isStartDisabled}
				>
					<span className={styles.buttonText}>Начать разбор</span>
				</Button>
			</div>
		</div>
	);
};

export default VideoUploader;
