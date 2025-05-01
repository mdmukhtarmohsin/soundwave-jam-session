
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Music, Plus } from 'lucide-react';
import { toast } from "@/components/ui/sonner";
import Header from '@/components/Header';
import JamRoomCard, { JamRoomCardProps } from '@/components/JamRoomCard';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/context/AuthContext';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('my-rooms');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [myRooms, setMyRooms] = useState<JamRoomCardProps[]>([]);
  const [joinedRooms, setJoinedRooms] = useState<JamRoomCardProps[]>([]);
  
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomBpm, setNewRoomBpm] = useState('120');
  const [newRoomKey, setNewRoomKey] = useState('C Maj');
  const [newRoomIsPrivate, setNewRoomIsPrivate] = useState(true);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { getJamRooms, createJamRoom } = useSupabase();

  // Load jam rooms
  useEffect(() => {
    loadJamRooms();
  }, []);

  const loadJamRooms = async () => {
    setIsLoading(true);
    try {
      const rooms = await getJamRooms();
      
      // Filter rooms into "my rooms" and "joined rooms"
      const myRooms = rooms
        .filter(room => room.host_id === user?.id)
        .map(room => ({
          id: room.id,
          title: room.title,
          host: room.host?.name || 'You',
          isHost: true,
          bpm: room.bpm,
          key: room.key,
          isPrivate: room.is_private,
          loopCount: room.tracks?.length || 0,
          createdAt: room.created_at
        }));
      
      // For now, joined rooms are other public rooms (this would be improved with a room_members table)
      const joinedRooms = rooms
        .filter(room => !room.is_private && room.host_id !== user?.id)
        .map(room => ({
          id: room.id,
          title: room.title,
          host: room.host?.name || 'Unknown',
          isHost: false,
          bpm: room.bpm,
          key: room.key,
          isPrivate: room.is_private,
          loopCount: room.tracks?.length || 0,
          createdAt: room.created_at
        }));
      
      setMyRooms(myRooms);
      setJoinedRooms(joinedRooms);
    } catch (error) {
      console.error('Failed to load jam rooms:', error);
      toast.error('Failed to load jam rooms');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    try {
      if (!newRoomTitle.trim()) {
        toast.error('Please enter a room title');
        return;
      }
      
      const room = await createJamRoom({
        title: newRoomTitle,
        bpm: parseInt(newRoomBpm) || 120,
        key: newRoomKey,
        is_private: newRoomIsPrivate
      });
      
      if (room) {
        toast.success('Jam room created successfully');
        setIsCreateDialogOpen(false);
        navigate(`/jam/${room.id}`);
      }
    } catch (error) {
      console.error('Failed to create jam room:', error);
      toast.error('Failed to create jam room');
    }
  };

  return (
    <div className="min-h-screen bg-soundboard-dark text-white">
      <Header isAuthenticated={true} />
      
      <div className="pt-24 pb-16 px-4 md:px-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Your Jam Sessions</h1>
            <p className="text-white/60">Create, join and manage your music rooms</p>
          </div>
          
          <Button 
            className="mt-4 md:mt-0 bg-soundboard-primary hover:bg-soundboard-primary/80 flex items-center gap-1"
            onClick={() => setIsCreateDialogOpen(true)}
          >
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
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="flex flex-col items-center">
                  <div className="animate-pulse mb-4">Loading...</div>
                </div>
              </div>
            ) : myRooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myRooms.map((room) => (
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
                <Button 
                  className="bg-soundboard-primary hover:bg-soundboard-primary/80 flex items-center gap-2"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus size={16} />
                  <span>Create Jam Room</span>
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="joined-rooms">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="flex flex-col items-center">
                  <div className="animate-pulse mb-4">Loading...</div>
                </div>
              </div>
            ) : joinedRooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {joinedRooms.map((room) => (
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
      
      {/* Create Room Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-soundboard-dark text-white border-white/10">
          <DialogHeader>
            <DialogTitle>Create New Jam Room</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="title">Room Title</Label>
              <Input 
                id="title" 
                value={newRoomTitle} 
                onChange={(e) => setNewRoomTitle(e.target.value)} 
                className="bg-black/40 border-white/10 text-white"
                placeholder="My Awesome Jam"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bpm">BPM</Label>
                <Input 
                  id="bpm" 
                  type="number"
                  value={newRoomBpm} 
                  onChange={(e) => setNewRoomBpm(e.target.value)}
                  className="bg-black/40 border-white/10 text-white"
                  min={40}
                  max={240}
                />
              </div>
              
              <div>
                <Label htmlFor="key">Key</Label>
                <Select value={newRoomKey} onValueChange={setNewRoomKey}>
                  <SelectTrigger className="bg-black/40 border-white/10 text-white">
                    <SelectValue placeholder="Select key" />
                  </SelectTrigger>
                  <SelectContent className="bg-soundboard-dark border-white/10">
                    <SelectItem value="C Maj">C Major</SelectItem>
                    <SelectItem value="A Min">A Minor</SelectItem>
                    <SelectItem value="G Maj">G Major</SelectItem>
                    <SelectItem value="E Min">E Minor</SelectItem>
                    <SelectItem value="D Maj">D Major</SelectItem>
                    <SelectItem value="B Min">B Minor</SelectItem>
                    <SelectItem value="F Maj">F Major</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="privacy">Private Room</Label>
              <Switch 
                id="privacy"
                checked={newRoomIsPrivate} 
                onCheckedChange={setNewRoomIsPrivate}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(false)}
              className="border-white/10"
            >
              Cancel
            </Button>
            <Button 
              className="bg-soundboard-primary hover:bg-soundboard-primary/80"
              onClick={handleCreateRoom}
            >
              Create Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
