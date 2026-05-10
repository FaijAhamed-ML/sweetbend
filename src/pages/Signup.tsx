import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { getAuthErrorMessage } from '../lib/authErrors';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, User, Phone, ArrowRight, LogIn } from 'lucide-react';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: name });
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name,
        email,
        personalPhone: phone,
        role: 'customer',
        createdAt: new Date(),
      });
      
      navigate('/');
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      
      // Check if profile exists
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          uid: user.uid,
          name: user.displayName || 'New User',
          email: user.email,
          role: user.email === 'faijgroups@gmail.com' ? 'admin' : 'customer',
          createdAt: new Date(),
        });
      }
      
      navigate('/');
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
          <h2 className="text-3xl font-bold tracking-tight mb-3 text-bento-accent-dark">New Membership</h2>
          <p className="text-bento-muted text-[10px] font-bold uppercase tracking-widest text-center">Register your consumer profile</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-bento-danger/10 border border-bento-danger/20 text-bento-danger text-[10px] font-bold uppercase tracking-widest rounded-2xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup}>
          <div className="space-y-4 mb-10">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-bento-muted mb-2 px-1">Legal Name</label>
              <input 
                type="text"
                className="w-full px-6 py-3.5 bg-bento-bg border border-bento-border rounded-2xl focus:ring-1 focus:ring-bento-accent outline-none transition-all text-sm font-medium"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-bento-muted mb-2 px-1">Email Endpoint</label>
              <input 
                type="email"
                className="w-full px-6 py-3.5 bg-bento-bg border border-bento-border rounded-2xl focus:ring-1 focus:ring-bento-accent outline-none transition-all text-sm font-medium"
                placeholder="Electronic Mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-bento-muted mb-2 px-1">Telecom Number</label>
              <input 
                type="tel"
                className="w-full px-6 py-3.5 bg-bento-bg border border-bento-border rounded-2xl focus:ring-1 focus:ring-bento-accent outline-none transition-all text-sm font-medium"
                placeholder="Primary Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-bento-muted mb-2 px-1">Credential Key</label>
              <input 
                type="password"
                className="w-full px-6 py-3.5 bg-bento-bg border border-bento-border rounded-2xl focus:ring-1 focus:ring-bento-accent outline-none transition-all text-sm font-medium"
                placeholder="Access Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full py-5 bg-bento-accent-dark text-white rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-black transition-all disabled:opacity-50 shadow-lg shadow-black/10"
          >
            {loading ? "Registering..." : "Initialize Profile"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
          
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-bento-border"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
              <span className="px-4 bg-white text-bento-muted">Or Register with</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full py-5 bg-white border border-bento-border text-bento-accent-dark rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-bento-bg transition-all disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            Google Authentication
          </button>
        </form>

        <div className="mt-10 pt-10 border-t border-bento-border text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-bento-muted">
            Existing Member? <Link to="/login" className="text-bento-accent-dark hover:underline font-black ml-2">Authenticate</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
