
import { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music, Mic, Download, Clock } from 'lucide-react';
import Header from '@/components/Header';

const Profile = () => {
  const [activeTab, setActiveTab] = useState('stats');
  
  // Mock user data
  const userData = {
    name: 'Alex Johnson',
    username: 'alexjams',
    roomsHosted: 8,
    loopsRecorded: 36,
    mixdownsExported: 12,
    avgLoopsPerSession: 4.5,
    recentActivity: [
      { id: '1', action: 'Created room', roomName: 'Funk Session #3', timestamp: '2 hours ago' },
      { id: '2', action: 'Recorded loop', trackName: 'Bass Groove', roomName: 'Funk Session #3', timestamp: '2 hours ago' },
      { id: '3', action: 'Exported mixdown', roomName: 'Jazz Experiments', timestamp: '1 day ago' },
    ],
  };

  return (
    <div className="min-h-screen bg-soundboard-dark text-white">
      <Header isAuthenticated={true} />
      
      <div className="pt-24 pb-16 px-4 md:px-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Profile Header */}
          <div className="flex-shrink-0 flex flex-col items-center">
            <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-soundboard-primary">
              <AvatarFallback className="bg-soundboard-secondary text-2xl">
                {userData.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-1 text-center md:text-left">{userData.name}</h1>
            <p className="text-white/60 mb-4 text-center md:text-left">@{userData.username}</p>
            
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
                      <div className="text-2xl font-bold">{userData.roomsHosted}</div>
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
                      <div className="text-2xl font-bold">{userData.loopsRecorded}</div>
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
                      <div className="text-2xl font-bold">{userData.mixdownsExported}</div>
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
                      <div className="text-2xl font-bold">{userData.avgLoopsPerSession}</div>
                      <p className="text-sm text-white/60">Avg. Loops per Session</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="activity">
                <div className="space-y-3">
                  {userData.recentActivity.map((item) => (
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
                              {item.timestamp}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
