import { useEffect, useState } from 'react';
import Navbar from '../components/navbar';
import Body from '../components/body';
import { Calendar, Clock } from 'lucide-react';
import '../styles/businessDashboard.css'; // Reusing some styles or add new ones

interface PublicEvent {
  id: number;
  business_name: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  image_url: string;
}

const EventsBoard = () => {
  const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:5173';
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`${AUTH_BASE_URL}/events/public`);
        if (response.ok) {
          const data = await response.json();
          setEvents(data.events || []);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [AUTH_BASE_URL]);

  if (loading) {
    return (
      <Body>
        <Navbar page="Live Events" />
        <div className="">
          <div className="text-xl text-neutral-400">Loading events...</div>
        </div>
      </Body>
    );
  }

  return (
    <Body>
      <Navbar page="Live Events" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-teal-500 mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            Live Events & Flash Sales
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            Discover exclusive local events, flash sales, and limited-time offers from businesses around you.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-20 bg-neutral-900/50 rounded-2xl border border-neutral-800">
            <Calendar className="mx-auto h-16 w-16 text-neutral-500 mb-4" />
            <h3 className="text-xl font-semibold text-neutral-300">No active events right now</h3>
            <p className="text-neutral-500 mt-2">Check back later for new exciting events and sales!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const startDate = new Date(event.start_time);
              const endDate = new Date(event.end_time);
              
              return (
                <div key={event.id} className="group relative overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-teal-400/50 transition-all duration-300 shadow-lg hover:shadow-teal-500/20 flex flex-col">
                  {event.image_url ? (
                    <div className="h-48 overflow-hidden">
                      <img 
                        src={event.image_url} 
                        alt={event.title} 
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="h-48 bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
                      <Calendar className="h-16 w-16 text-neutral-700" />
                    </div>
                  )}
                  
                  <div className="p-6 flex-grow flex flex-col">
                    <div className="text-sm font-semibold text-teal-300 mb-2 uppercase tracking-wider">
                      {event.business_name}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 line-clamp-2">
                      {event.title}
                    </h3>
                    <p className="text-neutral-400 mb-6 flex-grow line-clamp-3">
                      {event.description}
                    </p>
                    
                    <div className="flex flex-col gap-2 pt-4 border-t border-neutral-800/50 mt-auto">
                      <div className="flex items-center text-sm text-neutral-300">
                        <Clock className="w-4 h-4 mr-2 text-pink-400" />
                        <span>Start: {startDate.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center text-sm text-neutral-400">
                        <div className="w-4 h-4 mr-2" />
                        <span>End: {endDate.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Body>
  );
};

export default EventsBoard;
