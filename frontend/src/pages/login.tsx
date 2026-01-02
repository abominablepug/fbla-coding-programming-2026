import { useState } from 'react';
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import { Link } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

const handleLogin = async (e:React.FormEvent)=>{
  e.preventDefault();
  const url = 'https://url'; //this is going to be where u add it eli from env file
  const payload = {
    userName: username,
    password: password
  };

  try{
    const response = await fetch(url, {
      method:'POST',
      headers: {
        'Content-Type': 'application/json'
        //add token if needed
      },
      body : JSON.stringify(payload)
    });
    if (response.ok) {
      const data = await response.json();
      console.log('Successful Login:', data);
    } else{
      console.error('Failed Login:', response.statusText);
    }
  } catch (error){
    console.error('Network error:', error);
  }
};

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <ShaderGradientCanvas 
          pixelDensity={10} 
          style={{ width: '100%', height: '100%' }}
        >
          <ShaderGradient
            animate="on"
            grain="off"
            uSpeed={0.1}        
            uStrength={1.1} 
            uDensity={0.8} 
            color2="#06b6d4"
            color3="#c084fc"
            cDistance={2.0} 
            type="waterPlane"
          />
        </ShaderGradientCanvas>
      </div>

      <div className="w-full max-w-md rounded-2xl bg-neutral-800/80 backdrop-blur-x1 p-10 shadow-10x1 border border-blue-900 mx-7">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">FBLA 25-26 Cod/Prog</h1>
          <p className="mt-2 text-slate-200">Login</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-medium text-white">Username:</label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-white placeholder-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            
            className="w-full rounded-lg bg-sky-500 py-3 font-semibold text-white hover:bg-sky-400 active:scale-[0.98] transition-all shadow-lg mb-3"
          >
            Sign In
          </button>
          <Link to="/">
            <button type="button" className="w-full rounded-lg bg-sky-500 py-3 font-semibold text-white hover:bg-sky-400 active:scale-[0.98] transition-all shadow-lg">
                Back To Home
            </button>
          </Link>
        </form>
      </div>
    </div>
  );
};

export default Login;