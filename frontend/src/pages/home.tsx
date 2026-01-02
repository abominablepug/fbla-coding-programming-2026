import { Link } from 'react-router-dom';
import {motion, useScroll, useTransform} from 'framer-motion';

const Home=()=>{
    const {scrollY} =useScroll();
    const width = useTransform(scrollY, [0, 100], ["100%", "98%"]);
    const borderRadius = useTransform(scrollY, [0, 100], ["0px", "40px"]);
    const marginTop = useTransform(scrollY, [0, 100], ["0px", "12px"]);
    const bgColor = useTransform(scrollY, [0, 100], ["rgba(23, 23, 23, 1)", "rgba(30, 30, 30, 0.7)"]);
    return(
        <div className="min-h-screen bg-neutral-900 relative bg-neutral-00 w-full overscroll-none">

            <div className="fixed inset-0 bg-neutral-900 pointer-events-none w-full z-0 flex items-center justify-center overscroll-none">
                <motion.div initial={{opacity: 0.4, y:0}} animate={{opacity:1, y:0}} transition={{duration: 2.0}} className="fixed lg:w-[1200px] h-[500px] w-[600px] rounded-full">
                    <div className="absolute bottom-[-500px] w-full h-full bg-gradient-to-t from-cyan-700/70 via-cyan-500/70 to-purple-400/70 blur-[160px] rounded-full" />
                </motion.div>
                <motion.div initial={{opacity: 0.3, y:0}} animate={{opacity:1, y:0}} transition={{duration: 2.0}} className="fixed lg:w-[900px] h-[500px] w-[500px] rounded-full">
                    <div className="absolute lg:top-[-600px] top-[-550px] w-full h-full bg-gradient-to-b from-cyan-700/40 via-cyan-500/40 to-purple-400/40 blur-[120px] rounded-full" />
                </motion.div>
            </div>

            <div className="fixed z-50 min-w-screen pointer-events-none flex justify-center">
                <motion.div style={{width, borderRadius, marginTop, backgroundColor: bgColor}} className="px-8 flex items-center justify-between shadow-neutral-700 backdrop-blur-md pointer-events-auto shadow-md">
                    <nav className="py-5 px-5 w-full flex justify-between items-center">
                        <Link 
                            to="/" 
                            className="pointer-events-auto px-3 py-1 bg-white/10 border border-white/20 rounded-full text-white hover:bg-white/20 transition-all text-md"
                        >
                            ← Back
                        </Link>
                        <span  className="bg-gradient-to-l from-cyan-700 via-cyan-500 to-purple-400 bg-clip-text text-transparent font-bold tracking-widest text-sm md:text-lg">
                            FBLA Project 25-26
                        </span>
                        <div className="flex space-x-2">
                            <Link to="/Login"  className="pointer-events-auto px-3 py-1 rounded-full bg-blue-400 text-orange-50 shadow-lg hover:bg-sky-400 transition-all duration-200 lg:hover:scale-[1.1] text-md mr-2 ">
                                Login →
                            </Link>
                            <Link to="/Register" className="pointer-events-auto px-3 py-1 rounded-full bg-blue-400 text-orange-50 shadow-lg hover:bg-sky-400 transition-all duration-200 lg:hover:scale-[1.1] text-md">
                                Register →
                            </Link>


                        </div>
                        
                        
                    </nav>
                </motion.div>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-8 pt-32 pb-20">
                <div className="bg-neutral-800/60 p-16 rounded-3xl w-full max-w-2xl border border-white/5 backdrop-blur-sm">
                    <h1 className="text-neutral-500 text-4xl">Content 01</h1>
                </div>
                <div className="bg-neutral-800/60 p-16 rounded-3xl w-full max-w-2xl border border-white/5 backdrop-blur-sm">
                    <h1 className="text-neutral-500 text-4xl">Content 02</h1>
                </div>
            </div>  
            <div className="relative z-10 flex gap-14 justify-center items-center">
                <div className="bg-neutral-800/60 p-16 rounded-3xl w-xl max-w-lg border border-white/5 backdrop-blur-lg">
                    <h1 className="text-neutral-500 text-4xl">Content 03</h1>
                </div>{/*sidebyside*/}
                <div className="bg-neutral-800/60 p-16 rounded-3xl w-xl max-w-lg border border-white/5 backdrop-blur-sm">
                    <h1 className="text-neutral-500 text-4xl">Content 04</h1>
                </div>{/*sidebyside*/}
            </div>
            <div className="relative z-10 flex flex-col items-center gap-8 pt-20 pb-15">
                <div className="bg-neutral-800/60 p-16 rounded-3xl w-full max-w-2xl border border-white/5 backdrop-blur-sm">
                    <h1 className="text-purple-400/60 text-4xl">Content 05</h1>
                </div> 
            </div>
            <div className="relative z-10 flex flex-col border-neutral-800 border-y-2 items-center gap-8 my-9 py-15 bg-neutral-900 min-w-full">
                <div className="bg-neutral-800 p-16 rounded-3xl min-w-7xl border border-white/5 backdrop-blur-sm">
                    <h1 className="text-neutral-500 text-4xl">Content 06</h1>
                </div> {/*hoveringbar*/}
                <div className="bg-neutral-800 p-16 rounded-3xl w-full max-w-2xl border border-white/5 backdrop-blur-sm">
                    <h1 className="text-neutral-500 text-4xl">Content 07</h1>
                </div> {/*hoveringbar*/}
            </div>
            <div className="relative z-10 flex flex-col items-center gap-8 pt-15 pb-20">
                <div className="bg-neutral-800/60 p-16 rounded-3xl w-full max-w-2xl border border-white/5 backdrop-blur-sm">
                    <h1 className="text-neutral-500 text-4xl">Content 08</h1>
                </div>
            </div>
        </div>
    );
};

export default Home