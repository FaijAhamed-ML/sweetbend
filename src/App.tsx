/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShoppingCart, LayoutDashboard, User as UserIcon, LogOut, Menu, X, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from './lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { AppSettings, Product } from './types';
import { collection, updateDoc, getDocs, addDoc, setDoc } from 'firebase/firestore';

// Pages (will implement next)
import CustomerHome from './pages/CustomerHome';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import POSDashboard from './pages/POSDashboard';
import Signup from './pages/Signup';
import Profile from './pages/Profile';

const queryClient = new QueryClient();

async function seedData() {
  try {
    const settingsRef = doc(db, 'settings', 'website');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, {
        logoUrl: 'https://images.unsplash.com/photo-1542841791-1925b02a2bcc?auto=format&fit=crop&q=80&w=200',
        tabIconUrl: '',
        tagline: 'A feast of taste',
        contactEmail: 'hello@sweetbend.com',
        contactPhone: '+1 (555) 123-4567',
        address: '123 Sweet Street, Candy City',
        heroTitle: 'Sweet Bend Shop',
        heroImage: 'https://images.unsplash.com/photo-1558961312-5034f3ad8988?auto=format&fit=crop&q=80&w=1920',
        promiseTitle: 'Our Promise',
        promiseText: 'Handcrafted perfection in every bite, delivered with love since 2012.',
        promiseLinkText: 'Read Our Story'
      });
    }

    const prodSnap = await getDocs(collection(db, 'products'));
    if (prodSnap.empty) {
      const prods = [
        { name: 'Gulab Jamun', price: 15, oldPrice: 18, category: 'Traditional', photoUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=800', stockLevel: 50, lowStockThreshold: 10 },
        { name: 'Rasgulla', price: 12, oldPrice: 12, category: 'Milk Based', photoUrl: 'https://images.unsplash.com/photo-1558961312-5034f3ad8988?auto=format&fit=crop&q=80&w=800', stockLevel: 40, lowStockThreshold: 10 },
        { name: 'Kaju Katli', price: 25, oldPrice: 30, category: 'Premium', photoUrl: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&q=80&w=800', stockLevel: 25, lowStockThreshold: 5 },
        { name: 'Jalebi', price: 10, oldPrice: 12, category: 'Syrup Based', photoUrl: 'https://images.unsplash.com/photo-1605333396915-47ed6b68a00e?auto=format&fit=crop&q=80&w=800', stockLevel: 100, lowStockThreshold: 15 },
      ];
      for (const p of prods) {
        await addDoc(collection(db, 'products'), p);
      }
    }
  } catch (err) {
    console.warn('Seed data skipped (likely missing permissions or already seeded)');
  }
}

