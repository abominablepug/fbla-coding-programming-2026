import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Card from '../components/card';
import Links from '../components/links';
import Navbar from '../components/navbar';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [submitError, setSubmitError] = useState('');
	const navigate = useNavigate();

	const isPasswordValid = password.length >= 8 && /\d/.test(password) && /[a-zA-Z]/.test(password);
	const doPasswordsMatch = password === confirmPassword;

	const handleRegister = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitError('');
		const url = 'http://localhost:5173/auth/register';
		if (!doPasswordsMatch) {
			return;
		}
		
		// Password strength check
		if (!isPasswordValid) {
			return;
		}

		const formData = new FormData();
		formData.append('username', username);
		formData.append('password', password);

		try {
			const response = await fetch(url, {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			if (response.ok) {
				const data = await response.json();
				console.log('Account Created:', data);
				navigate('/dashboard');
			} else {
				const errorData = await response.json();
				setSubmitError(errorData.message || 'Failed to create account.');
				console.error('Failed to create account:', response.statusText);
			}
		} catch (error) {
			setSubmitError('Network error occurred.');
			console.error('Network error:', error);
		}
	};

	return (
		<div className="min-h-screen bg-neutral-900 relative w-full overscroll-none flex flex-col items-center justify-center">
			<div className="fixed backdrop-blur-[1000px] inset-0 bg-neutral-900 pointer-events-none w-full z-0 flex items-center justify-center overscroll-none">
				<motion.div initial={{ opacity: 0.4, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 2.0 }} className="fixed lg:w-[1200px] h-[500px] w-[600px] -z-0 rounded-full">
					<div className="absolute bottom-[-500px] w-full h-full bg-linear-to-t from-cyan-700/70 via-cyan-500/70 to-purple-400/70 blur-[160px] rounded-full" />
				</motion.div>
				<motion.div initial={{ opacity: 0.3, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 2.0 }} className="fixed lg:w-[900px] h-[500px] w-[500px] -z-0 rounded-full">
					<div className="absolute lg:top-[-520px] top-[-420px] w-full h-full bg-linear-to-b from-cyan-700/40 via-cyan-500/40 to-purple-400/40 blur-[120px] rounded-full" />
				</motion.div>
			</div>

			<Navbar page="Register">
                <Links link="/">
                    Back →
                </Links>
            </Navbar>

			<Card className="max-w-2xl w-full mt-15 z-10" cardClassName="w-full" title="Register" titleClassName='text-cyan-500'>
				<form className="space-y-6" onSubmit={handleRegister}>
					<div>
						<label className="block text-sm font-medium text-white-400">Username:</label>
						<input
							type="text"
							className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-white-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
							placeholder="username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-white-400">Password</label>
						<input
							type="password"
							className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
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
							className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
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
					{submitError && <p className="text-red-400 text-sm text-center">{submitError}</p>}
					<button
						type="submit"
						className="w-full rounded-lg bg-sky-500 py-3 font-semibold text-white hover:bg-sky-400 active:scale-[0.98] transition-all shadow-lg "
					>
						Sign Up
					</button>
				</form>
			</Card>
		</div>
	);
};

export default Register;
