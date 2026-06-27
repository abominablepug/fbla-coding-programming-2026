
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
			<Alerts />
			<ProactiveAlerts />
			<ThemeToggle />
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
