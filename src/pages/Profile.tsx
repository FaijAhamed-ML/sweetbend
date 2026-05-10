import { useAuth } from '../hooks/useAuth';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogOut, User, Phone, Mail, Shield } from 'lucide-react';

export default function Profile() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[40px] p-12 border border-gray-100 shadow-sm overflow-hidden relative"
      >
        <div className="absolute top-0 left-0 w-full h-32 bg-gray-50 -z-10" />
        
        <div className="flex flex-col md:flex-row items-end gap-8 mb-12">
          <div className="w-32 h-32 rounded-3xl bg-white border-4 border-white shadow-xl flex items-center justify-center -mt-16 text-4xl font-serif font-bold text-black ring-1 ring-gray-100">
            {profile.name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-serif font-bold text-gray-900">{profile.name}</h1>
              <span className="px-3 py-1 bg-black text-white text-[10px] font-bold uppercase rounded-full tracking-widest">{profile.role}</span>
            </div>
            <p className="text-gray-500 uppercase tracking-[0.2em] text-xs font-medium mt-1">Member since {profile.createdAt?.toDate ? profile.createdAt.toDate().getFullYear() : new Date().getFullYear()}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-12">
          <div className="space-y-6">
            <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-400 border-b border-gray-100 pb-2">Account Details</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 group">
                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-black group-hover:text-white transition-all">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Email Address</p>
                  <p className="font-medium">{profile.email || user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-black group-hover:text-white transition-all">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Phone Number</p>
                  <p className="font-medium">{profile.personalPhone || 'None added'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-black group-hover:text-white transition-all">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Security Role</p>
                  <p className="font-medium capitalize">{profile.role}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-3xl p-8 flex flex-col justify-center items-center text-center">
            <User className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Managing your preferences and account settings is easy. Keep your details updated for a better experience.
            </p>
            <button className="px-8 py-3 bg-white text-black border border-gray-200 rounded-xl font-bold text-sm hover:shadow-lg transition-all">
              Edit Account
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-10 flex justify-end">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-8 py-4 bg-red-50 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-100 transition-all shadow-sm shadow-red-100"
          >
            <LogOut className="w-5 h-5" /> Sign Out from Account
          </button>
        </div>
      </motion.div>
    </div>
  );
}
