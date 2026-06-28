
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from './pages/login';
import Landing from "./pages/loading";
import Home from "./pages/home";
import Map from "./pages/map";
import Register from "./pages/register";
import Dashboard from "./pages/dashboard";
import TinderPage from "./pages/tinder";
import Coupons from "./pages/coupons";
import AdBanner from "./components/adBanner";
import Alerts from "./components/alerts";
import ProactiveAlerts from "./components/proactiveAlerts";
import ReviewsPage from "./pages/reviews";
import ResetPassword from "./pages/resetPassword";
import BusinessDashboard from "./pages/businessDashboard";
import BusinessJobManager from "./pages/businessJobManager";
import JobFinder from "./pages/jobFinder";
import JobProfile from "./pages/jobProfile";
import AdminDashboard from "./pages/adminDashboard";
import EventsBoard from "./pages/events";
import Profile from "./pages/profile";
import BusinessProfile from "./pages/businessProfile";
import ThemeToggle from "./components/ThemeToggle";


function App() {
	return (
		<BrowserRouter>
			<div className="fixed inset-0 min-h-screen w-full bg-[linear-gradient(135deg,#030712_0%,#07111f_40%,#101827_72%,#17152b_100%)] light:bg-[linear-gradient(135deg,#b9d5e3_0%,#a2c7dc_42%,#b4c9de_72%,#cbd2e8_100%)] flex items-center justify-center overflow-hidden -z-50">
				{/* Top Glow */}
				<div className="absolute inset-0 bg-gradient-to-b from-cyan-300/10 to-transparent light:from-cyan-600/25 pointer-events-none" />
				{/* Overlay Layer */}
				<div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(103,232,249,0.07)_32%,transparent_48%,rgba(139,92,246,0.07)_72%,transparent_100%)] opacity-80 light:opacity-55 pointer-events-none" />
				{/* Bottom Shading */}
				<div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent light:from-slate-500/15 pointer-events-none" />
			</div>
			<Alerts />
			<ProactiveAlerts />
			<ThemeToggle />
			<AdBanner />
			<Routes>
				<Route path="/login" element={<Login />} />
				<Route path="/register" element={<Register />} />
				<Route path="/loading" element={<Landing />} />
				<Route path="/" element={<Home />} />
				<Route path="/map" element={<Map />} />
				<Route path="/dashboard" element={<Dashboard />} />
				<Route path="/tinder" element={<TinderPage/>} />
				<Route path="/events" element={<EventsBoard />} />
				<Route path="/reviews" element={<ReviewsPage />} />
				<Route path="/profile" element={<Profile />} />
				<Route path="/welcome" element={<Landing/>} />
				<Route path="/discount" element={<Coupons/>} />
				<Route path="/reset-password" element={<ResetPassword />} />
				<Route path="/jobs/profile" element={<JobProfile />} />
				<Route path="/jobs/finder" element={<JobFinder />} />
				<Route path="/business/profile" element={<BusinessProfile />} />
				<Route path="/business/dashboard" element={<BusinessDashboard />} />
				<Route path="/business/jobs/new" element={<BusinessJobManager />} />
				<Route path="/business/jobs/:jobId" element={<BusinessJobManager />} />
				<Route path="/business/jobs/:jobId/edit" element={<BusinessJobManager />} />
				<Route path="/admin" element={<AdminDashboard />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App
