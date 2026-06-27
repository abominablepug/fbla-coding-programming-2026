import { useEffect, useRef } from 'react';
import { enqueueAlert } from './alerts';

const ProactiveAlerts = () => {
    const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:5173';
    const lastCheckLoc = useRef<{ lat: number, lng: number } | null>(null);
    const alertedPlaces = useRef<Set<string>>(new Set());

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        // Haversine formula for distance in miles
        const R = 3958.8; // Radius of the Earth in miles
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    const checkProximity = async (lat: number, lng: number) => {
        if (lastCheckLoc.current) {
            const dist = calculateDistance(lat, lng, lastCheckLoc.current.lat, lastCheckLoc.current.lng);
            // Only re-check if user has moved at least 0.2 miles
            if (dist < 0.2) return;
        }
        lastCheckLoc.current = { lat, lng };

        try {
            // Fetch Favorites
            const favRes = await fetch(`${AUTH_BASE_URL}/loc/favorites`, { credentials: 'include' });
            let favorites = [];
            if (favRes.ok) {
                favorites = await favRes.json();
            }

            // Fetch Coupons
            const couponsRes = await fetch(`${AUTH_BASE_URL}/coupons/public`);
            let coupons = [];
            if (couponsRes.ok) {
                coupons = await couponsRes.json();
            }

            // Check if near a favorite place
            for (const fav of favorites) {
                if (fav.latitude && fav.longitude) {
                    const d = calculateDistance(lat, lng, fav.latitude, fav.longitude);
                    if (d < 0.3 && !alertedPlaces.current.has(`fav_${fav.lid}`)) {
                        alertedPlaces.current.add(`fav_${fav.lid}`);
                        
                        // Push notification
                        if (Notification.permission === 'granted') {
                            new Notification("You're nearby!", { body: `You are only a few blocks away from your favorite place: ${fav.name}!` });
                        }
                        enqueueAlert({ message: `You are near your favorite spot: ${fav.name}!`, textColor: 'text-emerald-300' });
                    }
                }
            }

            // Check if near a massive discount
            for (const c of coupons) {
                if (c.latitude && c.longitude) {
                    const d = calculateDistance(lat, lng, c.latitude, c.longitude);
                    if (d < 0.3 && !alertedPlaces.current.has(`coupon_${c.id}`)) {
                        alertedPlaces.current.add(`coupon_${c.id}`);
                        
                        // Push notification
                        if (Notification.permission === 'granted') {
                            new Notification("Great Deal Nearby!", { body: `${c.business_name} is offering ${c.discount_label} (${c.title}) just blocks away!` });
                        }
                        enqueueAlert({ message: `${c.business_name} has a deal nearby: ${c.discount_label}!`, textColor: 'text-cyan-300' });
                    }
                }
            }

        } catch (error) {
            console.error("Proactive alerts error:", error);
        }
    };

    useEffect(() => {
        // Requesting notification permission on mount is blocked by modern browsers.
        // It must be tied to a user interaction.
        // if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        //     Notification.requestPermission();
        // }

        if ("geolocation" in navigator) {
            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    checkProximity(position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    console.warn("Geolocation watch error:", error);
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 30000,
                    timeout: 27000
                }
            );

            return () => {
                navigator.geolocation.clearWatch(watchId);
            };
        }
    }, []);

    return null;
};

export default ProactiveAlerts;
