import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from './pages/login';
import Landing from "./pages/landing";
import Home from "./pages/home";
import Map from "./pages/map";
import Register from "./pages/register";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />}/>
        <Route path="/register" element={<Register />}/>
        <Route path="/" element={<Landing />}/>
        <Route path="/Home" element={<Home />}/>
        <Route path="/App" element={<Map />}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App