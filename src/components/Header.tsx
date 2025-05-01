
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Music } from "lucide-react";

interface HeaderProps {
  isAuthenticated?: boolean;
}

const Header = ({ isAuthenticated = false }: HeaderProps) => {
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
          <Button variant="outline" className="border-white/10 hover:bg-white/5 transition-colors">
            <Link to="/dashboard">My Rooms</Link>
          </Button>
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
