import { useEffect, useState } from 'react';

interface PublicAd {
  id: number;
  business_name: string;
  business_id: number;
  media_url: string;
  media_type: string;
  target_url: string;
}

const AdBanner = () => {
  const [ads, setAds] = useState<PublicAd[]>([]);
  const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:5173';

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/ads/public?limit=2`);
      if (response.ok) {
        const data = await response.json();
        setAds(data || []);
      }
    } catch (error) {
      console.error('Error fetching public ads:', error);
    }
  };

  if (ads.length === 0) return null;

  const getMediaUrl = (url: string) => {
    if (!url) return '';
    return url.startsWith('/') ? `${AUTH_BASE_URL}${url}` : url;
  };

  return (
    <>
      {/* Left Ad */}
      {ads[0] && (
        <div className="hidden lg:flex flex-col gap-2 p-2.5 rounded-lg border border-neutral-800" style={{
          position: 'fixed',
          left: '2vw',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '15vw',
          minWidth: '160px',
          maxWidth: '350px',
          zIndex: 40,
          backgroundColor: 'rgba(20,20,20,0.8)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
        }}>
          <p className="text-neutral-400 text-xs text-center m-0">Sponsored: {ads[0].business_name}</p>
          <a href={ads[0].target_url || '#'} target={ads[0].target_url ? "_blank" : "_self"} rel="noopener noreferrer" className="block w-full">
            {ads[0].media_type === 'video' ? (
              <video src={getMediaUrl(ads[0].media_url)} className="w-full rounded object-cover" autoPlay loop muted playsInline />
            ) : (
              <img src={getMediaUrl(ads[0].media_url)} alt="Ad" className="w-full rounded object-cover" />
            )}
          </a>
        </div>
      )}

      {/* Right Ad */}
      {ads[1] && (
        <div className="hidden lg:flex flex-col gap-2 p-2.5 rounded-lg border border-neutral-800" style={{
          position: 'fixed',
          right: '2vw',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '15vw',
          minWidth: '160px',
          maxWidth: '350px',
          zIndex: 40,
          backgroundColor: 'rgba(20,20,20,0.8)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
        }}>
          <p className="text-neutral-400 text-xs text-center m-0">Sponsored: {ads[1].business_name}</p>
          <a href={ads[1].target_url || '#'} target={ads[1].target_url ? "_blank" : "_self"} rel="noopener noreferrer" className="block w-full">
            {ads[1].media_type === 'video' ? (
              <video src={getMediaUrl(ads[1].media_url)} className="w-full rounded object-cover" autoPlay loop muted playsInline />
            ) : (
              <img src={getMediaUrl(ads[1].media_url)} alt="Ad" className="w-full rounded object-cover" />
            )}
          </a>
        </div>
      )}
    </>
  );
};

export default AdBanner;
