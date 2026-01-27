import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../components/card';
import Links from '../components/links';
import Navbar from '../components/navbar';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [submitError, setSubmitError] = useState('');
	const navigate = useNavigate();

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

			<Navbar page="Login">
                <Links link="/">
                    Back →
                </Links>
            </Navbar>

			<Card className="max-w-2xl w-full mt-15 z-10" cardClassName="w-full" title="Login" titleClassName='text-cyan-500'>
				<form className="space-y-6"
					onSubmit={async (e) => {
						e.preventDefault();
						setSubmitError('');

						const formData = new FormData();
						formData.append('username', username);
						formData.append('password', password);

						try {
							const res = await fetch("http://localhost:5173/auth/login", { 
								method: "POST",
								credentials: 'include',
								body: formData 
							});

							const data = await res.json();

							if (res.ok) {
								navigate("/dashboard");
							} else {
								setSubmitError(data.message || 'Login failed');
							}
						} catch (err) {
							setSubmitError('Server connection failed');
							console.error(err);
						}
					}}>
					<div>
						<label className="block text-sm font-medium text-white">Username:</label>
						<input
							type="text"
							className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
							placeholder="username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-white">Password</label>
						<input
							type="password"
							className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
							placeholder="••••••••"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
					</div>
					{submitError && <p className="text-red-400 text-sm text-center">{submitError}</p>}
					<button
						type="submit"
						className="w-full rounded-lg bg-sky-500 py-3 font-semibold text-white hover:bg-sky-400 active:scale-[0.98] transition-all shadow-lg"
					>
						Sign In
					</button>
				</form>
			</Card>
		</div>
	);
};

export default Login;
