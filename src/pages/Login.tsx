import { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getAuthErrorMessage } from '../lib/authErrors';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, ArrowRight, UserPlus, LogIn, CheckCircle, RefreshCw } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Recovery link dispatched to your inbox. Please check your mail.');
      setIsReset(false);
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-bento-bg">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white p-12 rounded-[40px] shadow-sm border border-bento-border"
      >
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight mb-3 text-bento-accent-dark">
            {isReset ? 'Access Recovery' : 'Member Sign In'}
          </h2>
          <p className="text-bento-muted text-xs font-bold uppercase tracking-widest">
            {isReset ? 'Retrieve your digital credentials' : 'Authenticate to continue your session'}
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-bento-danger/10 border border-bento-danger/20 text-bento-danger text-[10px] font-bold uppercase tracking-widest rounded-2xl text-center flex items-center justify-center gap-2">
            <RefreshCw className="w-3 h-3" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-8 p-4 bg-green-50 border border-green-100 text-green-600 text-[10px] font-bold uppercase tracking-widest rounded-2xl text-center flex items-center justify-center gap-2">
            <CheckCircle className="w-3 h-3" />
            {success}
          </div>
        )}

        <form onSubmit={isReset ? handleReset : handleLogin}>
          <div className="space-y-6 mb-10">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-bento-muted mb-3 px-1">Email Identifier</label>
              <div className="relative group">
                <input 
                  type="email"
                  className="w-full px-6 py-4 bg-bento-bg border border-bento-border rounded-2xl focus:ring-1 focus:ring-bento-accent outline-none transition-all text-sm font-medium"
                  placeholder="name@provider.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {!isReset && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-bento-muted mb-3 px-1">Security Key</label>
                <div className="relative group">
                  <input 
                    type="password"
                    className="w-full px-6 py-4 bg-bento-bg border border-bento-border rounded-2xl focus:ring-1 focus:ring-bento-accent outline-none transition-all text-sm font-medium"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button 
                  type="button"
                  onClick={() => setIsReset(true)}
                  className="mt-3 text-[10px] font-bold uppercase tracking-widest text-bento-muted hover:text-bento-accent transition-colors px-1"
                >
                  Lost Access? Reset Now
                </button>
              </div>
            )}
          </div>

          <button 
            disabled={loading}
            className="w-full py-5 bg-bento-accent-dark text-white rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-black transition-all disabled:opacity-50 shadow-lg shadow-black/10"
          >
            {loading ? "Authenticating..." : isReset ? "Request Link" : "Access Account"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>

          {!isReset && (
            <>
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-bento-border"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                  <span className="px-4 bg-white text-bento-muted">Or Continue With</span>
                </div>
              </div>

              <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-5 bg-white border border-bento-border text-bento-accent-dark rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-bento-bg transition-all disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                Google Authentication
              </button>
            </>
          )}
        </form>

        <div className="mt-10 pt-10 border-t border-bento-border text-center">
          {isReset ? (
            <button 
              onClick={() => setIsReset(false)}
              className="text-[10px] font-bold uppercase tracking-widest text-bento-muted hover:text-bento-accent-dark transition-colors"
            >
              Back to Verification
            </button>
          ) : (
            <p className="text-[10px] font-bold uppercase tracking-widest text-bento-muted">
              New to the shop? <Link to="/signup" className="text-bento-accent-dark hover:underline flex items-center justify-center gap-2 mt-2"><UserPlus className="w-3.5 h-3.5" /> Initialize Account</Link>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
