import {motion} from 'framer-motion';
import { Link } from 'react-router-dom';

const Landing =()=>{
    return(
        <div className="min-h-screen w-full fixed bg-neutral-900 flex items-center justify-center overflow-hidden">
            <motion.div initial={{opacity: 0.4, y:0}} animate={{opacity:1, y:0}} transition={{duration: 2.0}} className="fixed lg:w-[1200px] h-[500px] w-[600px] -z-0 rounded-full">
                <div className="absolute bottom-[-500px] w-full h-full bg-gradient-to-t from-cyan-700/70 via-cyan-500/70 to-purple-400/70 blur-[160px] rounded-full" />
            </motion.div>
            <motion.div initial={{opacity: 0.3, y:0}} animate={{opacity:1, y:0}} transition={{duration: 2.0}} className="fixed lg:w-[900px] h-[500px] w-[500px] -z-0 rounded-full">
                <div className="absolute lg:top-[-520px] top-[-420px] w-full h-full bg-gradient-to-b from-cyan-700/40 via-cyan-500/40 to-purple-400/40 blur-[120px] rounded-full" />
            </motion.div>
            <motion.div 
                initial={{ opacity: 0.1, y: 100 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.5 }} 
                className="flex-col">  
            <div className="p-16 bg-transparent flex flex-col items-center gap-4 lg:gap-8">
                <h1 className="text-7xl tracking-wider lg:text-8xl font-bold bg-gradient-to-l from-cyan-700 via-cyan-500 to-purple-400 bg-clip-text text-transparent">
                    Welcome
                </h1>
                <motion.div animate={{opacity:[0.2, 1.1, 0.2]}} transition={{duration:2.5, repeat:Infinity, ease:"easeInOut"}}>
                    <h1 className="text-s font-sans tracking-tighter lg:text-xl font-thin italic text-cyan-300">
                        Click the Button to proceed
                    </h1>
                </motion.div>
                <Link 
                to="/Home" 
                className="px-8 py-3 lg:scale-[1.0] scale-[0.8] rounded-lg bg-blue-400 text-orange-50 font-semibold shadow-lg shadow-blue-800 hover:bg-sky-400 hover:shadow-blue-500/85 transition-all duration-200 
                    hover:shadow-2xl hover:scale-[0.87] lg:hover:scale-[1.1]"
                >
                    Proceed
                </Link>
            </div>
            </motion.div>
        </div>
        
    );
};

export default Landing