import React, { useState } from 'react';
import Card from '../components/card';
import Links from '../components/links';
import Navbar from '../components/navbar';
import {useNavigate } from 'react-router-dom';
import Body from '../components/body';
import HCaptchaWidget from '../components/hcaptchaWidget';

const Register = () => {
	const AUTH_BASE_URL = (import.meta.env.VITE_AUTH_BASE_URL || import.meta.env.PUBLIC_AUTH_BASE_URL || 'http://localhost:5173').trim();
	const registerUrl = AUTH_BASE_URL ? `${AUTH_BASE_URL}/auth/register` : '/auth/register';
	const HCAPTCHA_SITE_KEY = (import.meta.env.VITE_HCAPTCHA_SITE_KEY || import.meta.env.PUBLIC_HCAPTCHA_SITE_KEY || '').trim();
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [email, setEmail] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [userType, setUserType] = useState<'customer' | 'business'>('customer');
	const [submitError, setSubmitError] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [captchaToken, setCaptchaToken] = useState<string | null>(null);
	const navigate = useNavigate();

	const isPasswordValid = password.length >= 8 && /\d/.test(password) && /[a-zA-Z]/.test(password);
	const doPasswordsMatch = password === confirmPassword;

	const handleRegister = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitError('');
		if (!doPasswordsMatch) {
			setSubmitError('Passwords do not match.');
			return;
		}


		if (!isPasswordValid) {
			setSubmitError('Password must be at least 8 characters long and contain both letters and numbers.');
			return;
		}

		if (!captchaToken) return;

		const formData = new FormData();
		const normalizedUsername = username.trim();
		const normalizedEmail = email.trim().toLowerCase();
		const normalizedPassword = password;
		formData.append('username', normalizedUsername);
		formData.append('password', normalizedPassword);
		formData.append('email', normalizedEmail);
		formData.append('user_type', userType);
		formData.append('captcha_token', captchaToken);

		try {
			setIsSubmitting(true);
			const response = await fetch(registerUrl, {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});

			const contentType = response.headers.get('content-type') || '';
			const isJson = contentType.includes('application/json');
			const data = isJson ? await response.json().catch(() => ({} as any)) : null;

			if (response.ok) {
				navigate(userType === 'business' ? '/business/dashboard' : '/dashboard');
				return;
			}

			if (isJson && data?.message) {
				setSubmitError(data.message);
				return;
			}

			const text = await response.text().catch(() => '');
			const normalized = text.toLowerCase();

			if (normalized.includes('unique constraint failed: user.email')) {
				setSubmitError('An account with this email already exists.');
				return;
			}

			if (normalized.includes('unique constraint failed: user.username') || normalized.includes('username already exists')) {
				setSubmitError('Username already exists.');
				return;
			}

			setSubmitError(`Failed to create account (${response.status}).`);
		} catch (error) {
			setSubmitError('Request blocked. This usually means the email already exists or backend returned an exception page. Try a different email or sign in.');
			console.error('Network error:', error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Body>

			<Navbar page="Register">
				<Links link="/">
					Back →
				</Links>
			</Navbar>
            <div className="flex flex-col items-center justify-center min-h-screen px-4 pt-20 pb-10 w-full">
			<Card className="max-w-md md:max-w-2xl w-full z-10" cardClassName="w-full" title="Register" titleClassName='text-cyan-500'>
				<form className="space-y-6" onSubmit={handleRegister}>
					<div>
						<label className="block text-sm font-medium text-white-400">Username:</label>
						<input
							type="text"
							className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-white-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
							placeholder="username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-white-400">Email:</label>
						<input
							type="text"
							className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-white-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
							placeholder="email@email.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-white-400 mb-3">Account Type:</label>
						<div className="flex gap-4">
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="radio"
									name="userType"
									value="customer"
									checked={userType === 'customer'}
									onChange={(e) => setUserType(e.target.value as 'customer' | 'business')}
									className="w-4 h-4"
								/>
								<span className="text-white-300">Customer</span>
							</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="radio"
									name="userType"
									value="business"
									checked={userType === 'business'}
									onChange={(e) => setUserType(e.target.value as 'customer' | 'business')}
									className="w-4 h-4"
								/>
								<span className="text-white-300">Business</span>
							</label>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-white-400">Password</label>
						<input
							type="password"
							className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
							placeholder="••••••••"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
						{password && (
							<p className={`text-xs mt-1 ${isPasswordValid ? 'text-green-400' : 'text-red-400'}`}>
								{isPasswordValid ? 'Strong password' : 'Password must be at least 8 characters long and contain both letters and numbers.'}
							</p>
						)}
					</div>
					<div>
						<label className="block text-sm font-medium text-white-400">Confirm Password</label>
						<input
							type="password"
							className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
							placeholder="••••••••"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
						/>
						{confirmPassword && (
							<p className={`text-xs mt-1 ${doPasswordsMatch ? 'text-green-400' : 'text-red-400'}`}>
								{doPasswordsMatch ? 'Passwords match' : 'Passwords do not match'}
							</p>
						)}
					</div>
					<HCaptchaWidget siteKey={HCAPTCHA_SITE_KEY} onVerifyToken={setCaptchaToken} />
					{submitError && <p className="text-red-400 text-sm text-center">{submitError}</p>}
					<button
						type="submit"
						disabled={isSubmitting || !captchaToken}
						className="w-full rounded-lg bg-cyan-500 py-3 font-semibold text-white hover:bg-cyan-400 active:scale-[0.98] transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
					>
						{isSubmitting ? 'Creating Account...' : 'Sign Up'}
					</button>
				</form>
			</Card>
            </div>
		</Body>
	);
};

export default Register;
