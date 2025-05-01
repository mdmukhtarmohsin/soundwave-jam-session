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
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  const displayName =
    user?.user_metadata?.name || user?.email?.split("@")[0] || "User";

  return (
    <header className="w-full py-3 border-b border-white/10 bg-gray-900/90 backdrop-blur-md fixed top-0 z-50">
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-soundboard-primary/20 flex items-center justify-center">
            <Music size={18} className="text-soundboard-primary" />
          </div>
          <h1 className="text-xl font-bold text-gradient-primary">
            SoundBoard
          </h1>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/"
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            Home
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/profile"
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Profile
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Login
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full"
                >
                  <Avatar className="h-9 w-9 border border-white/10">
                    <AvatarFallback className="bg-soundboard-secondary text-white">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 bg-gray-800 border-gray-700 text-white"
                align="end"
              >
                <DropdownMenuLabel className="font-normal text-white/80">
                  Signed in as
                </DropdownMenuLabel>
                <DropdownMenuLabel className="font-medium">
                  {displayName}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem
                  asChild
                  className="hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
                >
                  <Link to="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
                >
                  <Link to="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-400 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              asChild
              size="sm"
              className="bg-soundboard-primary hover:bg-soundboard-primary/80 text-white"
            >
              <Link to="/auth">Get Started</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
