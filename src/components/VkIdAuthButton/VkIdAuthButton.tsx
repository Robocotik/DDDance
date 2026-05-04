import type { BaseAuthResponse } from '@/api/auth/register';
import * as VKID from '@vkid/sdk';
import { useEffect, useMemo, useRef, useState, type FC } from 'react';
//import { saveVkAuthUser } from '../../helpers/vkIdSession';
import http from '@/api/http';

type VkIdAuthButtonProps = {
	className?: string;
	onAuthenticated?: (user: BaseAuthResponse) => void;
	onError?: (message: string) => void;
};

let isVkIdInitialized = false;

//const defaultAvatar = 'https://vk.com/images/camera_200.png';

const initVkId = (appId: number, redirectUrl: string) => {
	if (isVkIdInitialized) {
		return;
	}

	VKID.Config.init({
		app: appId,
		redirectUrl,
		responseMode: VKID.ConfigResponseMode.Callback,
		source: VKID.ConfigSource.LOWCODE,
		scope: '',
	});

	isVkIdInitialized = true;
};

export const VkIdAuthButton: FC<VkIdAuthButtonProps> = ({
	className,
	onAuthenticated,
	onError,
}) => {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const widgetRef = useRef<VKID.OneTap | null>(null);
	const onAuthenticatedRef = useRef(onAuthenticated);
	const onErrorRef = useRef(onError);
	const [isConfigured, setIsConfigured] = useState(true);

	const appId = Number(import.meta.env.VITE_VKID_APP_ID);
	const redirectUrl =
		import.meta.env.VITE_VKID_REDIRECT_URL || `${window.location.origin}/login`;

	const isValidConfig = useMemo(
		() => Number.isFinite(appId) && appId > 0,
		[appId],
	);

	useEffect(() => {
		onAuthenticatedRef.current = onAuthenticated;
		onErrorRef.current = onError;
	}, [onAuthenticated, onError]);

	useEffect(() => {
		if (!containerRef.current) {
			return;
		}

		if (widgetRef.current) {
			return;
		}

		if (!isValidConfig) {
			if (isConfigured) {
				setIsConfigured(false);
			}

			return;
		}

		if (!isConfigured) {
			setIsConfigured(true);
		}

		initVkId(appId, redirectUrl);

		const widget = new VKID.OneTap();
		widgetRef.current = widget;

		const instance = widget.render({
			container: containerRef.current,
			showAlternativeLogin: true,
			styles: {
				width: 328,
				height: 50,
				borderRadius: 16,
			},
		});

		instance
			.on(VKID.WidgetEvents.ERROR, () => {})
			.on(
				VKID.OneTapInternalEvents.LOGIN_SUCCESS,
				(payload: { code: string; device_id: string }) => {
					const { code, device_id: deviceId } = payload as {
						code: string;
						device_id: string;
					};

					VKID.Auth.exchangeCode(code, deviceId)
						.then(async (tokenResult) => {
							const accessToken = tokenResult.access_token;

							const userInfo = await VKID.Auth.userInfo(accessToken);
							const user = userInfo.user;
							const fullName = [user.first_name, user.last_name]
								.filter(Boolean)
								.join(' ')
								.trim();
							const login = (user.email ?? user.phone ?? fullName) || `vk_${tokenResult.user_id}`;

							try {
								const response = await http.post('/auth/vk', {
									access_token: accessToken,
								});
								onAuthenticatedRef.current?.(response.data);
							} catch (signInError: any) {
								if (signInError?.response?.status === 412) {
									const response = await http.post('/auth/vk', {
										access_token: accessToken,
										login: login,
									});
									onAuthenticatedRef.current?.(response.data);
								} else {
									throw signInError;
								}
							}
						})
						.catch(() => {
							onErrorRef.current?.('Не удалось завершить вход через VK ID');
						});
				},
			);

		return () => {
			widgetRef.current?.close();
			widgetRef.current = null;
		};
	}, [
		appId,
		isValidConfig,
		onAuthenticated,
		onError,
		redirectUrl,
		isConfigured,
	]);

	return (
		<div className={className}>
			<div ref={containerRef} aria-label="VK ID" />
			{!isConfigured && (
				<p style={{ color: 'var(--color-error)', marginTop: 8, fontSize: 12 }}>
					Добавьте `VITE_VKID_APP_ID` в `.env`
				</p>
			)}
		</div>
	);
};

