import http from '../../../api/http';
import {
	compareDance,
	getTaskStatus,
	type CompareResponse,
	type LoadDanceResult,
} from '../../../api/users/compare';
import {
	saveLastAnonAttempt,
	saveLastAnonDance,
} from '../../../helpers/anonProgress';
import type { AppDispatch, RootState } from '../../store';
import {
	moderationRejected,
	taskCompleted,
	taskEnqueued,
	taskFailed,
	taskProgressUpdated,
	videoUploading,
	type TaskType,
} from './uploadSlice';

// Ответ бэкенда на загрузку: либо постановка задачи (task_id),
// либо непройденная премодерация (error_code = MODERATION_PENDING).
interface UploadEnqueueResponse {
	task_id?: string;
	dance_id?: string;
	error_code?: string;
	reason?: string;
}

const PENDING_UPLOADS_KEY = 'pending_anonymous_uploads';

// Сохраняем активную задачу в localStorage, чтобы прогресс-бар и попап
// «готово» переживали F5 / навигацию между вкладками. Чистится в трёх
// терминальных состояниях: done, failed, moderation rejected.
const IN_FLIGHT_TASK_KEY = 'in_flight_task';
const IN_FLIGHT_MAX_AGE_MS = 30 * 60 * 1000; // 30 мин — больше серверного таймаута

interface PersistedTask {
	taskId: string;
	taskType: TaskType;
	danceId?: string;
	userDanceId?: string;
	referenceDanceId?: string;
	videoKey?: string;
	startedAt: number;
}

function persistInFlightTask(
	payload: Omit<PersistedTask, 'startedAt'>,
): void {
	if (!payload.taskId) {
		return;
	}

	try {
		localStorage.setItem(
			IN_FLIGHT_TASK_KEY,
			JSON.stringify({ ...payload, startedAt: Date.now() }),
		);
	} catch {
		/* localStorage недоступен — переживём, просто без resume после F5 */
	}
}

function loadInFlightTask(): PersistedTask | null {
	try {
		const raw = localStorage.getItem(IN_FLIGHT_TASK_KEY);
		if (!raw) {
			return null;
		}

		const parsed = JSON.parse(raw) as PersistedTask;
		if (!parsed?.taskId || !parsed?.taskType) {
			return null;
		}

		if (Date.now() - (parsed.startedAt ?? 0) > IN_FLIGHT_MAX_AGE_MS) {
			clearInFlightTask();
			return null;
		}

		return parsed;
	} catch {
		return null;
	}
}

function clearInFlightTask(): void {
	try {
		localStorage.removeItem(IN_FLIGHT_TASK_KEY);
	} catch {
		/* ignore */
	}
}

function savePendingUpload(danceId: string | undefined): void {
	if (!danceId) return;
	try {
		const raw = localStorage.getItem(PENDING_UPLOADS_KEY);
		const list: string[] = raw ? JSON.parse(raw) : [];
		if (!list.includes(danceId)) {
			list.push(danceId);
			localStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(list));
		}
	} catch {
		/* localStorage may be unavailable */
	}
}

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 15 * 60 * 1000; // 15 минут

let _pollTimer: ReturnType<typeof setTimeout> | null = null;

function _clearPoll() {
	if (_pollTimer !== null) {
		clearTimeout(_pollTimer);
		_pollTimer = null;
	}
}

// Запускает поллинг после получения task_id.
// Вызывается из uploadAndCompare и uploadDanceFile.
export const startPolling =
	() => (dispatch: AppDispatch, getState: () => RootState) => {
		_clearPoll();
		const startedAt = Date.now();

		const tick = async () => {
			const state = getState().upload;
			if (!state.taskId || !state.taskType) return;

			if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
				clearInFlightTask();
				dispatch(taskFailed('Превышено время ожидания. Попробуй ещё раз.'));
				return;
			}

			try {
				const status = await getTaskStatus(state.taskId, state.taskType, {
					dance_id: state.danceId ?? undefined,
					user_dance_id: state.userDanceId ?? undefined,
					video_key: state.videoKey ?? undefined,
				});

				if (status.status === 'done') {
					clearInFlightTask();
					if (state.taskType === 'compare') {
						const result = status.result as CompareResponse;
						sessionStorage.setItem(
							`compare_result_${result.user_dance_id}`,
							JSON.stringify(result),
						);
						// Флаг готовности для анон-панели в шапке. GET /result —
						// protected, анон по нему не сможет проверить готовность,
						// поэтому пишем локальный маркер прямо здесь.
						try {
							localStorage.setItem(
								`anon_attempt_ready_${result.user_dance_id}`,
								'1',
							);
							// Зеркалим по dance_id — чтобы LessonPage показал
							// кнопку «Моя последняя попытка» анониму без обращения
							// к protected-эндпоинту.
							if (result.dance_id && result.user_dance_id) {
								localStorage.setItem(
									`anon_last_attempt_${result.dance_id}`,
									JSON.stringify({
										attempt_id: result.user_dance_id,
										score: result.score,
									}),
								);
							}
						} catch {
							/* localStorage недоступен — переживём */
						}
						dispatch(taskCompleted({ compareResult: result }));
					} else {
						dispatch(taskCompleted({ uploadResult: status.result as LoadDanceResult }));
					}
					return;
				}

				if (status.status === 'failed') {
					clearInFlightTask();
					dispatch(taskFailed(status.error ?? 'Ошибка обработки'));
					return;
				}

				dispatch(
					taskProgressUpdated({
						progress: status.progress,
						stageName: status.stage_label,
						taskStatus: status.status,
					}),
				);

				_pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
			} catch {
				// Временная сетевая ошибка — повторим через интервал
				_pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
			}
		};

		_pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
	};

