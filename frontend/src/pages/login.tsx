import { useState } from 'react';
import Card from '../components/card';
import Links from '../components/links';
import Navbar from '../components/navbar';
import {useNavigate } from 'react-router-dom';
import Body from '../components/body';

const Login = () => {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [submitError, setSubmitError] = useState('');
	const navigate = useNavigate();

	return (
		<Body className="flex flex-col items-center justify-center">
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
					<div className="grid grid-cols-2 flex-col text-center transition-transform gap-6">
					<button
						type="submit"
						className="w-full rounded-lg bg-sky-500 py-3 font-semibold text-white hover:bg-sky-400 active:scale-[0.98] transition-all shadow-lg"
					>
						Sign In
					</button>
					<button
						className="w-full rounded-lg bg-sky-500 py-3 font-semibold text-white hover:bg-sky-400 active:scale-[0.98] transition-all shadow-lg"
					>
						Forgot Password
					</button>
					</div>
				</form>
			</Card> 
		</Body>
	);
};

export default Login;
