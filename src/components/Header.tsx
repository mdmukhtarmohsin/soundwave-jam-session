
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Music, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  isAuthenticated?: boolean;
}

const Header = ({ isAuthenticated: forcedAuth }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const isAuthenticated = forcedAuth !== undefined ? forcedAuth : !!user;

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  return (
    <header className="w-full py-4 px-6 flex items-center justify-between border-b border-white/10 bg-soundboard-dark/80 backdrop-blur-md fixed top-0 z-50">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-soundboard-primary/20 flex items-center justify-center">
          <Music size={18} className="text-soundboard-primary" />
        </div>
        <h1 className="text-xl font-bold text-gradient-primary">SoundBoard</h1>
      </Link>

      <nav className="hidden md:flex items-center gap-6">
        <Link to="/" className="text-white/80 hover:text-white transition-colors">Home</Link>
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="text-white/80 hover:text-white transition-colors">Dashboard</Link>
            <Link to="/profile" className="text-white/80 hover:text-white transition-colors">Profile</Link>
          </>
        ) : (
          <>
            <Link to="/auth" className="text-white/80 hover:text-white transition-colors">Login</Link>
          </>
        )}
      </nav>

      <div className="flex items-center gap-2">
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border border-white/10">
                  <AvatarFallback className="bg-soundboard-secondary text-white">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard" className="cursor-pointer">Dashboard</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-500 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button className="bg-soundboard-primary hover:bg-soundboard-primary/80 text-white">
            <Link to="/auth">Get Started</Link>
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;
