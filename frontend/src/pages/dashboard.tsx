import React, { useEffect, useState } from 'react';
import { motion } from "framer-motion";
import Card from "../components/card";
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Links from '../components/links';
import { Heart, MapPin } from 'lucide-react';
import Body from '../components/body';

interface Location {
	lid: number;
	name: string;
	longitude: number;
	latitude: number;
	type: number;
	address?: string;
	categories?: string[];
	time?: string;
	visited_at?: string;
}

const Dashboard = () => {
	const [user, setUser] = useState<{ uid: string, username: string } | null>(null);
	const navigate = useNavigate();
	const [openForm, setOpenForm] = useState(false);
	const [profilePic, setProfilePic] = useState<string>();
	const [pfpChange, setPfpChange] = useState(false);
	const [password, setPassword] = useState('');
	const [currentPassword, setCurrentPassword] = useState('');
	const [pwSubmitError, setPwSubmitError] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [favoriteLocations, setFavoriteLocations] = useState<Location[]>([]);
	const [visitedLocations, setVisitedLocations] = useState<Location[]>([]);
	const [loadingFavorites, setLoadingFavorites] = useState(false);
	const [loadingVisited, setLoadingVisited] = useState(false);
	const imageSrc = `http://localhost:5173/static/profile_pictures/${profilePic}`;
	const [popup,setPopup] = useState(false);

	const fetchFavoriteLocations = async () => {
		setLoadingFavorites(true);
		try {
			const response = await fetch('http://localhost:5173/loc/favorites', {
				credentials: 'include'
			});
			if (response.ok) {
				const data = await response.json();
				setFavoriteLocations(data);
			} else {
				console.error('Failed to fetch favorite locations');
				setFavoriteLocations([]);
			}
		} catch (error) {
			console.error('Error fetching favorite locations:', error);
			setFavoriteLocations([]);
		} finally {
			setLoadingFavorites(false);
		}
	};

	const fetchVisitedLocations = async () => {
		setLoadingVisited(true);
		try {
			const response = await fetch('http://localhost:5173/loc/visited', {
				credentials: 'include'
			});
			if (response.ok) {
				const data: Location[] = await response.json();
				const unique: Location[] = [];
				const seen = new Set<number>();
				for (const loc of data) {
					if (!seen.has(loc.lid)) {
						seen.add(loc.lid);
						unique.push(loc);
					}
				}
				setVisitedLocations(unique);
			} else {
				console.error('Failed to fetch visited locations');
				setVisitedLocations([]);
			}
		} catch (error) {
			console.error('Error fetching visited locations:', error);
			setVisitedLocations([]);
		} finally {
			setLoadingVisited(false);
		}
	};

	const handleDeleteFavorite = async (locationId: number) => {
		try {
			const response = await fetch(`http://localhost:5173/loc/${locationId}/unfavorite`, {
				method: 'POST',
				credentials: 'include'
			});
			if (response.ok) {
				setFavoriteLocations(favoriteLocations.filter(loc => loc.lid !== locationId));
			} else {
				console.error('Failed to remove from favorites');
			}
		} catch (error) {
			console.error('Error removing from favorites:', error);
		}
	};

	const handleFileChange = async (formData: FormData) => {
		try {
			const response = await fetch('http://localhost:5173/auth/change_picture', {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			if (response.ok) {
				const data = await response.json();
				setProfilePic(data.profile_picture);
				setOpenForm(false);
			} else {
				console.error('Failed to upload profile picture');
			}
		} catch (error) {
			console.error('Error uploading profile picture:', error);
		}
	};

	const handlePwChange = async (formData: FormData) => {
		try {
			setPwSubmitError('');
			if (!password || !confirmPassword) {
				setPwSubmitError('Please fill in all fields.');
				return;
			}
			const response = await fetch('http://localhost:5173/auth/change_password', {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});
			if (response.ok) {
				setOpenForm(false);
				setPassword('');
				setConfirmPassword('');
				setCurrentPassword('');
				setPwSubmitError('');
			}else {
				const errorData = await response.json();
				if (errorData.message === 'Current password is incorrect') {
					setPwSubmitError('Current password is incorrect');
				} else {
					console.error('Failed to change password. Try again.');
					setPassword('');
					setConfirmPassword('');
					setCurrentPassword('');
				}}
		} catch (error) {
			console.error('Error changing password:', error);
		}
	};

	const isPasswordValid = password.length >= 8 && /\d/.test(password) && /[a-zA-Z]/.test(password);
	const doPasswordsMatch = password === confirmPassword;
	let content;
	let pop=(
		<div className="flex flex-col items-center gap-4 max-w-fit">
			<form className="flex flex-col items-center gap-4" onSubmit={(e) => {
			e.preventDefault();
			const formData = new FormData(e.currentTarget);
			handleFileChange(formData);
			}}>
				<input className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all" type="file" accept='image/png' id="image" name="image"/>
				<div className="flex justify-center gap-2">
					<button className="px-3 py-1 rounded-full bg-sky-500 text-white max-w-fit text-md transition-all hover:bg-sky-400 shadow-lg" type="submit">
						Upload New Picture
					</button>
					<button className="px-3 py-1 rounded-full bg-sky-500 text-white max-w-fit text-md transition-all hover:bg-sky-400 shadow-lg" onClick={() => {setOpenForm(false); setPwSubmitError('');}}>Close X</button>
				</div>
			</form>
		</div>

	)

	if (pfpChange) {
		content = (
		<div className="flex flex-col items-center gap-4 max-w-fit">
			<form className="flex flex-col items-center gap-4" onSubmit={(e) => {
			e.preventDefault();
			const formData = new FormData(e.currentTarget);
			handleFileChange(formData);
			}}>
				<input className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all" type="file" accept='image/png' id="image" name="image"/>
				<div className="flex justify-center gap-2">
					<button className="px-3 py-1 rounded-full bg-sky-500 text-white max-w-fit text-md transition-all hover:bg-sky-400 shadow-lg" type="submit">
						Upload New Picture
					</button>
					<button className="px-3 py-1 rounded-full bg-sky-500 text-white max-w-fit text-md transition-all hover:bg-sky-400 shadow-lg" onClick={() => {setOpenForm(false); setPwSubmitError('');}}>Close X</button>
				</div>
			</form>
		</div>);
	}else{
		content = (
		<div className="flex flex-col items-center gap-4 max-w-fit">
			<form className="flex flex-col items-center gap-4" onSubmit={(e) => {
			   e.preventDefault();
			   const formData = new FormData(e.currentTarget);
			   handlePwChange(formData);
		   	}}>
				<div>
				<label className="block text-sm font-medium text-white-400">Current Password</label>
				<input
					type="password"
					className="mt-1 w-fit rounded-lg bg-white/10 border border-white/20 p-3 text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
					placeholder="••••••••"
					value={currentPassword}
					name = "current_password"
					onChange={(e) => setCurrentPassword(e.target.value)}
				/>
				</div>
				<div>
				<label className="block text-sm font-medium text-white-400">New Password</label>
				<input
					type="password"
					className="mt-1 w-fit rounded-lg bg-white/10 border border-white/20 p-3 text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
					placeholder="••••••••"
					value={password}
					name = "new_password"
					onChange={(e) => setPassword(e.target.value)}
				/>
				{password && (
					<p className={`text-xs mt-1 ${isPasswordValid ? 'text-green-400' : 'text-red-400'}`}>
						{isPasswordValid ? 'Strong password' : 'Password must be at least 8 characters long and contain both letters and numbers.'}
					</p>
				)}
				</div>
				<div>
					<label className="block text-sm font-medium text-white-400">Confirm Password</label>
					<input
						type="password"
						className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
						placeholder="••••••••"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
					/>
					{confirmPassword && (
						<p className={`text-xs mt-1 ${doPasswordsMatch ? 'text-green-400' : 'text-red-400'}`}>
							{doPasswordsMatch ? 'Passwords match' : 'Passwords do not match'}
						</p>
					)}
				</div>
				{pwSubmitError && <p className="text-red-400 text-sm text-center">{pwSubmitError}</p>}
			   <div className="flex justify-center gap-2">
				   <button className="px-3 py-1 rounded-full bg-sky-500 text-white max-w-fit text-md transition-all hover:bg-sky-400 shadow-lg" type="submit">
					   Change Password
				   </button>
				   <button className="px-3 py-1 rounded-full bg-sky-500 text-white max-w-fit text-md transition-all hover:bg-sky-400 shadow-lg" onClick={() => {setOpenForm(false); setPwSubmitError('');}}>Close X</button>
			   </div>
			</form>
		</div>);
	}

	useEffect(() => {
		const fetchProfile = async () => {
			try {
				const response = await fetch('http://localhost:5173/auth/dashboard', {
					credentials: 'include'
				});
				if (response.ok) {
					const data = await response.json();
					setUser(data);
					setProfilePic(data.profile_picture);
				} else {
					navigate('/login');
				}
			} catch (error) {
				console.error('Error fetching profile:', error);
				navigate('/login');
			}
		};
		fetchProfile();
	}, [navigate]);

	useEffect(() => {
		if (user) {
			fetchFavoriteLocations();
			fetchVisitedLocations();
		}
	}, [user]);

	const handleLogout = async (e: React.MouseEvent) => {
		e.preventDefault();
		try {
			await fetch('http://localhost:5173/auth/logout', {
				credentials: 'include'
			});
			navigate('/');
		} catch (error) {
			console.error('Logout failed:', error);
			navigate('/');
		}
	};
	const handlePopup = () => {
		setPopup(true);
	}

	if (!user) return <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">Loading...</div>;

	return (
		<Body>
			<Navbar page="Dashboard">
				<Links link="map">
					Map <MapPin size={22} />
				</Links>
				<Links link="tinder">
					Findr <Heart size={22} />
				</Links>
				<Links link="/" onClick={handleLogout}>
					Logout →
				</Links>
			</Navbar>
			<div className="w-full relative grid gap-11 pt-28">
				<div  className="text-cyan-500/80" >
					{popup && (
						<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
							<div className="bg-neutral-800 p-6 rounded-xl border border-white/10 max-w-md w-full,align-items-center justify-items-center">
								<img  className="rounded-full border-4 w-50 h- object-cover shadow-w-auto border-cyan-600 mb-4 align-center" src={imageSrc} alt="Profile" />
								<button className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-400 transition-colors w-full" onClick={() => {setOpenForm(true); setPfpChange(false); setPopup(false);}}>Change Password</button>
								<button className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-400 transition-colors w-full" onClick={() => {setOpenForm(true); setPfpChange(true); setPopup(false);}}>Change Profile Picture</button>
								<button className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-400 transition-colors w-full" onClick={() => setPopup(false)}>Close Preview</button>
							</div>
						</div>
					)}
					<div className="grid grid-cols-1 gap-y-3 place-items-center text-center">
						<img onClick={handlePopup} className="rounded-full border-4 w-32 h-32 object-cover shadow-w-auto border-cyan-600 hover:border-cyan-700 transition-transform" src={imageSrc} alt="Profile" />
	
						<p className="text-black-400 text-xl">{user.username}</p>


						{!openForm ?
							<div className={`flex flex-wrap justify-center gap-4 mt-4 w-full`}>
								
							</div>
							 : 
							<div className={`flex flex-col items-center justify-center gap-4 mt-4 w-full`}>
							 	{content}
							</div>
						}


					</div>
				</div>
				<div style={{width:"100%",display:"flex"}} >


					<Card title='Favorite Locations:'cardClassName='w-[95%] ease-in-out hover:shadow-cyan-500/20 hover:shadow-2xl hover:scale-102 transition-all duration-500'>
                    <div className="flex flex-col gap-4 ">
                        {loadingFavorites ? (
                            <p className="text-gray-400 text-center py-4">Loading favorite locations...</p>
                        ) : favoriteLocations.length === 0 ? (
                            <p className="text-gray-400 text-center py-4">No favorite locations yet. Visit the map to add some!</p>
                        ) : (
                            favoriteLocations.map((loc, i) => (

								
								
                                <div key={i} className="bg-neutral-800/50 p-4 rounded-xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-neutral-800/80 transition-colors">
                                    <div className="flex-1 cursor-pointer" onClick={() => navigate(`/map?lat=${loc.latitude}&lon=${loc.longitude}`)}>
                                        <h3 className="text-lg font-bold text-cyan-400/80">{loc.name}</h3>
										<p className="text-gray-400 text-sm">{loc.address}</p>
										{loc.categories && loc.categories.length > 0 && (
											<p className="text-gray-500 text-xs mt-2">
												{loc.categories.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)).join(', ')}
											</p>
										)}
                                    </div>
                                    <div className="mt-2 md:mt-0 flex flex-col items-end gap-2">
                                        <button  style={{height: '40px',width:"60px",padding:"4px"}}onClick={(e) => { e.stopPropagation(); handleDeleteFavorite(loc.lid); }} className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 text-white text-sm rounded transition-colors">
                                            Delete
                                        </button>
                                    </div>
                                </div> 
                            ))
                        )}
                    </div>
                </Card>

			<Card title='Recently Visited:' cardClassName='w-[95%] ease-in-out hover:shadow-cyan-500/20 hover:shadow-2xl hover:scale-102 transition-all duration-500'>
				<div className="flex flex-col gap-4 ">
					{loadingVisited ? (
						<p className="text-gray-400 text-center py-4">Loading visited locations...</p>
					) : visitedLocations.length === 0 ? (
						<p className="text-gray-400 text-center py-4">No visited locations yet. Navigate somewhere on the map!</p>
					) : (
						visitedLocations.map((loc, i) => (
							<div key={i} className="bg-neutral-800/50 p-4 rounded-xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-neutral-800/80 transition-colors">
								<div className="flex-1 cursor-pointer" onClick={() => navigate(`/map?lat=${loc.latitude}&lon=${loc.longitude}`)}>
									<h3 className="text-lg font-bold text-cyan-400/80">{loc.name}</h3>
									<p className="text-gray-400 text-sm">{loc.address}</p>
									{loc.categories && loc.categories.length > 0 && (
										<p className="text-gray-500 text-xs mt-2">
											{loc.categories.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)).join(', ')}
										</p>
										
									)}
								</div>
							</div>
						))
					)
					}
				</div>
			</Card>



				<Card title='Coupons:'cardClassName='w-[95%] ease-in-out hover:shadow-cyan-500/20 hover:shadow-2xl hover:scale-102 transition-all duration-500'>
					 <div className="flex flex-col gap-4 ">
						<div style={{color:"white"}} className="bg-neutral-800/50 p-4 rounded-xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-neutral-800/80 transition-colors">
							<div>Coupon 1</div>
						</div>
						<div style={{color:"white"}} className="bg-neutral-800/50 p-4 rounded-xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-neutral-800/80 transition-colors">
							<div>Coupon 2</div>
						</div>
						<div style={{color:"white"}} className="bg-neutral-800/50 p-4 rounded-xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-neutral-800/80 transition-colors">
							<div>Coupon 3</div>
						</div>
						<div style={{color:"white"}} className="bg-neutral-800/50 p-4 rounded-xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-neutral-800/80 transition-colors">
							<div>Coupon 4</div>
						</div>
					</div>
      
                </Card>



				</div>


				
				
				
			</div>
		</Body>
	)
};

export default Dashboard;