import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Links from '../components/links';
import Navbar from '../components/navbar';
import Card from '../components/card';
import { ArrowRight, HeartPlus, LayoutDashboard, Code, Database, Globe, X } from 'lucide-react';
import mapDisp from '../assets/mapdisp.png'; 
import findr from '../assets/findr.png'; 
import dashboard from '../assets/dashboard.png'; 
import luminxLogo from '../assets/luminx-logo.png';
import Body from '../components/body';

// Marketing homepage introducing product capabilities and navigation entry points.
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

			<div className="relative z-10 flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 text-center transition-transform">
				<div className="pointer-events-none absolute top-24 h-px w-[min(88vw,980px)] bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent light:via-cyan-700/45" />
				<motion.div initial={{ opacity: 0.5, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} >
					<div className="mb-6 flex items-center justify-center gap-0.5 md:gap-1">
						<h1 className="shrink-0 leading-none text-6xl md:text-9xl font-extrabold bg-gradient-to-r from-cyan-100 via-teal-300 to-purple-400 bg-clip-text text-transparent tracking-normal drop-shadow-[0_0_36px_rgba(103,232,249,0.24)] light:from-cyan-800 light:via-teal-700 light:to-purple-800 light:drop-shadow-[0_4px_18px_rgba(8,47,73,0.20)]">
							LuminX
						</h1>
						<div className="inline-flex h-16 w-16 shrink-0 items-center justify-center self-center md:h-32 md:w-32">
							<img src={luminxLogo} alt="LuminX logo" className="h-full w-full scale-115 object-contain drop-shadow-[0_0_24px_rgba(103,232,249,0.45)] light:drop-shadow-[0_8px_22px_rgba(8,47,73,0.24)]" />
						</div>
					</div>
				</motion.div>

				<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }} className="mb-10 max-w-3xl text-xl font-light leading-relaxed text-slate-300 md:text-2xl">
					Bringing{' '}
					<span className="mx-1 italic text-cyan-100 drop-shadow-[0_0_14px_rgba(103,232,249,0.38)]">
						light
					</span>{' '}
					to{' '}
					<span className="relative inline-flex px-1.5 text-cyan-50 drop-shadow-[0_0_10px_rgba(45,212,191,0.30)]">
						<span className="pointer-events-none absolute -inset-x-2 -inset-y-1 -z-10 rounded-full bg-cyan-300/18 blur-lg" />
						<span className="pointer-events-none absolute -inset-x-1.5 -inset-y-0.5 -z-10 rounded-full bg-purple-400/14 blur-md" />
						local businesses
					</span>
					.
					<br />
					<span className="font-normal text-teal-200">Find what shines nearby.</span>
				</motion.p>

				<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48, duration: 0.6 }} className="mb-10 grid w-full max-w-3xl grid-cols-1 gap-2 text-left sm:grid-cols-3">
					<div className="rounded-lg border border-cyan-200/12 bg-slate-950/42 px-4 py-3 backdrop-blur-xl light:border-cyan-800/25 light:bg-[#c6e1ea]">
						<p className="text-xs uppercase text-cyan-100/55 light:text-cyan-900/70">Scout</p>
						<p className="text-lg font-bold text-white">Local demand</p>
					</div>
					<div className="rounded-lg border border-cyan-200/12 bg-slate-950/42 px-4 py-3 backdrop-blur-xl light:border-cyan-800/25 light:bg-[#c6e1ea]">
						<p className="text-xs uppercase text-cyan-100/55 light:text-cyan-900/70">Compare</p>
						<p className="text-lg font-bold text-white">Live places</p>
					</div>
					<div className="rounded-lg border border-cyan-200/12 bg-slate-950/42 px-4 py-3 backdrop-blur-xl light:border-cyan-800/25 light:bg-[#c6e1ea]">
						<p className="text-xs uppercase text-cyan-100/55 light:text-cyan-900/70">Route</p>
						<p className="text-lg font-bold text-white">Fast decisions</p>
					</div>
				</motion.div>

				<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6, duration: 0.5 }} className="flex flex-wrap justify-center gap-4" >
					<Link to="/register" className="group inline-flex items-center gap-3 rounded-lg border border-cyan-100/20 bg-cyan-300/14 px-6 py-4 text-lg font-semibold text-cyan-50 shadow-[0_16px_48px_rgba(8,145,178,0.20)] transition-all hover:border-cyan-100/36 hover:bg-cyan-200/18 light:border-cyan-800/30 light:bg-[#a8d4df] light:text-slate-950">
						Get Started
						<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
					</Link>
					<Link to="/login" className="group inline-flex items-center gap-3 rounded-lg border border-white/10 bg-slate-950/58 px-10 py-4 text-lg font-semibold text-cyan-50 shadow-lg shadow-black/20 transition-all hover:border-cyan-100/24 hover:bg-slate-900/80 light:border-cyan-900/25 light:bg-slate-200 light:text-slate-950">
						Login 
						<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
					</Link>
				</motion.div>

				<motion.div onClick={()=>{document.getElementById("details")?.scrollIntoView({behavior:'smooth'});}} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 1 }} className="absolute bottom-10 flex animate-bounce flex-col items-center gap-2 text-cyan-100/58" >
					<span className="text-sm uppercase tracking-widest">Scroll to Explore</span>
					<ArrowRight className="w-4 h-4 rotate-90" />
				</motion.div>
			</div>

			<div id="details" className="relative z-10 flex flex-col items-center gap-20 px-4 py-28">
				<div className="text-center max-w-3xl">
					<h2 className="mb-6 text-4xl font-bold text-white md:text-5xl">Revolutionizing Location Scouting</h2>
					<p className="text-lg text-slate-300">
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
				<Card className="max-w-6xl" cardClassName="hover:scale-[1.01] transition-all duration-500" title="Smart Location Matching" titleClassName="text-teal-200">
					<div className="grid md:grid-cols-2 gap-12 items-center">
						<div className="space-y-6">
							<p className="text-lg text-neutral-300 leading-relaxed">
								Finding a location shouldn't be a chore. Our <span className="text-teal-300 font-bold">Smart Matching Interface</span> lets you rapidly review places with business context, ratings, and fit signals in one flow.
							</p>
							<p className="text-sm text-neutral-400 leading-relaxed">
								Each location card is designed to support quick decisions while still exposing enough detail to compare options confidently.
							</p>
							<ul className="space-y-4">
								<li className="flex items-start gap-3 rounded-lg border border-cyan-100/8 bg-white/[0.03] p-3">
									<div className="rounded-md bg-teal-300/10 p-2 text-teal-300"><HeartPlus size={20} /></div>
									<div>
										<h4 className="font-bold text-white">Swipe Right to Like</h4>
										<p className="text-sm text-neutral-400">Save strong matches to your dashboard for follow-up, routing, and review comparison.</p>
									</div>
								</li>
								<li className="flex items-start gap-3 rounded-lg border border-cyan-100/8 bg-white/[0.03] p-3">
									<div className="rounded-md bg-rose-400/10 p-2 text-rose-300"><X size={20} className="rotate-180" /></div>
									<div>
										<h4 className="font-bold text-white">Swipe Left to Pass</h4>
										<p className="text-sm text-neutral-400">Skip poor fits fast so your recommendation set stays focused and relevant.</p>
									</div>
								</li>
							</ul>
						</div>
						<div className="relative h-80 overflow-hidden rounded-lg border border-cyan-100/14 bg-slate-950 shadow-2xl shadow-cyan-950/30 group">
							<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(103,232,249,0.16),transparent_42%),linear-gradient(135deg,rgba(15,23,42,0.78),rgba(8,47,73,0.34),rgba(49,46,129,0.28))]" />
							<div className="absolute inset-0 flex flex-col items-center justify-center text-center">
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
				<Card className="max-w-6xl" cardClassName="hover:scale-[1.01] transition-all duration-500" title="Interactive Mapping" titleClassName="text-purple-300">
					<div className="grid md:grid-cols-2 gap-12 items-center">
						<div className="order-2 md:order-1 relative h-80 overflow-hidden rounded-lg border border-purple-200/14 bg-slate-950 shadow-2xl shadow-purple-950/25">
							<div className="absolute flex flex-col items-center justify-center bg-[linear-gradient(135deg,rgba(15,23,42,0.70),rgba(88,28,135,0.25))] text-center">
								<img className="-translate-y-2" src={mapDisp}/>
							</div>
						</div>
						<div className="order-1 md:order-2 space-y-6">
							<p className="text-lg text-neutral-300 leading-relaxed">
								Visualize your opportunities with our map integration powered by <span className="text-purple-400 font-bold">TomTom API</span>, including nearby POIs, navigation, and location-level context.
							</p>
							<p className="text-sm text-neutral-400 leading-relaxed">
								Built-in filters help users narrow the map view by real-world criteria, making search results faster to act on.
							</p>
							<div className="grid grid-cols-2 gap-4">
								<div className="rounded-lg border border-cyan-100/8 bg-white/[0.035] p-4">
									<h4 className="font-bold text-white mb-1">Traffic Data</h4>
									<p className="text-xs text-neutral-400">Live traffic flow for access planning and realistic travel expectations.</p>
								</div>
								<div className="rounded-lg border border-cyan-100/8 bg-white/[0.035] p-4">
									<h4 className="font-bold text-white mb-1">POI Search</h4>
									<p className="text-xs text-neutral-400">Find nearby amenities, nearby demand, and local competition quickly.</p>
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
				<Card className="max-w-6xl" cardClassName="hover:scale-[1.01] transition-all duration-500" title="Comprehensive Dashboard" titleClassName="text-cyan-200">
					<div className="grid md:grid-cols-2 gap-12 items-center">
						<div className="space-y-6">
							<p className="text-lg text-neutral-300 leading-relaxed">
								Your command center. Manage your profile, track liked and recently viewed locations, and monitor coupon activity in one place.
							</p>
							<p className="text-sm text-neutral-400 leading-relaxed">
								The dashboard surfaces key counts and organized sections so users can return to high-value places without re-searching.
							</p>
							<div className="flex items-center gap-4 text-neutral-400">
								<LayoutDashboard className="text-cyan-400" />
								<span>Centralized control for saved places, reviews, and decision history</span>
							</div>
						</div>
						<div className="relative h-80 w-130 overflow-hidden rounded-lg border border-cyan-100/14 bg-slate-950 shadow-2xl shadow-cyan-950/25">
							<div className="absolute inset-0 flex flex-col items-center justify-center bg-[linear-gradient(135deg,rgba(15,23,42,0.72),rgba(14,116,144,0.22))] text-center">
								<img src={dashboard}/>
							</div>
						</div>
					</div>
				</Card>
				</motion.div>
			</div>

			<div className="relative z-10 border-t border-cyan-100/8 bg-slate-950/50 py-24 backdrop-blur-xl light:border-cyan-900/20 light:bg-[#cfe5ee]">
				<div className="max-w-7xl mx-auto px-6">
					<div className="text-center mb-16">
						<h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">Built With Modern Tech</h2>
						<p className="text-slate-300">Leveraging the best tools for performance and scalability.</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						<div className="group rounded-lg border border-cyan-100/10 bg-slate-950/58 p-8 shadow-xl shadow-black/20 transition-all duration-300 hover:border-cyan-100/20 hover:bg-slate-900/68 light:border-cyan-900/20 light:bg-[#e3f0f6]">
							<div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-300/10 transition-transform group-hover:scale-105 light:bg-[#b9dce7]">
								<Code className="w-6 h-6 text-cyan-400" />
							</div>
							<h3 className="text-xl font-bold text-white mb-3">Frontend</h3>
							<p className="text-neutral-400 leading-relaxed">
								Crafted with <span className="text-cyan-300">React 19</span> and <span className="text-cyan-300">TypeScript</span>.
								Animations powered by <span className="text-cyan-300">Framer Motion</span> for a fluid user experience. Integrating <span className="text-cyan-300">Tailwind CSS</span> library for high customizability.
							</p>
						</div>

						<div className="group rounded-lg border border-purple-100/10 bg-slate-950/58 p-8 shadow-xl shadow-black/20 transition-all duration-300 hover:border-purple-100/20 hover:bg-slate-900/68 light:border-purple-900/20 light:bg-[#e3dcef]">
							<div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-400/10 transition-transform group-hover:scale-105 light:bg-[#cfc2e5]">
								<Database className="w-6 h-6 text-purple-400" />
							</div>
							<h3 className="text-xl font-bold text-white mb-3">Backend</h3>
							<p className="text-neutral-400 leading-relaxed">
								Robust <span className="text-purple-300">Python Flask</span> server handling API requests, authentication, and data management.
							</p>
						</div>

						<div className="group rounded-lg border border-cyan-100/10 bg-slate-950/58 p-8 shadow-xl shadow-black/20 transition-all duration-300 hover:border-cyan-100/20 hover:bg-slate-900/68 light:border-cyan-900/20 light:bg-[#e3f0f6]">
							<div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-300/10 transition-transform group-hover:scale-105 light:bg-[#b9dce7]">
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

			<div className="relative z-10 border-t border-cyan-100/8 py-12 text-center">
				<p className="font-mono text-sm text-cyan-100/50">
					FBLA Coding & Programming 2025-26 • LUMINX Project
				</p>
			</div>
		</Body>
	);
};

export default Home