// Загрузить видео для создания танца (асинхронно).
export const uploadDanceFile =
	(file: File) => async (dispatch: AppDispatch, getState: () => RootState) => {
		dispatch(videoUploading({ taskType: 'upload' }));
		try {
			const formData = new FormData();
			formData.append('dance', file);
			const response = await http.post<UploadEnqueueResponse>(
				'/users/load',
				formData,
				{ headers: { 'Content-Type': 'multipart/form-data' } },
			);
			const data = response.data;
			// Только анонимная загрузка попадает в pending-claim и панель шапки:
			// у авторизованного связь с танцем уже создана на бэкенде при загрузке.
			if (!getState().user.user && data.dance_id) {
				savePendingUpload(data.dance_id);
				saveLastAnonDance(data.dance_id);
			}
			// Видео не прошло премодерацию — показываем причину, не запускаем поллинг.
			if (data.error_code === 'MODERATION_PENDING') {
				clearInFlightTask();
				dispatch(moderationRejected(data.reason ?? ''));
				return;
			}
			dispatch(
				taskEnqueued({
					taskId: data.task_id ?? '',
					taskType: 'upload',
					danceId: data.dance_id,
				}),
			);
			persistInFlightTask({
				taskId: data.task_id ?? '',
				taskType: 'upload',
				danceId: data.dance_id,
			});
			dispatch(startPolling());
		} catch {
			dispatch(taskFailed('Не удалось загрузить видео. Попробуйте ещё раз.'));
		}
	};

// Загрузить танец по ссылке (асинхронно).
export const uploadDanceByUrl =
	(url: string) => async (dispatch: AppDispatch, getState: () => RootState) => {
		try {
			const response = await http.post<UploadEnqueueResponse>(
				'/users/loadByURL',
				{ url },
			);
			const data = response.data;
			// Только анонимная загрузка попадает в pending-claim и панель шапки:
			// у авторизованного связь с танцем уже создана на бэкенде при загрузке.
			if (!getState().user.user && data.dance_id) {
				savePendingUpload(data.dance_id);
				saveLastAnonDance(data.dance_id);
			}
			// Видео не прошло премодерацию — показываем причину, не запускаем поллинг.
			if (data.error_code === 'MODERATION_PENDING') {
				clearInFlightTask();
				dispatch(moderationRejected(data.reason ?? ''));
				return;
			}
			dispatch(
				taskEnqueued({
					taskId: data.task_id ?? '',
					taskType: 'upload',
					danceId: data.dance_id,
				}),
			);
			persistInFlightTask({
				taskId: data.task_id ?? '',
				taskType: 'upload',
				danceId: data.dance_id,
			});
			dispatch(startPolling());
		} catch {
			dispatch(
				taskFailed(
					'Не удалось загрузить видео по ссылке. Проверьте ссылку и попробуйте снова.',
				),
			);
		}
	};

// Отправить видео на сравнение с эталоном (асинхронно). startSec/endSec —
// опциональная обрезка из VideoEditor: бэкенд режет видео ffmpeg'ом до
// отправки на ML, чтобы выкинуть «подход к камере» и «отход от неё».
export const uploadAndCompare =
	(
		videoBlob: Blob,
		referenceDanceId: string,
		startSec?: number,
		endSec?: number,
	) =>
	async (dispatch: AppDispatch, getState: () => RootState) => {
		dispatch(videoUploading({ taskType: 'compare' }));
		try {
			const enqueued = await compareDance(videoBlob, referenceDanceId, {
				startSec,
				endSec,
			});

			// compareDance теперь возвращает AsyncEnqueueResult (202)
			const enqueueResult = enqueued as unknown as {
				task_id: string;
				user_dance_id: string;
				reference_dance_id: string;
			};

			dispatch(
				taskEnqueued({
					taskId: enqueueResult.task_id,
					taskType: 'compare',
					userDanceId: enqueueResult.user_dance_id,
					referenceDanceId: enqueueResult.reference_dance_id ?? referenceDanceId,
					danceId: enqueueResult.reference_dance_id ?? referenceDanceId,
				}),
			);
			persistInFlightTask({
				taskId: enqueueResult.task_id,
				taskType: 'compare',
				userDanceId: enqueueResult.user_dance_id,
				referenceDanceId: enqueueResult.reference_dance_id ?? referenceDanceId,
				danceId: enqueueResult.reference_dance_id ?? referenceDanceId,
			});

			if (!getState().user.user && enqueueResult.user_dance_id) {
				saveLastAnonAttempt(
					enqueueResult.user_dance_id,
					enqueueResult.reference_dance_id ?? referenceDanceId,
				);
			}

			dispatch(startPolling());
		} catch {
			dispatch(
				taskFailed(
					'Не удалось отправить видео на сравнение. Попробуйте ещё раз.',
				),
			);
		}
	};

// Восстановить поллинг активной задачи после F5 / открытия новой вкладки.
// Вызывается из App при монтировании.
export const resumeInFlightTask =
	() => (dispatch: AppDispatch, getState: () => RootState) => {
		// Уже что-то поллится в этом таб-сеансе — не дублируем.
		if (getState().upload.taskId) {
			return;
		}

		const persisted = loadInFlightTask();
		if (!persisted) {
			return;
		}

		dispatch(
			taskEnqueued({
				taskId: persisted.taskId,
				taskType: persisted.taskType,
				danceId: persisted.danceId,
				userDanceId: persisted.userDanceId,
				referenceDanceId: persisted.referenceDanceId,
				videoKey: persisted.videoKey,
			}),
		);
		dispatch(startPolling());
	};
