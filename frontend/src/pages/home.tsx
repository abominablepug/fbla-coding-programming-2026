import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Links from '../components/links';
import Navbar from '../components/navbar';
import Card from '../components/card';
import { ArrowRight, HeartPlus, LayoutDashboard, Code, Database, Globe, X } from 'lucide-react';
import mapDisp from '../assets/mapdisp.png'; 
import findr from '../assets/findr.png'; 
import dashboard from '../assets/dashboard.png'; 
import Body from '../components/body';

const LuminXLogoMark = () => (
	<svg
		viewBox="0 0 64 64"
		className="h-12 w-12 opacity-95 drop-shadow-[0_0_12px_rgba(56,189,248,0.34)] sm:h-14 sm:w-14 md:h-20 md:w-20"
		fill="none"
		aria-hidden="true"
	>
		<defs>
			<linearGradient id="luminxLogoGradient" x1="8" y1="6" x2="54" y2="56" gradientUnits="userSpaceOnUse">
				<stop offset="0%" stopColor="#2DE1FC" />
				<stop offset="52%" stopColor="#449DD1" />
				<stop offset="100%" stopColor="#446DF6" />
			</linearGradient>
		</defs>
		<circle cx="32" cy="23" r="12" fill="url(#luminxLogoGradient)" opacity="0.12" />
		<path
			d="M32 6C22.611 6 15 13.611 15 23c0 13.365 12.25 28.47 15.571 32.32a2 2 0 0 0 2.858 0C36.75 51.47 49 36.365 49 23 49 13.611 41.389 6 32 6Z"
			stroke="url(#luminxLogoGradient)"
			strokeWidth="2.4"
		/>
		<path
			d="M24 23c0-4.418 3.582-8 8-8s8 3.582 8 8c0 2.387-1.045 4.526-2.703 5.99-.885.782-1.297 1.38-1.297 2.01h-8c0-.63-.412-1.228-1.297-2.01A7.98 7.98 0 0 1 24 23Z"
			stroke="url(#luminxLogoGradient)"
			strokeWidth="1.95"
			strokeLinejoin="round"
		/>
		<path d="M28.5 35h7M29 39h6" stroke="url(#luminxLogoGradient)" strokeWidth="1.95" strokeLinecap="round" />
	</svg>
);

