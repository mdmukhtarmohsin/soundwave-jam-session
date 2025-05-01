
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Check } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { audioEngine } from '@/services/AudioEngine';

interface RecorderProps {
  onSaveLoop: (name: string, audioBlob: Blob) => void;
}

const Recorder: React.FC<RecorderProps> = ({ onSaveLoop }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [trackName, setTrackName] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'saving'>('idle');
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  const toggleRecording = async () => {
    if (!isRecording) {
      await startRecording();
    } else {
      await stopRecording();
    }
  };

  const startRecording = async () => {
    try {
      await audioEngine.startRecording();
      
      setIsRecording(true);
      setRecordingState('recording');
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prevTime => {
          if (prevTime >= 30) {
            if (timerRef.current) clearInterval(timerRef.current);
            stopRecording();
            return 30;
          }
          return prevTime + 1;
        });
      }, 1000);
      
      toast("Recording started", {
        description: "Max recording length: 30 seconds",
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setIsRecording(false);
    setRecordingState('saving');
    
    try {
      const audioBlob = await audioEngine.stopRecording();
      
      // Set default track name if empty
      const name = trackName || `Loop ${new Date().toLocaleTimeString()}`;
      onSaveLoop(name, audioBlob);
      
      toast.success("Loop saved", {
        description: `"${name}" added to tracks`,
      });
      
      setTrackName('');
      setRecordingState('idle');
    } catch (error) {
      console.error('Failed to save recording:', error);
      toast.error("Failed to save recording");
      setRecordingState('idle');
    }
  };

  return (
    <div className="p-6 glass-morphism rounded-xl flex flex-col">
      <h3 className="text-lg font-medium text-white mb-4">Record A Loop</h3>
      
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Input
            placeholder="Loop name"
            value={trackName}
            onChange={(e) => setTrackName(e.target.value)}
            className="bg-black/40 border-white/10 text-white placeholder:text-white/40"
            disabled={recordingState === 'recording'}
          />
          {recordingState === 'recording' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 flex items-center gap-2">
              <div className="animate-pulse">REC</div>
              <span className="font-mono">{recordingTime}s</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-center">
          {recordingState === 'saving' ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-white/60">
              <div className="animate-pulse">Processing...</div>
            </div>
          ) : (
            <Button
              onClick={toggleRecording}
              className={`rounded-full w-16 h-16 flex items-center justify-center p-0 ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-soundboard-primary hover:bg-soundboard-primary/80'
              }`}
            >
              {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
            </Button>
          )}
        </div>

        <div className="text-xs text-center text-white/50">
          {isRecording
            ? "Click to stop recording"
            : recordingState === 'saving'
            ? "Saving your loop..."
            : "Click to start recording (max 30s)"}
        </div>
      </div>
    </div>
  );
};

export default Recorder;
