import { compareDance } from '../../../api/users/compare';
import type { AppDispatch } from '../../store';
import { setUploadError, setUploadResult, startUpload } from './uploadSlice';

export const uploadAndCompare =
	(videoBlob: Blob, referenceDanceId: string) =>
	async (dispatch: AppDispatch) => {
		dispatch(startUpload(referenceDanceId));

		try {
			const result = await compareDance(videoBlob, referenceDanceId);

			sessionStorage.setItem(
				`compare_result_${result.user_dance_id}`,
				JSON.stringify(result),
			);

			dispatch(setUploadResult(result));
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'Не удалось обработать видео';
			dispatch(setUploadError(message));
		}
	};
