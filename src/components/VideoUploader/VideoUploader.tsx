import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { ChangeEvent } from "react";
import { uploadVideo } from "../../redux/features/video/actions";
import {
  selectVideoStatus,
  selectVideoResult,
  selectVideoError,
} from "../../redux/features/video/selectors";
import styles from "./VideoUploader.module.scss";

const VideoUploader: React.FC = () => {
  const dispatch = useDispatch();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const status = useSelector(selectVideoStatus);
  const result = useSelector(selectVideoResult);
  const error = useSelector(selectVideoError);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      setSelectedFile(file);
      console.log("Выбранный файл:", file.name);
      dispatch(uploadVideo(file));
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Загрузите ваше видео</h2>

      <label className={styles.uploadButton}>
        Выбрать файл
        <input
          type="file"
          accept="video/mp4,video/avi,video/mov,video/mkv"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </label>

      <p className={styles.subtitle}>
        Допустимые форматы: MP4, MOV
      </p>

      {selectedFile && (
        <p className={styles.selectedFile}>Выбранный файл: {selectedFile.name}</p>
      )}

      {status === "loading" && <p className={styles.loading}>Загрузка видео...</p>}
      {status === "error" && <p className={styles.error}>Ошибка: {error}</p>}

      {status === "loaded" && result && (
        <div className={styles.result}>
          <p>Видео загружено успешно!</p>
          <p>Длительность: {result.duration_sec.toFixed(2)} сек</p>
          <p>Кадров: {result.num_frames}</p>
          <p>Сегментов: {result.num_segments}</p>
          <p>Файл результата: {result.result_key}</p>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;