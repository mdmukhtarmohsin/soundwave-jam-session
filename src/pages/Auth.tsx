
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { Music } from 'lucide-react';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';

type AuthMode = 'login' | 'signup';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>(
    (searchParams.get('mode') as AuthMode) || 'login'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlMode = searchParams.get('mode') as AuthMode;
    if (urlMode && (urlMode === 'login' || urlMode === 'signup')) {
      setMode(urlMode);
    }
    
    // Check if user is already logged in
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate('/dashboard');
      }
    };
    
    checkSession();
  }, [searchParams, navigate]);

  // Set up auth state change listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          navigate('/dashboard');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (mode === 'signup') {
        // Sign up the user
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || email.split('@')[0],
            }
          }
        });
        
        if (error) throw error;
        
        toast.success('Account created successfully! Please verify your email.');
      } else {
        // Log in the user
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) throw error;
        
        toast.success('Logged in successfully!');
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      setError(error.message || 'An error occurred during authentication');
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      
      if (error) throw error;
    } catch (error: any) {
      console.error('OAuth error:', error);
      toast.error(error.message || 'Failed to authenticate with provider');
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-soundboard-dark text-white">
      <Header />
      
      <div className="flex items-center justify-center min-h-screen px-4 py-20">
        <div className="w-full max-w-md">
          <Card className="glass-morphism border-white/10">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-center mb-4">
                <div className="w-10 h-10 rounded-lg bg-soundboard-primary/20 flex items-center justify-center">
                  <Music size={20} className="text-soundboard-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-center">
                {mode === 'login' ? 'Welcome back' : 'Create an account'}
              </CardTitle>
              <CardDescription className="text-center text-white/60">
                {mode === 'login'
                  ? 'Enter your credentials to access your account'
                  : 'Fill in your details to create a SoundBoard account'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-md text-white text-sm">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">Display Name</label>
                    <Input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-black/40 border-white/10 text-white placeholder:text-white/40"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">Email</label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-black/40 border-white/10 text-white placeholder:text-white/40"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">Password</label>
                  <Input
                    type="password"
                    placeholder={mode === 'login' ? '••••••••' : 'Create a password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-black/40 border-white/10 text-white placeholder:text-white/40"
                  />
                </div>
                
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-soundboard-primary hover:bg-soundboard-primary/80 mt-4"
                >
                  {isSubmitting ? 'Processing...' : mode === 'login' ? 'Login' : 'Create Account'}
                </Button>
              </form>
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-secondary px-2 text-white/60">or continue with</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="border-white/10 hover:bg-white/5"
                  onClick={() => handleOAuthLogin('google')}
                >
                  Google
                </Button>
                <Button 
                  variant="outline" 
                  className="border-white/10 hover:bg-white/5"
                  onClick={() => handleOAuthLogin('github')}
                >
                  GitHub
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col">
              <div className="text-center text-sm text-white/60 mt-2">
                {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button 
                  type="button" 
                  onClick={toggleMode} 
                  className="text-soundboard-primary hover:underline"
                >
                  {mode === 'login' ? 'Sign up' : 'Log in'}
                </button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;
