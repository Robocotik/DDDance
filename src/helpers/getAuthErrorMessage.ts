// eslint-disable-next-line sonarjs/cognitive-complexity
export const getAuthErrorMessage = (error: any): string => {
	if (typeof error === 'object' && error !== null && 'response' in error) {
		const status = error.response?.status;
		const data = error.response?.data;

		if (data?.message && typeof data.message === 'string') {
			return data.message;
		}

		switch (status) {
			case 400:
				return 'Неверные учётные данные';
			case 401:
				return 'Неверный логин или пароль';
			case 403:
				return 'Доступ запрещён';
			case 404:
				return 'Пользователь не найден';
			case 409:
				return 'Пользователь с таким логином уже существует';
			case 500:
				return 'Ошибка сервера. Попробуйте позже';
			case 503:
				return 'Сервер временно недоступен';

			default:
				if (status && status >= 500) {
					return 'Ошибка сервера. Попробуйте позже';
				}

				if (status && status >= 400) {
					return 'Ошибка при обработке запроса';
				}
		}
	}

	if (error instanceof Error) {
		if (
			error.message.includes('Network') ||
			error.message.includes('ERR_NETWORK')
		) {
			return 'Проблема с подключением. Проверьте интернет';
		}

		if (error.message.includes('timeout')) {
			return 'Время ожидания истекло. Попробуйте ещё раз';
		}
	}

	if (typeof error === 'string') {
		if (error.includes('Network') || error.includes('ERR_NETWORK')) {
			return 'Проблема с подключением. Проверьте интернет';
		}

		return error;
	}

	return 'Что-то пошло не так. Попробуйте ещё раз';
};
