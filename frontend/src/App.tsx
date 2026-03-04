import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from './pages/login';
import Landing from "./pages/loading";
import Home from "./pages/home";
import Map from "./pages/map";
import Register from "./pages/register";
import Dashboard from "./pages/dashboard";
import TinderPage from "./pages/tinder";
import Coupons from "./pages/coupons";
import Alerts from "./components/alerts";
import ReviewsPage from "./pages/reviews";


function App() {
	return (
		<BrowserRouter>
			<Alerts />
			<Routes>
				<Route path="/login" element={<Login />} />
				<Route path="/register" element={<Register />} />
				<Route path="/loading" element={<Landing />} />
				<Route path="/" element={<Home />} />
				<Route path="/map" element={<Map />} />
				<Route path="/dashboard" element={<Dashboard />} />
				<Route path="/tinder" element={<TinderPage/>} />
				<Route path="/reviews" element={<ReviewsPage />} />
				<Route path="/welcome" element={<Landing/>} />
				<Route path="/discount" element={<Coupons/>} />
			</Routes>
		</BrowserRouter>
	);
}

export default App
