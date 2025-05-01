
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music, Clock, Lock, Globe, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export interface JamRoomCardProps {
  id: string;
  title: string;
  host: string;
  isHost: boolean;
  bpm: number;
  key: string;
  isPrivate: boolean;
  loopCount: number;
  createdAt: string;
}

const JamRoomCard = ({
  id,
  title,
  host,
  isHost,
  bpm,
  key,
  isPrivate,
  loopCount,
  createdAt,
}: JamRoomCardProps) => {
  return (
    <Card className="w-full bg-secondary border-white/10 overflow-hidden animate-slide-up transition-all duration-300 hover:shadow-lg hover:shadow-soundboard-primary/10">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1 text-xs text-white/60">
                <User size={12} />
                <span>{host}</span>
              </div>
              {isHost && (
                <Badge className="bg-soundboard-primary text-xs font-normal py-0 h-4">Host</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            {isPrivate ? (
              <Badge variant="outline" className="border-white/20 flex items-center gap-1 h-6">
                <Lock size={12} />
                <span>Private</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="border-white/20 flex items-center gap-1 h-6">
                <Globe size={12} />
                <span>Public</span>
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-4 my-3">
          <div className="flex items-center gap-1 text-sm text-white/70">
            <span className="font-mono font-medium">{bpm}</span>
            <span className="text-xs text-white/50">BPM</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-white/70">
            <Music size={14} />
            <span>{key}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-white/70">
            <span className="font-medium">{loopCount}</span>
            <span className="text-xs text-white/50">Loops</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-white/50">
          <Clock size={12} />
          <span>Created {createdAt}</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Link to={`/jam/${id}`} className="w-full">
          <Button className="w-full bg-soundboard-primary hover:bg-soundboard-primary/80 transition-colors">
            Enter Room
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default JamRoomCard;
