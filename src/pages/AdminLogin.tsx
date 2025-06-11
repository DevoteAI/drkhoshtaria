import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, User, ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const adminSession = localStorage.getItem('admin_session');
      if (adminSession) {
        try {
          const session = JSON.parse(adminSession);
          if (session && session.isAdmin && session.user?.email?.toLowerCase() === 'mamuka_khoshtaria@yahoo.com') {
            navigate('/admin');
            return;
          }
        } catch (err) {
          console.error('Invalid session format:', err);
          localStorage.removeItem('admin_session');
        }
      }

      // Also check Supabase session as fallback
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        navigate('/admin');
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Check if the provided credentials match the specific admin credentials
      // Trim whitespace to avoid issues with spaces
      const trimmedEmail = email.trim();
      const trimmedPassword = password;
      
      if (trimmedEmail.toLowerCase() === 'mamuka_khoshtaria@yahoo.com'.toLowerCase() && 
          trimmedPassword === 'Dr.Khoshtaria@') {
        console.log('Credentials match our admin credentials');
        
        // Create a custom session
        try {
          // Store the session info in localStorage
          const dummySession = {
            user: {
              id: 'admin-id',
              email: trimmedEmail,
              role: 'admin',
            },
            isAdmin: true,
            created: new Date().toISOString()
          };
          
          localStorage.setItem('admin_session', JSON.stringify(dummySession));
          console.log('Admin session created successfully');
          
          // Navigate to admin page
          navigate('/admin');
          return;
        } catch (err) {
          console.error('Error creating session:', err);
          throw new Error('Failed to create session. Please try again.');
        }
      } else {
        console.log('Credentials do not match expected values');
        throw new Error('Invalid credentials. Only authorized personnel can access the admin portal.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col relative overflow-hidden">
      {/* Neon Effect */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-cyan-400 shadow-[0_0_15px_5px_rgba(34,211,238,0.5)] z-50" />
      <motion.div
        initial={{ opacity: 0.5, width: "8rem" }}
        animate={{ opacity: 1, width: "16rem" }}
        transition={{
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="absolute top-0 left-1/2 -translate-x-1/2 z-30 h-[500px] bg-cyan-400/20 blur-[100px] rounded-full"
      />

      {/* Back button */}
      <div className="fixed top-4 left-4 z-50">
        <Link
          to="/"
          className="flex items-center text-dark-100 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back to Home
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 relative z-50">
        <div className="w-full max-w-md">
          <div className="bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-dark-700/30 shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Admin Portal</h2>
              <p className="text-dark-100">Sign in to access the admin dashboard</p>
            </div>

            {error && (
              <div className="mb-6 bg-red-900/20 border border-red-400/30 rounded-lg p-4 text-red-300 text-sm flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Authentication Error</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-cyan-400/50" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-dark-700/50 backdrop-blur-sm border border-dark-600/30 text-white placeholder-dark-300 focus:ring-2 focus:ring-cyan-400/30 focus:border-transparent transition-all duration-300"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-cyan-400/50" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="w-full pl-10 pr-12 py-3 rounded-lg bg-dark-700/50 backdrop-blur-sm border border-dark-600/30 text-white placeholder-dark-300 focus:ring-2 focus:ring-cyan-400/30 focus:border-transparent transition-all duration-300"
                  />
                  <button 
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-300 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 text-white hover:from-cyan-400 hover:to-cyan-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/50 to-cyan-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  </div>
                ) : (
                  'Sign In'
                )}
                <div className="absolute inset-0 bg-gradient-radial from-cyan-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </button>
            </form>

            {/* Credential hint */}
            <div className="mt-6 p-4 bg-dark-700/30 rounded-lg">
              <h3 className="text-cyan-300 font-semibold mb-2 text-sm">Admin Access</h3>
              <p className="text-xs text-dark-300">Only authorized personnel can access this area. Please contact the system administrator if you need access.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}