const Home = () => {
	return (
		<Body>
			<Navbar page="Home">
				<Links link="/login">
					Login →
				</Links>
				<Links link="/register">
					Register →
				</Links>
			</Navbar>

			<div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4 transition-transform">
				<motion.div initial={{ opacity: 0.5, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} >
					<div className="mb-6 flex items-center justify-center gap-2 md:gap-3">
						<h1 className="shrink-0 pr-2 md:pr-3 text-6xl md:text-9xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent tracking-tighter drop-shadow-2xl">
							LuminX
						</h1>
						<div className="ml-2 flex h-full shrink-0 items-center md:ml-3">
							<LuminXLogoMark />
						</div>
					</div>
				</motion.div>

				<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }} className="text-xl md:text-2xl text-neutral-400 max-w-3xl mb-12 leading-relaxed font-light">
					Bringing{' '}
					<span className="mx-1 italic text-cyan-200 drop-shadow-[0_0_14px_rgba(45,225,252,0.45)]">
						light
					</span>{' '}
					to{' '}
					<span className="relative inline-flex px-1.5 text-neutral-100 drop-shadow-[0_0_10px_rgba(68,109,246,0.35)]">
						<span className="pointer-events-none absolute -inset-x-2 -inset-y-1 -z-10 rounded-full bg-cyan-400/22 blur-lg" />
						<span className="pointer-events-none absolute -inset-x-1.5 -inset-y-0.5 -z-10 rounded-full bg-blue-500/22 blur-md" />
						local businesses
					</span>
					.
					<br />
					<span className="text-cyan-400 font-normal">Find what shines nearby.</span>
				</motion.p>

				<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6, duration: 0.5 }} className="flex gap-8" >
					<Link to="/register" className="group inline-flex items-center gap-3 px-6 py-4 bg-sky-500 text-white rounded-lg font-semibold text-lg transition-all hover:bg-sky-400 shadow-lg">
						Get Started
						<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
					</Link>
					<Link to="/login" className="group inline-flex items-center gap-3 px-10 py-4 bg-sky-500 text-white rounded-lg font-semibold text-lg transition-all hover:bg-sky-400 shadow-lg">
						Login 
						<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
					</Link>
				</motion.div>

				<motion.div onClick={()=>{document.getElementById("details")?.scrollIntoView({behavior:'smooth'});}} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 1 }} className="absolute bottom-10 animate-bounce text-neutral-400 flex flex-col items-center gap-2" >
					<span className="text-sm uppercase tracking-widest">Scroll to Explore</span>
					<ArrowRight className="w-4 h-4 rotate-90" />
				</motion.div>
			</div>

			<div id="details" className="relative z-10 flex flex-col items-center gap-24 py-32 px-4">
				<div className="text-center max-w-3xl">
					<h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Revolutionizing Location Scouting</h2>
					<p className="text-neutral-400 text-lg">
						We combine intuitive design with powerful data to help you find the perfect business location.
					</p>
				</div>

				<motion.div 
					initial={{ opacity: 0, y: 50 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8 }}
					className="w-full flex justify-center"
				>
				<Card className="max-w-6xl" cardClassName="hover:shadow-cyan-500/20 hover:shadow-2xl hover:scale-102 transition-all duration-500" title="Smart Location Matching" titleClassName="text-cyan-400">
					<div className="grid md:grid-cols-2 gap-12 items-center">
						<div className="space-y-6">
							<p className="text-lg text-neutral-300 leading-relaxed">
								Finding a location shouldn't be a chore. Our <span className="text-cyan-400 font-bold">Smart Matching Interface</span> allows you to rapidly browse through potential spots.
							</p>
							<ul className="space-y-4">
								<li className="flex items-start gap-3">
									<div className="p-2 bg-green-500/10 rounded-lg text-green-400"><HeartPlus size={20} /></div>
									<div>
										<h4 className="font-bold text-white">Swipe Right to Like</h4>
										<p className="text-sm text-neutral-400">Save locations you're interested in to your dashboard.</p>
									</div>
								</li>
								<li className="flex items-start gap-3">
									<div className="p-2 bg-red-500/10 rounded-lg text-red-400"><X size={20} className="rotate-180" /></div>
									<div>
										<h4 className="font-bold text-white">Swipe Left to Pass</h4>
										<p className="text-sm text-neutral-400">Skip locations that don't meet your criteria.</p>
									</div>
								</li>
							</ul>
						</div>
						<div className="relative h-80 bg-neutral-900 rounded-2xl border border-white/10 overflow-hidden group shadow-2xl">
							<div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-800/50 text-center">
								<img className="h-500 -translate-y-1.5"src={findr}/>
							</div>
						</div>
					</div>
				</Card>
				</motion.div>

				<motion.div 
					initial={{ opacity: 0, y: 50 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8, delay: 0.2 }}
					className="w-full flex justify-center"
				>
				<Card className="max-w-6xl" cardClassName="hover:shadow-purple-500/20 hover:shadow-2xl hover:scale-102 transition-all duration-500" title="Interactive Mapping" titleClassName="text-purple-400">
					<div className="grid md:grid-cols-2 gap-12 items-center">
						<div className="order-2 md:order-1 relative h-80 bg-neutral-900 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
							<div className="absolute flex flex-col items-center justify-center bg-neutral-800/50 text-center">
								<img className="-translate-y-2" src={mapDisp}/>
							</div>
						</div>
						<div className="order-1 md:order-2 space-y-6">
							<p className="text-lg text-neutral-300 leading-relaxed">
								Visualize your opportunities with our powerful map integration. Powered by <span className="text-purple-400 font-bold">TomTom API</span>.
							</p>
							<div className="grid grid-cols-2 gap-4">
								<div className="bg-white/5 p-4 rounded-xl border border-white/5">
									<h4 className="font-bold text-white mb-1">Traffic Data</h4>
									<p className="text-xs text-neutral-400">Real-time traffic flow to assess accessibility.</p>
								</div>
								<div className="bg-white/5 p-4 rounded-xl border border-white/5">
									<h4 className="font-bold text-white mb-1">POI Search</h4>
									<p className="text-xs text-neutral-400">Find nearby amenities and competitors.</p>
								</div>
							</div>
						</div>
					</div>
				</Card>
				</motion.div>

				<motion.div 
					initial={{ opacity: 0, y: 50 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8, delay: 0.2 }}
					className="w-full flex justify-center"
				>
				<Card className="max-w-6xl" cardClassName="hover:shadow-cyan-500/20 hover:shadow-2xl hover:scale-102 transition-all duration-500" title="Comprehensive Dashboard" titleClassName="text-cyan-400">
					<div className="grid md:grid-cols-2 gap-12 items-center">
						<div className="space-y-6">
							<p className="text-lg text-neutral-300 leading-relaxed">
								Your command center. Manage your profile, view your saved "liked" locations, and access detailed analytics about your choices.
							</p>
							<div className="flex items-center gap-4 text-neutral-400">
								<LayoutDashboard className="text-cyan-400" />
								<span>Centralized control for all your data</span>
							</div>
						</div>
						<div className="relative h-80 w-130 bg-neutral-900 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
							<div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-800/50 text-center">
								<img src={dashboard}/>
							</div>
						</div>
					</div>
				</Card>
				</motion.div>
			</div>

			<div className="relative z-10 py-24 bg-neutral-900/80 border-t border-white/5 backdrop-blur-sm">
				<div className="max-w-7xl mx-auto px-6">
					<div className="text-center mb-16">
						<h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Built With Modern Tech</h2>
						<p className="text-neutral-400">Leveraging the best tools for performance and scalability.</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						<div className="bg-neutral-800/30 p-8 rounded-3xl border border-white/5 hover:bg-neutral-800/50 transition-all duration-300 group">
							<div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
								<Code className="w-6 h-6 text-cyan-400" />
							</div>
							<h3 className="text-xl font-bold text-white mb-3">Frontend</h3>
							<p className="text-neutral-400 leading-relaxed">
								Crafted with <span className="text-cyan-300">React 19</span> and <span className="text-cyan-300">TypeScript</span>.
								Animations powered by <span className="text-cyan-300">Framer Motion</span> for a fluid user experience. Integrating <span className="text-cyan-300">Tailwind CSS</span> library for high customizability.
							</p>
						</div>

						<div className="bg-neutral-800/30 p-8 rounded-3xl border border-white/5 hover:bg-neutral-800/50 transition-all duration-300 group">
							<div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
								<Database className="w-6 h-6 text-purple-400" />
							</div>
							<h3 className="text-xl font-bold text-white mb-3">Backend</h3>
							<p className="text-neutral-400 leading-relaxed">
								Robust <span className="text-purple-300">Python Flask</span> server handling API requests, authentication, and data management.
							</p>
						</div>

						<div className="bg-neutral-800/30 p-8 rounded-3xl border border-white/5 hover:bg-neutral-800/50 transition-all duration-300 group">
							<div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
								<Globe className="w-6 h-6 text-cyan-400" />
							</div>
							<h3 className="text-xl font-bold text-white mb-3">Maps & Data</h3>
							<p className="text-neutral-400 leading-relaxed">
								Integrated <span className="text-cyan-400">TomTom API</span> for world-class mapping, geocoding, and traffic data visualization.
							</p>
						</div>
					</div>
				</div>
			</div>

			<div className="relative z-10 py-12 border-t border-white/5 text-center">
				<p className="text-neutral-400 font-mono text-sm">
					FBLA Coding & Programming 2025-26 • LUMINX Project
				</p>
			</div>
		</Body>
	);
};

export default Home
