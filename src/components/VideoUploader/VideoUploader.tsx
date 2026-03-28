import type { ChangeEvent } from 'react';
import React, { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import actions from '../../redux/features/video/actions';
import Title from '../../components/Title/Title';
import styles from './VideoUploader.module.scss';
import Button from '../Button/Button';
import Paragraph from '../Paragraph/Paragraph';

const VideoUploader: React.FC = () => {
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const inputRef = useRef<HTMLInputElement | null>(null);

	const [selectedFile, setSelectedFile] = useState<File | null>(null);

	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0] || null;
		setSelectedFile(file);
	};

	const handleOpenFilePicker = () => {
		inputRef.current?.click();
	};

	const handleStartAnalysis = async () => {
		if (!selectedFile) {
			return;
		}

		dispatch(actions.uploadVideoAction(selectedFile) as any);
		navigate('/lesson');
	};

	return (
		<div className={styles.container}>
			<Title className={styles.title}>Сделай первый шаг к своему танцу</Title>

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

				<Button
					type="button"
					className={styles.startButton}
					onClick={handleStartAnalysis}
					disabled={!selectedFile}
				>
					<span className={styles.buttonText}>Начать разбор</span>
				</Button>
			</div>

			<Paragraph opacity="80" className={styles.subtitle}>
				Форматы: MP4, MOV <br />
				Вес файла: не более N МБ
			</Paragraph>
		</div>
	);
};

export default VideoUploader;