function Navbar() {
  const { user, profile, isAdmin, isPOS, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const location = useLocation();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'website'), (doc) => {
      if (doc.exists()) setSettings(doc.data() as AppSettings);
    });
    return unsub;
  }, []);

  const navLinks = [
    { name: 'Shop', path: '/' },
    ...(isAdmin ? [{ name: 'Admin', path: '/admin' }] : []),
    ...(isPOS ? [{ name: 'POS', path: '/pos' }] : []),
  ];

  return (
    <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-bento-border h-16 flex items-center shrink-0">
      <div className="max-w-[1400px] w-full mx-auto px-6 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-bold text-bento-accent-dark shadow-sm ring-1 ring-black/5 overflow-hidden">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              "SB"
            )}
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-bento-accent-dark block leading-none">Sweet Bend Shop</span>
            <span className="text-[10px] text-bento-muted uppercase tracking-[0.2em] font-bold block mt-1">{settings?.tagline || "A feast of taste"}</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <div className="flex gap-6 h-full items-center text-sm font-medium text-bento-text">
            {navLinks.map((link) => (
              <Link 
                key={`desktop-nav-${link.path}`} 
                to={link.path} 
                className={`transition-all h-full flex items-center relative ${location.pathname === link.path ? 'text-bento-accent font-black' : 'hover:text-black'}`}
              >
                {link.name}
                {location.pathname === link.path && (
                  <motion.div layoutId="activeNav" className="absolute -bottom-[25px] left-0 right-0 h-1 bg-bento-accent rounded-full" />
                )}
              </Link>
            ))}
          </div>
          
          <div className="flex items-center gap-3 pl-6 border-l border-bento-border">
            {user ? (
              <div className="flex items-center gap-6">
                <Link to="/profile" className="flex items-center gap-3 group">
                  <div className="text-right leading-none">
                    <p className="text-xs font-bold text-bento-accent-dark">{profile?.name || 'User'}</p>
                    <p className="text-[10px] text-bento-muted uppercase tracking-wider mt-0.5">{profile?.role || 'Member'}</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-bento-bg border border-bento-border flex items-center justify-center group-hover:border-bento-accent transition-colors overflow-hidden">
                    <UserIcon className="w-4 h-4 text-bento-text" />
                  </div>
                </Link>
                <button 
                  onClick={() => logout()}
                  className="p-2 text-bento-muted hover:text-bento-danger transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="px-5 py-2 text-xs font-bold uppercase tracking-widest text-white bg-bento-accent-dark rounded-xl hover:bg-black transition-all">
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-md text-bento-text hover:bg-bento-bg focus:outline-none"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-bento-border shadow-xl"
          >
            <div className="px-6 py-8 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={`mobile-nav-${link.path}`}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className="block text-lg font-bold text-bento-text hover:text-bento-accent"
                >
                  {link.name}
                </Link>
              ))}
              <div className="pt-4 border-t border-bento-border space-y-3">
                <Link
                  to={user ? "/profile" : "/login"}
                  onClick={() => setIsOpen(false)}
                  className="block py-4 text-center bg-black text-white rounded-2xl font-bold uppercase tracking-widest text-sm"
                >
                  {user ? "My Profile" : "Sign In"}
                </Link>
                {user && (
                   <button
                    onClick={() => {
                      logout();
                      setIsOpen(false);
                    }}
                    className="w-full py-4 text-center bg-bento-bg text-bento-danger rounded-2xl font-bold uppercase tracking-widest text-sm border border-bento-danger/20"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function PrivateRoute({ children, role }: { children: any, role?: 'admin' | 'pos' }) {
  const { user, profile, loading } = useAuth();
  
  if (loading) return <div className="h-screen flex items-center justify-center bg-bento-bg">
    <div className="w-12 h-12 border-4 border-bento-accent border-t-transparent rounded-full animate-spin"></div>
  </div>;
  if (!user) return <Navigate to="/login" />;
  if (role === 'admin' && profile?.role !== 'admin') return <Navigate to="/" />;
  if (role === 'pos' && profile?.role !== 'pos' && profile?.role !== 'admin') return <Navigate to="/" />;
  
  return <>{children}</>;
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    seedData();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-bento-bg text-bento-text font-sans flex flex-col">
            <AppContent onPathChange={setCurrentPath} />
            <main className="flex-1 pt-16 flex flex-col overflow-hidden">
              <Routes>
                <Route path="/" element={<CustomerHome />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/profile" element={<Profile />} />
                <Route 
                   path="/admin" 
                   element={
                     <PrivateRoute role="admin">
                       <AdminDashboard />
                     </PrivateRoute>
                   } 
                />
                <Route 
                   path="/pos" 
                   element={
                     <PrivateRoute role="pos">
                       <POSDashboard />
                     </PrivateRoute>
                   } 
                />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
            
            {!['/admin', '/pos'].includes(currentPath) && (
              <footer className="h-10 bg-white border-t border-bento-border flex items-center justify-between px-8 shrink-0 text-[10px] text-bento-muted font-bold uppercase tracking-wider">
                <div className="flex gap-8">
                  <span>System Status: <span className="text-green-500">Online</span></span>
                </div>
                <div className="flex gap-4">
                  <span>© 2026 Sweet Bend Shop</span>
                </div>
              </footer>
            )}
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AppContent({ onPathChange }: { onPathChange: (path: string) => void }) {
  const location = useLocation();
  
  useEffect(() => {
    onPathChange(location.pathname);
  }, [location, onPathChange]);

  return <Navbar />;
}

