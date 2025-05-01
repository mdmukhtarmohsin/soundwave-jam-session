
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Music, Plus } from 'lucide-react';
import Header from '@/components/Header';
import JamRoomCard, { JamRoomCardProps } from '@/components/JamRoomCard';

// Mocked jam room data
const mockMyRooms: JamRoomCardProps[] = [
  {
    id: '1',
    title: 'Funk Session #3',
    host: 'You',
    isHost: true,
    bpm: 110,
    key: 'C Min',
    isPrivate: true,
    loopCount: 8,
    createdAt: '2 hours ago',
  },
  {
    id: '2',
    title: 'Jazz Experiments',
    host: 'You',
    isHost: true,
    bpm: 90,
    key: 'D Maj',
    isPrivate: false,
    loopCount: 5,
    createdAt: '1 day ago',
  },
];

const mockJoinedRooms: JamRoomCardProps[] = [
  {
    id: '3',
    title: 'Ambient Chill',
    host: 'MusicMaker42',
    isHost: false,
    bpm: 80,
    key: 'A Min',
    isPrivate: false,
    loopCount: 12,
    createdAt: '3 hours ago',
  },
];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('my-rooms');

  return (
    <div className="min-h-screen bg-soundboard-dark text-white">
      <Header isAuthenticated={true} />
      
      <div className="pt-24 pb-16 px-4 md:px-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Your Jam Sessions</h1>
            <p className="text-white/60">Create, join and manage your music rooms</p>
          </div>
          
          <Button className="mt-4 md:mt-0 bg-soundboard-primary hover:bg-soundboard-primary/80 flex items-center gap-1">
            <Plus size={16} />
            <span>Create Jam Room</span>
          </Button>
        </div>
        
        <Tabs defaultValue="my-rooms" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 bg-black/20 mb-8">
            <TabsTrigger 
              value="my-rooms" 
              className="data-[state=active]:bg-soundboard-primary data-[state=active]:text-white"
            >
              My Jam Rooms
            </TabsTrigger>
            <TabsTrigger 
              value="joined-rooms"
              className="data-[state=active]:bg-soundboard-primary data-[state=active]:text-white"
            >
              Joined Rooms
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-rooms">
            {mockMyRooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockMyRooms.map((room) => (
                  <JamRoomCard key={room.id} {...room} />
                ))}
              </div>
            ) : (
              <div className="glass-morphism py-16 px-6 rounded-xl flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-soundboard-primary/20 flex items-center justify-center mb-4">
                  <Music size={24} className="text-soundboard-primary" />
                </div>
                <h3 className="text-xl font-medium mb-2">No jam sessions yet</h3>
                <p className="text-white/60 mb-6 max-w-md">Create your first jam room to start making music with friends</p>
                <Button className="bg-soundboard-primary hover:bg-soundboard-primary/80 flex items-center gap-2">
                  <Plus size={16} />
                  <span>Create Jam Room</span>
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="joined-rooms">
            {mockJoinedRooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockJoinedRooms.map((room) => (
                  <JamRoomCard key={room.id} {...room} />
                ))}
              </div>
            ) : (
              <div className="glass-morphism py-16 px-6 rounded-xl flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-soundboard-primary/20 flex items-center justify-center mb-4">
                  <Music size={24} className="text-soundboard-primary" />
                </div>
                <h3 className="text-xl font-medium mb-2">No joined rooms yet</h3>
                <p className="text-white/60 mb-6 max-w-md">You haven't joined any jam rooms yet. Find public rooms to collaborate with others.</p>
                <Button className="bg-soundboard-primary hover:bg-soundboard-primary/80">
                  Explore Public Rooms
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
