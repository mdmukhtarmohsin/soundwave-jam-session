import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Music, Play, Users, Download, Rocket, LogIn } from "lucide-react";
import Header from "@/components/Header";
import WaveformVisualizer from "@/components/WaveformVisualizer";

const Index = () => {
  return (
    <div className="min-h-screen bg-soundboard-dark text-white">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-soundboard-dark via-soundboard-dark/95 to-soundboard-dark z-10"></div>
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_rgba(155,135,245,0.15)_0%,_rgba(30,35,44,0)_60%)]"></div>
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              <span className="text-gradient-primary">Create. Loop. Jam.</span>
              <span className="block mt-2">Together.</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto">
              The collaborative music creation platform for jammers, loopers and
              music makers
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link to="/auth?mode=signup">
              <Button className="bg-soundboard-primary hover:bg-soundboard-primary/80 text-white px-8 py-6 text-lg rounded-lg transition-transform duration-200 ease-in-out hover:scale-105 flex items-center gap-2">
                <Rocket size={20} />
                Get Started
              </Button>
            </Link>
            <Link to="/auth?mode=login">
              <Button
                variant="outline"
                className="border-white/10 hover:bg-white/5 px-8 py-6 text-lg rounded-lg transition-transform duration-200 ease-in-out hover:scale-105 flex items-center gap-2"
              >
                <LogIn size={20} />
                Login
              </Button>
            </Link>
          </div>

          <div className="mt-20 flex justify-center">
            <WaveformVisualizer />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-soundboard-dark/0 to-black/40">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            How SoundBoard Works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass-morphism p-6 rounded-xl transition-transform duration-200 ease-in-out hover:scale-105">
              <div className="w-14 h-14 rounded-full bg-soundboard-primary/20 flex items-center justify-center mb-4">
                <Music size={28} className="text-soundboard-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Jam Rooms</h3>
              <p className="text-white/70">
                Host private or public rooms for your music sessions. Set BPM,
                key, and invite collaborators.
              </p>
            </div>

            <div className="glass-morphism p-6 rounded-xl transition-transform duration-200 ease-in-out hover:scale-105">
              <div className="w-14 h-14 rounded-full bg-soundboard-primary/20 flex items-center justify-center mb-4">
                <Play size={28} className="text-soundboard-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Record Loops</h3>
              <p className="text-white/70">
                Capture audio directly from your browser. Mix, arrange, and play
                back loops in real-time.
              </p>
            </div>

            <div className="glass-morphism p-6 rounded-xl transition-transform duration-200 ease-in-out hover:scale-105">
              <div className="w-14 h-14 rounded-full bg-soundboard-primary/20 flex items-center justify-center mb-4">
                <Users size={28} className="text-soundboard-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Collaborate Live</h3>
              <p className="text-white/70">
                Work together with musicians worldwide. See who's online and
                create music in real-time.
              </p>
            </div>
          </div>

          <div className="text-center mt-16">
            <Link to="/auth?mode=signup">
              <Button className="bg-soundboard-primary hover:bg-soundboard-primary/80 text-white">
                Start Jamming Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <Music size={20} className="text-soundboard-primary mr-2" />
            <span className="text-lg font-semibold text-gradient-primary">
              SoundBoard
            </span>
          </div>

          <div className="flex gap-6">
            <a href="#" className="text-sm text-white/60 hover:text-white/90">
              About
            </a>
            <a href="#" className="text-sm text-white/60 hover:text-white/90">
              Privacy
            </a>
            <a href="#" className="text-sm text-white/60 hover:text-white/90">
              Terms
            </a>
            <a href="#" className="text-sm text-white/60 hover:text-white/90">
              Contact
            </a>
          </div>

          <div className="mt-4 md:mt-0 text-sm text-white/60">
            &copy; {new Date().getFullYear()} SoundBoard
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
