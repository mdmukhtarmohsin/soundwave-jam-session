
import { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music, Mic, Download, Clock } from 'lucide-react';
import Header from '@/components/Header';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/sonner';
import { formatDistanceToNow } from 'date-fns';

interface ProfileStats {
  roomsHosted: number;
  loopsRecorded: number;
  mixdownsExported: number; // This would be tracked in a real app
  avgLoopsPerSession: number;
  recentActivity: {
    id: string;
    action: string;
    roomName: string;
    trackName?: string;
    timestamp: string;
  }[];
}

const Profile = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<{ name: string; username: string } | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    roomsHosted: 0,
    loopsRecorded: 0,
    mixdownsExported: 0,
    avgLoopsPerSession: 0,
    recentActivity: []
  });
  
  const { user } = useAuth();
  const { getUserProfile, getJamRooms, getTracksByJamRoomId } = useSupabase();

  useEffect(() => {
    loadProfileAndStats();
  }, [user]);
  
  const loadProfileAndStats = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      // Load user profile
      const userProfile = await getUserProfile();
      
      if (userProfile) {
        setProfile({
          name: userProfile.name || 'User',
          username: userProfile.name?.toLowerCase().replace(/\s+/g, '') || 'user'
        });
      }
      
      // Load statistics
      const jamRooms = await getJamRooms();
      
      // My jam rooms
      const myRooms = jamRooms.filter(room => room.host_id === user.id);
      
      // Get all my tracks across all rooms
      const myTracksPromises = jamRooms.map(room => getTracksByJamRoomId(room.id));
      const tracksResults = await Promise.all(myTracksPromises);
      
      // Flatten and filter for tracks created by the current user
      const myTracks = tracksResults
        .flat()
        .filter(track => track.creator_id === user.id);
      
      // Calculate stats
      const roomsHosted = myRooms.length;
      const loopsRecorded = myTracks.length;
      
      // Calculate loops per session (if no rooms, default to 0)
      let avgLoopsPerSession = 0;
      if (roomsHosted > 0) {
        avgLoopsPerSession = Math.round((loopsRecorded / roomsHosted) * 10) / 10; // Round to 1 decimal
      }
      
      // Create recent activity
      const recentActivity = [];
      
      // Add room creation activities
      myRooms.slice(0, 3).forEach(room => {
        recentActivity.push({
          id: `room-${room.id}`,
          action: 'Created room',
          roomName: room.title,
          timestamp: room.created_at
        });
      });
      
      // Add track recording activities
      myTracks.slice(0, 5).forEach(track => {
        const room = jamRooms.find(r => r.id === track.jam_room_id);
        
        if (room) {
          recentActivity.push({
            id: `track-${track.id}`,
            action: 'Recorded loop',
            trackName: track.name,
            roomName: room.title,
            timestamp: track.created_at
          });
        }
      });
      
      // Sort by timestamp (most recent first)
      recentActivity.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      
      // Update stats
      setStats({
        roomsHosted,
        loopsRecorded,
        mixdownsExported: 0, // This would be tracked in a real app
        avgLoopsPerSession,
        recentActivity: recentActivity.slice(0, 10) // Limit to 10 items
      });
      
    } catch (error) {
      console.error('Failed to load profile data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-soundboard-dark text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-pulse mb-4">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soundboard-dark text-white">
      <Header isAuthenticated={true} />
      
      <div className="pt-24 pb-16 px-4 md:px-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Profile Header */}
          <div className="flex-shrink-0 flex flex-col items-center">
            <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-soundboard-primary">
              <AvatarFallback className="bg-soundboard-secondary text-2xl">
                {profile?.name.charAt(0) || user?.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-1 text-center md:text-left">{profile?.name || 'User'}</h1>
            <p className="text-white/60 mb-4 text-center md:text-left">@{profile?.username || 'user'}</p>
            
            <Tabs defaultValue="stats" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="grid w-full max-w-md grid-cols-2 bg-black/20 mb-8">
                <TabsTrigger 
                  value="stats" 
                  className="data-[state=active]:bg-soundboard-primary data-[state=active]:text-white"
                >
                  Stats
                </TabsTrigger>
                <TabsTrigger 
                  value="activity"
                  className="data-[state=active]:bg-soundboard-primary data-[state=active]:text-white"
                >
                  Activity
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="stats">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-secondary border-white/10">
                    <CardHeader className="pb-2 pt-4">
                      <div className="w-8 h-8 rounded-lg bg-soundboard-primary/20 flex items-center justify-center">
                        <Music size={16} className="text-soundboard-primary" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.roomsHosted}</div>
                      <p className="text-sm text-white/60">Jam Rooms Hosted</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-secondary border-white/10">
                    <CardHeader className="pb-2 pt-4">
                      <div className="w-8 h-8 rounded-lg bg-soundboard-primary/20 flex items-center justify-center">
                        <Mic size={16} className="text-soundboard-primary" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.loopsRecorded}</div>
                      <p className="text-sm text-white/60">Loops Recorded</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-secondary border-white/10">
                    <CardHeader className="pb-2 pt-4">
                      <div className="w-8 h-8 rounded-lg bg-soundboard-primary/20 flex items-center justify-center">
                        <Download size={16} className="text-soundboard-primary" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.mixdownsExported}</div>
                      <p className="text-sm text-white/60">Mixdowns Exported</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-secondary border-white/10">
                    <CardHeader className="pb-2 pt-4">
                      <div className="w-8 h-8 rounded-lg bg-soundboard-primary/20 flex items-center justify-center">
                        <Clock size={16} className="text-soundboard-primary" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.avgLoopsPerSession}</div>
                      <p className="text-sm text-white/60">Avg. Loops per Session</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="activity">
                {stats.recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recentActivity.map((item) => (
                      <div key={item.id} className="glass-morphism p-3 rounded-lg">
                        <div className="flex gap-3">
                          <div className="flex-shrink-0">
                            {item.action === 'Created room' && (
                              <div className="w-8 h-8 rounded-full bg-soundboard-primary/20 flex items-center justify-center">
                                <Music size={16} className="text-soundboard-primary" />
                              </div>
                            )}
                            {item.action === 'Recorded loop' && (
                              <div className="w-8 h-8 rounded-full bg-soundboard-primary/20 flex items-center justify-center">
                                <Mic size={16} className="text-soundboard-primary" />
                              </div>
                            )}
                            {item.action === 'Exported mixdown' && (
                              <div className="w-8 h-8 rounded-full bg-soundboard-primary/20 flex items-center justify-center">
                                <Download size={16} className="text-soundboard-primary" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <div className="font-medium">{item.action}</div>
                                <div className="text-sm text-white/60">
                                  {item.trackName ? `"${item.trackName}" in ` : ''}
                                  {item.roomName}
                                </div>
                              </div>
                              <div className="text-xs text-white/40 mt-1 sm:mt-0">
                                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="glass-morphism p-8 rounded-lg flex flex-col items-center justify-center text-center">
                    <p className="text-white/60 mb-2">No recent activity</p>
                    <p className="text-sm text-white/40">Create jam rooms or record loops to see your activity</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
