import type { ChangeEvent, FormEvent } from 'react';
import React, { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import InstaLogo from '../../assets/svg/insta-logo.svg';
import tiktokLogo from '../../assets/svg/tiktok-logo.svg';
import VkClipsLogo from '../../assets/svg/vkclips-logo.svg';
import Title from '../../components/Title/Title';
import { uploadDanceByUrl, uploadDanceFile } from '../../redux/features/upload/actions';
import { selectIsProcessing } from '../../redux/features/upload/selectors';
import Button from '../Button/Button';
import Paragraph from '../Paragraph/Paragraph';
import styles from './VideoUploader.module.scss';
const MAX_FILE_SIZE = 60 * 1024 * 1024;

const VideoUploader: React.FC = () => {
	const dispatch = useDispatch();
	const inputRef = useRef<HTMLInputElement | null>(null);
	const isTaskProcessing = useSelector(selectIsProcessing);

	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [videoLink, setVideoLink] = useState('');
	const [isUploading, setIsUploading] = useState(false);
	const [fileError, setFileError] = useState<string | null>(null);

	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0] || null;

		if (!file) {
			setFileError(null);
			return;
		}

		if (file.size > MAX_FILE_SIZE) {
			// Раньше пользователь молча оставался без feedback — теперь
			// видит причину и может пережать видео.
			setFileError(
				`Файл слишком большой (${(file.size / 1024 / 1024).toFixed(1)} МБ). Максимум — 60 МБ.`,
			);
			setSelectedFile(null);
			if (inputRef.current) inputRef.current.value = '';
			return;
		}

		setFileError(null);
		setSelectedFile(file);
	};

	const handleLinkChange = (event: ChangeEvent<HTMLInputElement>) => {
		setVideoLink(event.target.value);
	};

	const handleOpenFilePicker = () => {
		inputRef.current?.click();
	};

	const handleStartAnalysis = async () => {
		const trimmedLink = videoLink.trim();
		if (!selectedFile && !trimmedLink) return;

		setIsUploading(true);
		try {
			if (selectedFile) {
				await dispatch(uploadDanceFile(selectedFile) as any);
			} else {
				await dispatch(uploadDanceByUrl(trimmedLink) as any);
			}
		} finally {
			setIsUploading(false);
			setSelectedFile(null);
			setVideoLink('');
			if (inputRef.current) inputRef.current.value = '';
		}
	};

	const handleSubmitLink = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		handleStartAnalysis();
	};

	const isStartDisabled = (!selectedFile && !videoLink.trim()) || isUploading || isTaskProcessing;

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
					disabled={isTaskProcessing || isUploading}
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
					Вес файла: не более 60 МБ
				</Paragraph>

				{fileError && (
					<Paragraph
						opacity="100"
						className={styles.subtitle}
						style={{ color: '#ff6b6b' }}
					>
						{fileError}
					</Paragraph>
				)}

				<Button
					type="button"
					className={styles.startButton}
					onClick={handleStartAnalysis}
					disabled={isStartDisabled}
				>
					<span className={styles.buttonText}>
						{isUploading
							? 'Загрузка...'
							: isTaskProcessing
								? 'Дождитесь анализа предыдущего танца'
								: 'Начать разбор'}
					</span>
				</Button>

			</div>
		</div>
	);
};

export default VideoUploader;
