import { useEffect, useState } from 'react';
import Card from '../components/card';
import Links from '../components/links';
import Navbar from '../components/navbar';
import {useNavigate } from 'react-router-dom';
import Body from '../components/body';
import HCaptchaWidget from '../components/hcaptchaWidget';

// Map a user's account type to the page they should land on after auth.
const homeForUserType = (userType?: string) => {
	if (userType === 'admin') return '/admin';
	if (userType === 'business') return '/business/dashboard';
	return '/dashboard';
};

const Login = () => {
	const AUTH_BASE_URL = (import.meta.env.VITE_AUTH_BASE_URL || import.meta.env.PUBLIC_AUTH_BASE_URL || 'http://localhost:5173').trim();
	const loginUrl = AUTH_BASE_URL ? `${AUTH_BASE_URL}/auth/login` : '/auth/login';
	const HCAPTCHA_SITE_KEY = (import.meta.env.VITE_HCAPTCHA_SITE_KEY || import.meta.env.PUBLIC_HCAPTCHA_SITE_KEY || '').trim();
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [submitError, setSubmitError] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [captchaToken, setCaptchaToken] = useState<string | null>(null);
	const [showForgotPassword, setShowForgotPassword] = useState(false);
	const [forgotEmail, setForgotEmail] = useState('');
	const [forgotError, setForgotError] = useState('');
	const [forgotSuccess, setForgotSuccess] = useState('');
	const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);
	const navigate = useNavigate();

	// Already-authenticated users shouldn't see the login page; send them home.
	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch(`${AUTH_BASE_URL}/auth/dashboard`, { credentials: 'include' });
				if (res.ok && !cancelled) {
					const data = await res.json().catch(() => ({} as any));
					navigate(homeForUserType(data?.user_type), { replace: true });
				}
			} catch {
				/* not logged in — stay on the login page */
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [AUTH_BASE_URL, navigate]);

	return (
		<Body>
			<Navbar page="Login">
                <Links link="/">
                    Back →
                </Links>
            </Navbar>
            <div className="flex flex-col items-center justify-center min-h-screen px-4 pt-20 pb-10 w-full">
			<Card className="max-w-md md:max-w-2xl w-full z-10" cardClassName="w-full" title="Login" titleClassName='text-cyan-500'>
				<form className="space-y-6"
					onSubmit={async (e) => {
						e.preventDefault();
						setSubmitError('');
						if (!captchaToken) return;
						const formData = new FormData();
						formData.append('username', username.trim());
						formData.append('password', password);
						formData.append('captcha_token', captchaToken);

						try {
							setIsSubmitting(true);
							const res = await fetch(loginUrl, {
								method: 'POST',
								credentials: 'include',
								body: formData
							});

							const contentType = res.headers.get('content-type') || '';
							const isJson = contentType.includes('application/json');
							const data = isJson ? await res.json().catch(() => ({} as any)) : null;

							if (res.ok) {
								try {
									const userRes = await fetch(`${AUTH_BASE_URL}/auth/dashboard`, {
										credentials: 'include'
									});
									if (userRes.ok) {
										const userData = await userRes.json();
										navigate(homeForUserType(userData?.user_type));
									} else {
										navigate('/dashboard');
									}
								} catch {
									navigate('/dashboard');
								}
								return;
							}

							if (isJson && data?.message) {
								setSubmitError(data.message);
								return;
							}

							const text = await res.text().catch(() => '');
							setSubmitError(text?.trim() || `Login failed (${res.status})`);
						} catch (err) {
							setSubmitError('Cannot reach auth response. If register just failed, sign in with existing account or use a different email for new registration.');
							console.error(err);
						} finally {
							setIsSubmitting(false);
						}
					}}>
					<div>
						<label className="block text-sm font-medium text-white">Username:</label>
						<input
							type="text"
							className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
							placeholder="username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-white">Password</label>
						<input
							type="password"
							className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
							placeholder="••••••••"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
					</div>
					<HCaptchaWidget siteKey={HCAPTCHA_SITE_KEY} onVerifyToken={setCaptchaToken} />
					{submitError && <p className="text-red-400 text-sm text-center">{submitError}</p>}
					<div className="grid grid-cols-2 flex-col text-center transition-transform gap-6">
					<button
						type="submit"
						disabled={isSubmitting || !captchaToken}
						className="w-full rounded-lg bg-cyan-500 py-3 font-semibold text-white hover:bg-cyan-400 active:scale-[0.98] transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
					>
						{isSubmitting ? 'Signing In...' : 'Sign In'}
					</button>
					<button
						type="button"
						onClick={() => {
							setShowForgotPassword(true);
							setForgotError('');
							setForgotSuccess('');
						}}
						className="w-full rounded-lg bg-cyan-500 py-3 font-semibold text-white hover:bg-cyan-400 active:scale-[0.98] transition-all shadow-lg"
					>
						Forgot Password
					</button>
					</div>
				</form>
			</Card>
            </div>
			{showForgotPassword && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4">
					<Card
						title="Forgot Password"
						cardClassName="w-full max-w-lg"
						titleClassName="text-cyan-500"
					>
						<form
							className="space-y-4"
							onSubmit={async (e) => {
								e.preventDefault();
								setForgotError('');
								setForgotSuccess('');
								const email = forgotEmail.trim().toLowerCase();
								if (!email) {
									setForgotError('Please enter your account email.');
									return;
								}
								try {
									setIsForgotSubmitting(true);
									const response = await fetch(`${AUTH_BASE_URL}/auth/forgot_password`, {
										method: 'POST',
										headers: { 'Content-Type': 'application/json' },
										credentials: 'include',
										body: JSON.stringify({ email }),
									});
									const data = await response.json().catch(() => ({}));
									if (!response.ok) {
										setForgotError(data?.message || 'Unable to send reset email right now.');
										return;
									}
									setForgotSuccess(data?.message || 'If an account exists for this email, a reset link was sent.');
								} catch (error) {
									console.error('Forgot password request failed:', error);
									setForgotError('Unable to send reset email right now.');
								} finally {
									setIsForgotSubmitting(false);
								}
							}}
						>
							<p className="text-sm text-gray-300">
								Enter your account email. We will send a secure reset link to change your password.
							</p>
							<div>
								<label className="block text-sm font-medium text-white">Email</label>
								<input
									type="email"
									className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
									placeholder="email@example.com"
									value={forgotEmail}
									onChange={(e) => setForgotEmail(e.target.value)}
								/>
							</div>
							{forgotError && <p className="text-red-400 text-sm">{forgotError}</p>}
							{forgotSuccess && <p className="text-green-300 text-sm">{forgotSuccess}</p>}
							<div className="flex items-center justify-end gap-2">
								<button
									type="button"
									onClick={() => {
										setShowForgotPassword(false);
										setForgotError('');
										setForgotSuccess('');
									}}
									className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
								>
									Close
								</button>
								<button
									type="submit"
									disabled={isForgotSubmitting}
									className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-400 disabled:opacity-60"
								>
									{isForgotSubmitting ? 'Sending...' : 'Send Reset Link'}
								</button>
							</div>
						</form>
					</Card>
				</div>
			)}
		</Body>
	);
};

export default Login;
