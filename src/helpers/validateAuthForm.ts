type ValidateAuthFormArgs = {
	login: string;
	password: string;
	repeatPassword?: string;
	isRegistration?: boolean;
};

type ValidateAuthFormResult = {
	hasError: boolean;
	message: string;
};

const MIN_LENGTH = 6;
const MAX_LENGTH = 15;
const VALID_CHARS =
	'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const hasOnlyValidChars = (value: string) => {
	for (const char of value) {
		if (!VALID_CHARS.includes(char)) {
			return false;
		}
	}
	return true;
};

export const validateAuthForm = ({
	login,
	password,
	repeatPassword,
	isRegistration = false,
}: ValidateAuthFormArgs): ValidateAuthFormResult => {
	if (login.length < MIN_LENGTH) {
		return {
			hasError: true,
			message: 'Длина логина должна быть больше ' + MIN_LENGTH,
		};
	}
	if (login.length > MAX_LENGTH) {
		return {
			hasError: true,
			message: 'Длина логина должна быть меньше ' + MAX_LENGTH,
		};
	}

	if (password.length < MIN_LENGTH) {
		return {
			hasError: true,
			message: 'Длина пароля должна быть больше ' + MIN_LENGTH,
		};
	}

	if (password.length > MAX_LENGTH) {
		return {
			hasError: true,
			message: 'Длина пароля должна быть меньше ' + MAX_LENGTH,
		};
	}

	if (!hasOnlyValidChars(login)) {
		return { hasError: true, message: 'Логин содержит недопустимые символы' };
	}

	if (!hasOnlyValidChars(password)) {
		return { hasError: true, message: 'Пароль содержит недопустимые символы' };
	}

	if (isRegistration && password !== repeatPassword) {
		return { hasError: true, message: 'Пароли не совпадают' };
	}

	return { hasError: false, message: 'Ok' };
};
