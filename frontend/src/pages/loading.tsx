import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Body from '../components/body';

const Landing = () => {
	return (
		<Body className="fixed backdrop-blur-[400px] flex items-center justify-center overflow-hidden">
			<motion.div
				initial={{ opacity: 0.1, y: 100 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 1.5 }}
				className="flex-col">
				<div className="p-16  bg-transparent flex flex-col items-center gap-4 lg:gap-8">
					<h1 className="text-7xl z-100 tracking-wider lg:text-8xl font-bold bg-gradient-to-l from-cyan-700 via-cyan-500 to-purple-400 bg-clip-text text-transparent">
						Welcome
					</h1>
					<motion.div animate={{ opacity: [0.2, 1.1, 0.2] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
						<h1 className="text-s font-sans tracking-tighter lg:text-xl font-thin italic text-cyan-300">
							Click the Button to proceed
						</h1>
					</motion.div>
					<Link
						to="/"
						className="px-8 py-3 lg:scale-[1.0] scale-[0.8] rounded-lg bg-cyan-500 text-neutral-950 font-semibold shadow-lg shadow-cyan-700 hover:bg-cyan-400 hover:shadow-cyan-500/70 transition-all duration-200 
                    hover:shadow-2xl hover:scale-[0.87] lg:hover:scale-[1.1]"
					>
						Proceed
					</Link>
				</div>
			</motion.div>
		</Body>
	);
};

export default Landing
