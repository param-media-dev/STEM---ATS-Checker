/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  ShieldCheck, 
  Cpu, 
  Calculator, 
  Beaker, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Upload,
  Loader2,
  ChevronRight,
  BarChart3,
  Award,
  Briefcase,
  GraduationCap,
  Scale,
  ExternalLink,
  Users,
  BookOpen,
  Plus,
  Trash2,
  ChevronLeft,
  LayoutDashboard,
  Code,
  Truck,
  LineChart,
  Database,
  Stethoscope,
  Box,
  TrendingUp,
  LogIn,
  LogOut,
  Crown,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeResume, ATSResult } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { auth, db, signInWithGoogle, logout, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, updateDoc } from 'firebase/firestore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ResumeEntry = {
  id: string;
  name: string;
  mode: 'text' | 'pdf';
  text: string;
  file: File | null;
};

type ResumeResult = {
  resumeId: string;
  resumeName: string;
  jdResults: ATSResult[];
};

type Domain = 'Healthcare' | 'IT' | 'Supply Chain' | 'Business Analytics';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showProModal, setShowProModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  const [step, setStep] = useState<0 | 1 | 2>(0); // 0: Domain, 1: Upload, 2: Results
  const [domain, setDomain] = useState<Domain | null>(null);
  const [resumes, setResumes] = useState<ResumeEntry[]>([
    { id: crypto.randomUUID(), name: 'Resume 1', mode: 'text', text: '', file: null }
  ]);
  const [jobDescriptions, setJobDescriptions] = useState<string[]>(['']);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });
  const [resumeResults, setResumeResults] = useState<ResumeResult[]>([]);
  const [selectedResumeIndex, setSelectedResumeIndex] = useState<number>(0);
  const [selectedJDIndex, setSelectedJDIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Check if user is paramatwork3076@gmail.com (Default Pro)
        const isUserAdmin = user.email === 'paramatwork3076@gmail.com';
        setIsAdmin(isUserAdmin);
        
        // Sync user to Firestore
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            isPro: isUserAdmin,
            createdAt: serverTimestamp()
          });
          setIsPro(isUserAdmin);
        } else {
          const data = userDoc.data();
          // If admin, ensure isPro is true in DB too if it wasn't
          if (isUserAdmin && !data.isPro) {
            await setDoc(userRef, { isPro: true }, { merge: true });
            setIsPro(true);
          } else {
            // Check if Pro is still valid based on proUntil
            const now = new Date();
            const proUntil = data.proUntil ? new Date(data.proUntil) : null;
            const isProValid = !!data.isPro && (!proUntil || proUntil > now);
            setIsPro(isProValid);
          }
        }
      } else {
        setIsPro(false);
        setIsAdmin(false);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setShowAuthModal(true);
  };

  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (authMode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await updateProfile(userCredential.user, { displayName: authName });
        // Profile sync happens in onAuthStateChanged
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setShowAuthModal(false);
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      setShowAuthModal(false);
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      reset();
      setShowAdminDashboard(false);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const fetchUsers = async () => {
    if (!isAdmin) return;
    setIsAdminLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsersList(users);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsAdminLoading(false);
    }
  };

  const toggleUserPro = async (userId: string, currentProStatus: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      // Default to 1 month if enabling
      const proUntil = !currentProStatus ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;
      await updateDoc(userRef, { 
        isPro: !currentProStatus,
        proUntil: proUntil
      });
      setUsersList(usersList.map(u => u.id === userId ? { ...u, isPro: !currentProStatus, proUntil: proUntil } : u));
    } catch (err) {
      console.error('Failed to update user Pro status:', err);
    }
  };

  const updateUserProUntil = async (userId: string, date: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { proUntil: date });
      setUsersList(usersList.map(u => u.id === userId ? { ...u, proUntil: date } : u));
    } catch (err) {
      console.error('Failed to update user Pro expiration:', err);
    }
  };

  useEffect(() => {
    if (showAdminDashboard) {
      fetchUsers();
    }
  }, [showAdminDashboard]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const addResume = () => {
    if (!isPro && resumes.length >= 1) {
      setShowProModal(true);
      return;
    }
    setResumes([...resumes, { id: crypto.randomUUID(), name: `Resume ${resumes.length + 1}`, mode: 'text', text: '', file: null }]);
  };

  const removeResume = (id: string) => {
    if (resumes.length > 1) {
      setResumes(resumes.filter(r => r.id !== id));
    }
  };

  const updateResume = (id: string, updates: Partial<ResumeEntry>) => {
    setResumes(resumes.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const handleAnalyze = async () => {
    const activeResumes = resumes.filter(r => (r.mode === 'text' && r.text.trim()) || (r.mode === 'pdf' && r.file));
    if (activeResumes.length === 0) {
      setError('Please provide at least one resume.');
      return;
    }

    const activeJDs = jobDescriptions.filter(jd => jd.trim() !== '');
    if (activeJDs.length === 0) {
      setError('Please provide at least one job description.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setIsQuotaExceeded(false);
    const totalTasks = activeResumes.length * activeJDs.length;
    setAnalysisProgress({ current: 0, total: totalTasks });
    
    try {
      const allResumeResults: ResumeResult[] = [];
      let taskCount = 0;

      for (const resume of activeResumes) {
        const jdResults: ATSResult[] = [];
        let resumeSource: { text?: string; pdfBase64?: string } = {};

        if (resume.mode === 'pdf' && resume.file) {
          const base64 = await fileToBase64(resume.file);
          resumeSource = { pdfBase64: base64 };
        } else {
          resumeSource = { text: resume.text };
        }

        for (const jd of activeJDs) {
          try {
            const result = await analyzeResume(resumeSource, jd);
            jdResults.push(result);
          } catch (err: any) {
            const errorMessage = err.message || '';
            if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
              setIsQuotaExceeded(true);
              throw new Error('API Quota Exceeded. The free tier has strict limits. Please wait a moment or use your own API key for higher limits.');
            }
            throw err;
          }
          taskCount++;
          setAnalysisProgress({ current: taskCount, total: totalTasks });
        }

        allResumeResults.push({
          resumeId: resume.id,
          resumeName: resume.name,
          jdResults
        });
      }

      setResumeResults(allResumeResults);
      setSelectedResumeIndex(0);
      setSelectedJDIndex(0);
      setStep(2);
    } catch (err: any) {
      console.error('Analysis failed:', err);
      if (!isQuotaExceeded) {
        setError(err.message || 'An unexpected error occurred during analysis.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setResumeResults([]);
    setError(null);
    setStep(0);
    setDomain(null);
    setResumes([{ id: crypto.randomUUID(), name: 'Resume 1', mode: 'text', text: '', file: null }]);
    setJobDescriptions(['']);
  };

  const addJD = () => {
    if (!isPro && jobDescriptions.length >= 1) {
      setShowProModal(true);
      return;
    }
    setJobDescriptions([...jobDescriptions, '']);
  };

  const removeJD = (index: number) => {
    if (jobDescriptions.length > 1) {
      const newJDs = [...jobDescriptions];
      newJDs.splice(index, 1);
      setJobDescriptions(newJDs);
    }
  };

  const updateJD = (index: number, value: string) => {
    const newJDs = [...jobDescriptions];
    newJDs[index] = value;
    setJobDescriptions(newJDs);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="https://auriic.co/wp-content/uploads/2026/03/Auriic_Logo-_1_-2-1.svg" 
              alt="Auriic Logo" 
              className="h-10 w-auto" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback if logo fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center text-white">
                <ShieldCheck size={20} />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                Auriic<span className="text-brand-gold">ATS</span>
              </h1>
            </div>
            {isPro && (
              <div className="flex items-center gap-1 bg-brand-gold/10 text-brand-gold px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border border-brand-gold/20">
                <Crown size={10} />
                PRO
              </div>
            )}
            {isAdmin && (
              <button 
                onClick={() => setShowAdminDashboard(!showAdminDashboard)}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border transition-all",
                  showAdminDashboard 
                    ? "bg-brand-green text-white border-brand-green" 
                    : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                )}
              >
                <ShieldCheck size={10} />
                Admin
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="h-8 w-px bg-gray-200 mx-2 hidden sm:block" />

            {isAuthLoading ? (
              <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-gray-900">{user.displayName}</p>
                  <p className="text-[10px] text-gray-400 font-medium">{user.email}</p>
                </div>
                <button onClick={handleLogout} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors" title="Logout">
                  <LogOut size={18} />
                </button>
                <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-gray-200" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-xl text-sm font-bold hover:bg-brand-green/90 transition-all shadow-sm"
              >
                <LogIn size={18} />
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {showAdminDashboard && isAdmin ? (
            <motion.div
              key="admin-dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">Admin Dashboard</h2>
                  <p className="text-gray-500">Manage user Pro subscriptions.</p>
                </div>
                <button 
                  onClick={() => setShowAdminDashboard(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                >
                  <ChevronLeft size={24} />
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <h3 className="font-bold text-gray-900">User Management</h3>
                  <button 
                    onClick={fetchUsers}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-500"
                    disabled={isAdminLoading}
                  >
                    <Loader2 className={cn("w-5 h-5", isAdminLoading && "animate-spin")} />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">User</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Expires</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {usersList.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || 'User')}`} alt={u.displayName} className="w-8 h-8 rounded-full border border-gray-200" referrerPolicy="no-referrer" />
                              <span className="text-sm font-bold text-gray-900">{u.displayName || 'Anonymous'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                          <td className="px-6 py-4">
                            {u.isPro ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-gold/10 text-brand-gold rounded-full text-[10px] font-black border border-brand-gold/20">
                                <Crown size={10} /> PRO
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full text-[10px] font-black border border-gray-200">
                                FREE
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {u.isPro && u.email !== 'paramatwork3076@gmail.com' ? (
                              <input 
                                type="date" 
                                value={u.proUntil ? u.proUntil.split('T')[0] : ''} 
                                onChange={(e) => updateUserProUntil(u.id, new Date(e.target.value).toISOString())}
                                className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-brand-green outline-none"
                              />
                            ) : (
                              <span className="text-xs text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {u.email !== 'paramatwork3076@gmail.com' && (
                              <button 
                                onClick={() => toggleUserPro(u.id, u.isPro)}
                                className={cn(
                                  "px-4 py-1.5 rounded-xl text-xs font-bold transition-all border",
                                  u.isPro 
                                    ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100" 
                                    : "bg-brand-green/10 text-brand-green border-brand-green/20 hover:bg-brand-green/20"
                                )}
                              >
                                {u.isPro ? 'Downgrade' : 'Upgrade to Pro'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : step === 0 ? (
            <motion.div
              key="domain-selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="text-center space-y-6">
                <img 
                  src="https://auriic.co/wp-content/uploads/2026/03/Auriic_Logo-_1_-2-1.svg" 
                  alt="Auriic Logo" 
                  className="h-20 w-auto mx-auto mb-4" 
                  referrerPolicy="no-referrer"
                />
                <div className="space-y-2">
                  <h2 className="text-4xl font-black text-gray-900 tracking-tight">Select Your Domain</h2>
                  <p className="text-gray-500 text-lg">Choose the industry domain to tailor the Auriic Intelligence analysis.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { id: 'Healthcare', icon: <Stethoscope size={32} />, color: 'bg-blue-500', desc: 'Clinical, Admin, & Biotech roles' },
                  { id: 'IT', icon: <Code size={32} />, color: 'bg-emerald-500', desc: 'Software, Cloud, & Cybersecurity' },
                  { id: 'Supply Chain', icon: <Truck size={32} />, color: 'bg-amber-500', desc: 'Logistics, Operations, & Procurement' },
                  { id: 'Business Analytics', icon: <LineChart size={32} />, color: 'bg-indigo-500', desc: 'Data Science, BI, & Strategy' }
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setDomain(d.id as Domain);
                      setStep(1);
                    }}
                    className="group bg-white p-8 rounded-3xl border border-gray-200 shadow-sm hover:border-brand-green hover:shadow-xl transition-all text-left flex items-start gap-6"
                  >
                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform", d.color)}>
                      {d.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{d.id}</h3>
                      <p className="text-gray-500 text-sm">{d.desc}</p>
                    </div>
                    <ChevronRight className="ml-auto mt-1 text-gray-300 group-hover:text-brand-green group-hover:translate-x-1 transition-all" size={24} />
                  </button>
                ))}
              </div>
            </motion.div>
          ) : step === 1 ? (
            <motion.div
              key="upload-stage"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              {/* Domain Header */}
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <button onClick={() => setStep(0)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h2 className="font-bold text-lg">Domain: {domain}</h2>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Step 2: Upload Resumes & JDs</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-gray-900">{resumes.length} Resumes</p>
                    <p className="text-xs font-bold text-gray-900">{jobDescriptions.length} JDs</p>
                  </div>
                  <div className="w-10 h-10 bg-brand-green/10 text-brand-green rounded-full flex items-center justify-center">
                    <Database size={20} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Resumes Column */}
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <FileText className="text-brand-green" size={20} />
                        <h2 className="font-bold text-lg">Multiple Resumes</h2>
                      </div>
                      <button 
                        onClick={addResume}
                        className="px-3 py-1.5 bg-brand-green/10 text-brand-green rounded-xl hover:bg-brand-green/20 transition-colors flex items-center gap-1.5 text-xs font-bold"
                      >
                        <Plus size={14} /> Add Resume
                      </button>
                    </div>

                    <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                      {resumes.map((resume, idx) => (
                        <div key={resume.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-200 relative group">
                          <div className="flex items-center justify-between mb-4">
                            <input 
                              type="text"
                              value={resume.name}
                              onChange={(e) => updateResume(resume.id, { name: e.target.value })}
                              className="bg-transparent font-bold text-sm text-gray-900 border-none focus:ring-0 p-0 w-2/3"
                            />
                            <div className="flex items-center gap-2">
                              <div className="flex bg-white p-1 rounded-lg border border-gray-200">
                                <button 
                                  onClick={() => updateResume(resume.id, { mode: 'text' })}
                                  className={cn(
                                    "px-2 py-0.5 text-[10px] font-bold rounded transition-all",
                                    resume.mode === 'text' ? "bg-brand-green text-white" : "text-gray-500"
                                  )}
                                >
                                  TEXT
                                </button>
                                <button 
                                  onClick={() => updateResume(resume.id, { mode: 'pdf' })}
                                  className={cn(
                                    "px-2 py-0.5 text-[10px] font-bold rounded transition-all",
                                    resume.mode === 'pdf' ? "bg-brand-green text-white" : "text-gray-500"
                                  )}
                                >
                                  PDF
                                </button>
                              </div>
                              {resumes.length > 1 && (
                                <button 
                                  onClick={() => removeResume(resume.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>

                          {resume.mode === 'text' ? (
                            <textarea
                              className="w-full h-32 p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent transition-all resize-none text-xs font-mono"
                              placeholder="Paste resume text..."
                              value={resume.text}
                              onChange={(e) => updateResume(resume.id, { text: e.target.value })}
                            />
                          ) : (
                            <div 
                              onClick={() => fileInputRefs.current[resume.id]?.click()}
                              className="w-full h-32 border-2 border-dashed border-gray-200 bg-white rounded-xl flex flex-col items-center justify-center gap-2 hover:border-brand-gold hover:bg-brand-gold/5 transition-all cursor-pointer"
                            >
                              <input 
                                type="file" 
                                ref={el => fileInputRefs.current[resume.id] = el}
                                className="hidden" 
                                accept=".pdf" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) updateResume(resume.id, { file });
                                }}
                              />
                              <Upload size={20} className="text-brand-gold" />
                              <p className="text-[10px] font-bold text-gray-700 truncate max-w-[150px]">
                                {resume.file ? resume.file.name : 'Upload PDF'}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* JDs Column */}
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Briefcase className="text-brand-green" size={20} />
                        <h2 className="font-bold text-lg">Multiple Job Descriptions</h2>
                      </div>
                      <button 
                        onClick={addJD}
                        className="px-3 py-1.5 bg-brand-green/10 text-brand-green rounded-xl hover:bg-brand-green/20 transition-colors flex items-center gap-1.5 text-xs font-bold"
                      >
                        <Plus size={14} /> Add JD
                      </button>
                    </div>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                      {jobDescriptions.map((jd, index) => (
                        <div key={index} className="relative group">
                          <div className="absolute -left-3 top-4 w-6 h-6 bg-white rounded-full flex items-center justify-center text-[10px] font-bold text-gray-400 border border-gray-200 shadow-sm z-10">
                            {index + 1}
                          </div>
                          <textarea
                            className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-green focus:border-transparent transition-all resize-none text-xs font-mono"
                            placeholder={`Paste job description #${index + 1}...`}
                            value={jd}
                            onChange={(e) => updateJD(index, e.target.value)}
                          />
                          {jobDescriptions.length > 1 && (
                            <button 
                              onClick={() => removeJD(index)}
                              className="absolute top-3 right-3 p-1.5 bg-white/90 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 shadow-sm border border-red-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Card */}
                  <div className="bg-brand-green rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
                    <div className="relative z-10">
                      <h3 className="text-xl font-bold mb-2">Auriic Intelligence</h3>
                      <p className="text-brand-white/70 text-sm mb-6">
                        Analyzing {resumes.length} resumes against {jobDescriptions.length} job descriptions in the <span className="text-brand-gold font-bold">{domain}</span> domain.
                      </p>
                      
                      <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="w-full py-4 bg-brand-gold text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-brand-gold/90 transition-all disabled:opacity-50 shadow-lg active:scale-[0.98]"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="animate-spin" size={20} />
                            Processing {analysisProgress.current}/{analysisProgress.total}
                          </>
                        ) : (
                          <>
                            Start Cross-Analysis
                            <ArrowRight size={20} />
                          </>
                        )}
                      </button>

                      {error && (
                        <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-100 text-xs flex items-start gap-2">
                          <AlertCircle size={16} className="shrink-0 mt-0.5" />
                          <p>{error}</p>
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result-stage"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8 pb-20"
            >
              {/* Results Navigation Bar */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Back Button & Title */}
                  <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex-1">
                    <button 
                      onClick={reset}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div>
                      <h2 className="font-bold text-lg">Auriic Intelligence Report</h2>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                        Domain: {domain} • {resumeResults.length} Resumes • {jobDescriptions.length} JDs
                      </p>
                    </div>
                  </div>
                </div>

                {/* Selectors Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Resume Selector */}
                  <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Select Resume</p>
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                      {resumeResults.map((res, idx) => (
                        <button
                          key={res.resumeId}
                          onClick={() => setSelectedResumeIndex(idx)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border",
                            selectedResumeIndex === idx 
                              ? "bg-brand-green text-white border-brand-green shadow-md scale-105"
                              : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"
                          )}
                        >
                          {res.resumeName}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* JD Selector */}
                  <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Select Job Description</p>
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                      {resumeResults[selectedResumeIndex]?.jdResults.map((jdRes, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedJDIndex(idx)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border",
                            selectedJDIndex === idx 
                              ? (jdRes.requires_us_clearance_or_citizenship ? "bg-red-600 text-white border-red-700 shadow-md scale-105" : "bg-brand-green text-white border-brand-green shadow-md")
                              : (jdRes.requires_us_clearance_or_citizenship ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100")
                          )}
                        >
                          <LayoutDashboard size={14} />
                          JD #{idx + 1}
                          {jdRes.requires_us_clearance_or_citizenship && <ShieldCheck size={12} className="ml-1" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {(() => {
                const result = resumeResults[selectedResumeIndex]?.jdResults[selectedJDIndex];
                if (!result) return null;
                
                return (
                  <div className="space-y-8">
                    {/* Restricted Access Warning Banner */}
                    {result.requires_us_clearance_or_citizenship && (
                      <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-600 text-white p-6 rounded-2xl shadow-lg border-2 border-red-700 flex flex-col md:flex-row items-center gap-6"
                      >
                        <div className="bg-white/20 p-4 rounded-full">
                          <ShieldCheck size={48} className="text-white" />
                        </div>
                        <div className="text-center md:text-left">
                          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-3 leading-none">
                            Restricted Role Detected
                          </h2>
                          <p className="text-base md:text-xl font-bold text-red-50 opacity-95 leading-tight max-w-2xl">
                            This position explicitly requires <span className="bg-white text-red-600 px-1 rounded">US Citizenship (USC)</span>, 
                            <span className="bg-white text-red-600 px-1 rounded"> Green Card (GC)</span>, or specific 
                            <span className="bg-white text-red-600 px-1 rounded"> Security Clearances</span>.
                          </p>
                        </div>
                        <motion.div 
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="shrink-0 bg-white text-red-600 px-6 py-3 rounded-xl font-black text-lg uppercase tracking-widest shadow-inner"
                        >
                          Action Required
                        </motion.div>
                      </motion.div>
                    )}

                    {/* Results Top Bar */}
                    <div className={cn(
                      "flex items-center justify-between bg-white p-4 rounded-2xl border shadow-sm transition-colors",
                      result.requires_us_clearance_or_citizenship ? "border-red-200 bg-red-50/30" : "border-gray-200"
                    )}>
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                          result.requires_us_clearance_or_citizenship ? "bg-red-100 text-red-600" : "bg-brand-green/10 text-brand-green"
                        )}>
                          {result.requires_us_clearance_or_citizenship ? <ShieldCheck size={20} /> : <Search size={20} />}
                        </div>
                        <div>
                          <h3 className={cn(
                            "font-bold text-lg",
                            result.requires_us_clearance_or_citizenship ? "text-red-900" : "text-gray-900"
                          )}>
                            Analysis for {resumeResults[selectedResumeIndex]?.resumeName} vs JD #{selectedJDIndex + 1}
                          </h3>
                          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
                            Mode: {result.mode === 'with_jd' ? 'Weighted Match' : 'Independent Evaluation'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tighter",
                          result.resume_strength_level === 'Excellent' ? "bg-emerald-100 text-emerald-700" :
                          result.resume_strength_level === 'Strong' ? "bg-blue-100 text-blue-700" :
                          result.resume_strength_level === 'Moderate' ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {result.resume_strength_level}
                        </div>
                      </div>
                    </div>

                    {/* Main Dashboard Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Score Card */}
                      <div className={cn(
                        "bg-white rounded-2xl border p-8 shadow-sm flex flex-col items-center justify-center relative overflow-hidden transition-colors",
                        result.requires_us_clearance_or_citizenship ? "border-red-200" : "border-gray-200"
                      )}>
                        <div className="absolute top-4 left-4 text-gray-300"><Calculator size={40} /></div>
                        <h3 className={cn(
                          "text-sm font-bold uppercase tracking-widest mb-6",
                          result.requires_us_clearance_or_citizenship ? "text-red-500" : "text-gray-400"
                        )}>ATS Readiness Score</h3>
                        {result.mode === 'with_jd' && (
                          <div className={cn(
                            "absolute top-4 right-4 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter border",
                            result.requires_us_clearance_or_citizenship 
                              ? "bg-red-100 text-red-600 border-red-200" 
                              : "bg-brand-gold/10 text-brand-gold border-brand-gold/20"
                          )}>
                            Role Weighted
                          </div>
                        )}
                        <div className="relative w-48 h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { value: result.ats_score },
                                  { value: 100 - result.ats_score }
                                ]}
                                innerRadius={60}
                                outerRadius={80}
                                startAngle={90}
                                endAngle={450}
                                dataKey="value"
                              >
                                <Cell fill={result.requires_us_clearance_or_citizenship ? "#DC2626" : "#027A68"} />
                                <Cell fill="#F3F4F6" />
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={cn(
                              "text-5xl font-black",
                              result.requires_us_clearance_or_citizenship ? "text-red-600" : "text-gray-900"
                            )}>{result.ats_score}</span>
                            <span className="text-xs font-bold text-gray-400">/ 100</span>
                          </div>
                        </div>
                        <div className="mt-6 text-center">
                          <p className="text-sm text-gray-600 font-medium">
                            {result.ats_score >= 80 ? 'Highly Competitive' : 
                             result.ats_score >= 60 ? 'Moderately Competitive' : 
                             'Requires Optimization'}
                          </p>
                        </div>
                      </div>

                      {/* Key Metrics */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <MetricCard 
                          icon={<BarChart3 size={20} />}
                          label="Keyword Match"
                          value={result.keyword_match_percentage ? `${result.keyword_match_percentage}%` : 'N/A'}
                          description="Relevance to industry standards & JD keywords."
                          variant={result.requires_us_clearance_or_citizenship ? 'red' : 'green'}
                        />
                        <MetricCard 
                          icon={<Award size={20} />}
                          label="Technical Depth"
                          value={result.technical_depth_level}
                          description="Evaluation of technical stack complexity."
                          variant={result.requires_us_clearance_or_citizenship ? 'red' : 'green'}
                        />
                        <MetricCard 
                          icon={<Briefcase size={20} />}
                          label="Experience"
                          value={`${result.experience_years_detected} Years`}
                          description={`Career Level: ${result.career_progression_level}`}
                          variant={result.requires_us_clearance_or_citizenship ? 'red' : 'green'}
                        />
                        <MetricCard 
                          icon={<GraduationCap size={20} />}
                          label="Education"
                          value={result.education_level_detected}
                          description={result.education_match ? "Matches requirements" : "Review needed"}
                          variant={result.requires_us_clearance_or_citizenship ? 'red' : 'green'}
                        />
                      </div>
                    </div>

                    {/* Recruiter Simulation Engine */}
              <div className={cn(
                "bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors",
                result.requires_us_clearance_or_citizenship ? "border-red-200" : "border-gray-200"
              )}>
                <div className={cn(
                  "p-6 border-b bg-gray-50/50",
                  result.requires_us_clearance_or_citizenship ? "border-red-100 bg-red-50/30" : "border-gray-100"
                )}>
                  <div className="flex items-center gap-2">
                    <Users className={result.requires_us_clearance_or_citizenship ? "text-red-600" : "text-brand-green"} size={20} />
                    <h3 className={cn("font-bold", result.requires_us_clearance_or_citizenship ? "text-red-900" : "text-gray-900")}>Recruiter Simulation Engine</h3>
                    <span className={cn(
                      "ml-auto text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                      result.requires_us_clearance_or_citizenship ? "bg-red-600 text-white" : "bg-brand-gold/10 text-brand-gold"
                    )}>AI Persona Active</span>
                  </div>
                </div>
                <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">First Impression</h4>
                      <p className="text-sm text-gray-700 font-medium italic leading-relaxed">
                        "{result.analytics.recruiter_simulation.first_impression}"
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Perceived Seniority</h4>
                      <div className="inline-flex items-center px-3 py-1 bg-brand-green text-white rounded-full text-xs font-bold">
                        {result.analytics.recruiter_simulation.perceived_seniority}
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={cn(
                      "p-4 rounded-xl border",
                      result.requires_us_clearance_or_citizenship ? "bg-red-50/50 border-red-100" : "bg-emerald-50/50 border-emerald-100"
                    )}>
                      <h4 className={cn(
                        "text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2",
                        result.requires_us_clearance_or_citizenship ? "text-red-700" : "text-emerald-700"
                      )}>
                        <CheckCircle2 size={14} /> Green Flags
                      </h4>
                      <ul className="space-y-2">
                        {result.analytics.recruiter_simulation.green_flags.map((flag, i) => (
                          <li key={i} className={cn(
                            "text-xs flex items-start gap-2",
                            result.requires_us_clearance_or_citizenship ? "text-red-800" : "text-emerald-800"
                          )}>
                            <span className={cn(
                              "mt-1 w-1 h-1 rounded-full shrink-0",
                              result.requires_us_clearance_or_citizenship ? "bg-red-400" : "bg-emerald-400"
                            )} />
                            {flag}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-red-50/50 border border-red-100 p-4 rounded-xl">
                      <h4 className="text-xs font-bold text-red-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <AlertCircle size={14} /> Red Flags
                      </h4>
                      <ul className="space-y-2">
                        {result.analytics.recruiter_simulation.red_flags.map((flag, i) => (
                          <li key={i} className="text-xs text-red-800 flex items-start gap-2">
                            <span className="mt-1 w-1 h-1 bg-red-400 rounded-full shrink-0" />
                            {flag}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Skill Gap Learning Path */}
              <div className="grid grid-cols-1 gap-8">
                <div className={cn(
                  "bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors",
                  result.requires_us_clearance_or_citizenship ? "border-red-200" : "border-gray-200"
                )}>
                  <div className={cn(
                    "p-6 border-b flex items-center gap-2",
                    result.requires_us_clearance_or_citizenship ? "border-red-100 bg-red-50/30" : "border-gray-100"
                  )}>
                    <GraduationCap className={result.requires_us_clearance_or_citizenship ? "text-red-600" : "text-brand-green"} size={20} />
                    <h3 className={cn("font-bold", result.requires_us_clearance_or_citizenship ? "text-red-900" : "text-gray-900")}>Skill Gap Learning Path</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {result.analytics.skill_gap_learning_path.map((item, i) => (
                      <div key={i} className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border transition-colors",
                        result.requires_us_clearance_or_citizenship ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"
                      )}>
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shadow-sm shrink-0",
                          result.requires_us_clearance_or_citizenship ? "bg-white text-red-600" : "bg-white text-brand-gold"
                        )}>
                          <BookOpen size={20} />
                        </div>
                        <div>
                          <p className={cn(
                            "text-xs font-bold uppercase tracking-wider",
                            result.requires_us_clearance_or_citizenship ? "text-red-600" : "text-brand-green"
                          )}>{item.skill}</p>
                          <p className="text-sm font-bold text-gray-900">{item.topic}</p>
                          <p className="text-[10px] text-gray-500 font-medium">Recommended: {item.resource_type}</p>
                        </div>
                        <ArrowRight className="ml-auto text-gray-300" size={16} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Advanced Analytics Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className={cn(
                  "lg:col-span-2 bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors",
                  result.requires_us_clearance_or_citizenship ? "border-red-200" : "border-gray-200"
                )}>
                  <div className={cn(
                    "p-6 border-b flex items-center justify-between",
                    result.requires_us_clearance_or_citizenship ? "border-red-100 bg-red-50/30" : "border-gray-100"
                  )}>
                    <div className="flex items-center gap-2">
                      <BarChart3 className={result.requires_us_clearance_or_citizenship ? "text-red-600" : "text-brand-green"} size={20} />
                      <h3 className={cn("font-bold", result.requires_us_clearance_or_citizenship ? "text-red-900" : "text-gray-900")}>Skill Gap Analysis</h3>
                    </div>
                  </div>
                  <div className="p-6 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.analytics.skill_gap_analysis} layout="vertical">
                        <XAxis type="number" hide domain={[0, 100]} />
                        <YAxis 
                          dataKey="skill" 
                          type="category" 
                          width={100} 
                          tick={{ fontSize: 10, fontWeight: 600 }}
                        />
                        <Tooltip 
                          cursor={{ fill: 'transparent' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-gray-900 text-white p-2 rounded text-xs">
                                  {payload[0].value}% Gap
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="gap_score" radius={[0, 4, 4, 0]}>
                          {result.analytics.skill_gap_analysis.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={result.requires_us_clearance_or_citizenship ? '#DC2626' : (entry.gap_score > 50 ? '#C89C36' : '#027A68')} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className={cn(
                    "bg-white border p-6 rounded-2xl shadow-sm transition-colors",
                    result.requires_us_clearance_or_citizenship ? "border-red-200" : "border-gray-200"
                  )}>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Leadership Potential</h4>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center font-black text-white",
                        result.requires_us_clearance_or_citizenship ? "bg-red-600" : (
                          result.analytics.leadership_potential === 'Exceptional' ? "bg-brand-gold" :
                          result.analytics.leadership_potential === 'High' ? "bg-brand-green" :
                          "bg-gray-400"
                        )
                      )}>
                        {result.analytics.leadership_potential.charAt(0)}
                      </div>
                      <div>
                        <div className={cn("font-bold text-lg", result.requires_us_clearance_or_citizenship ? "text-red-900" : "text-gray-900")}>{result.analytics.leadership_potential}</div>
                        <p className="text-xs text-gray-500">Based on role alignment & history.</p>
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "bg-white border p-6 rounded-2xl shadow-sm transition-colors",
                    result.requires_us_clearance_or_citizenship ? "border-red-200" : "border-gray-200"
                  )}>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Tone Analysis</h4>
                    <div className={cn(
                      "text-sm font-medium italic",
                      result.requires_us_clearance_or_citizenship ? "text-red-800" : "text-gray-700"
                    )}>
                      "{result.analytics.tone_analysis}"
                    </div>
                  </div>
                </div>
              </div>

              {/* More Analytics Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard 
                  icon={<ArrowRight size={20} />}
                  label="Career Trajectory"
                  value={`${result.analytics.career_trajectory_score}%`}
                  description="Growth potential based on progression speed."
                  variant={result.requires_us_clearance_or_citizenship ? 'red' : 'green'}
                />
                <MetricCard 
                  icon={<Search size={20} />}
                  label="Industry Relevance"
                  value={`${result.analytics.industry_relevance_score}%`}
                  description="Alignment with current market demands."
                  variant={result.requires_us_clearance_or_citizenship ? 'red' : 'green'}
                />
                <MetricCard 
                  icon={<Cpu size={20} />}
                  label="Project Impact"
                  value={`${result.analytics.project_impact_score}%`}
                  description="Measurable influence of past projects."
                  variant={result.requires_us_clearance_or_citizenship ? 'red' : 'green'}
                />
              </div>

              {/* JD Matching Intelligence */}
              {result.mode === 'with_jd' && (
                <div className={cn(
                  "bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors",
                  result.requires_us_clearance_or_citizenship ? "border-red-200" : "border-gray-200"
                )}>
                  <div className={cn(
                    "p-6 border-b flex items-center gap-2",
                    result.requires_us_clearance_or_citizenship ? "border-red-100 bg-red-50/50" : "border-gray-100"
                  )}>
                    <Search className={result.requires_us_clearance_or_citizenship ? "text-red-600" : "text-brand-green"} size={20} />
                    <h3 className={cn("font-bold", result.requires_us_clearance_or_citizenship ? "text-red-900" : "text-gray-900")}>JD Matching Intelligence</h3>
                  </div>
                  <div className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Skills in JD */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <Search size={14} /> Required in JD
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {result.jd_skills?.length > 0 ? (
                            result.jd_skills.map((skill, i) => (
                              <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-[11px] font-semibold border border-gray-200">
                                {skill}
                              </span>
                            ))
                          ) : (
                            <p className="text-xs text-gray-400 italic">No specific skills extracted from JD.</p>
                          )}
                        </div>
                      </div>

                      {/* Matched Skills */}
                      <div className="space-y-4">
                        <h4 className={cn(
                          "text-xs font-bold uppercase tracking-widest flex items-center gap-2",
                          result.requires_us_clearance_or_citizenship ? "text-red-600" : "text-brand-green"
                        )}>
                          <CheckCircle2 size={14} /> Matched in Resume
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {result.matched_skills.length > 0 ? (
                            result.matched_skills.map((skill, i) => (
                              <span key={i} className={cn(
                                "px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-sm",
                                result.requires_us_clearance_or_citizenship ? "bg-red-600 text-white" : "bg-brand-green text-white"
                              )}>
                                <CheckCircle2 size={12} />
                                {skill}
                              </span>
                            ))
                          ) : (
                            <p className="text-xs text-gray-400 italic">No direct skill matches detected.</p>
                          )}
                        </div>
                      </div>

                      {/* Match Analysis */}
                      <div className={cn(
                        "p-6 rounded-xl border flex flex-col justify-center",
                        result.requires_us_clearance_or_citizenship ? "bg-red-50 border-red-200 ring-2 ring-red-100" : "bg-gray-50 border-gray-100"
                      )}>
                        <h4 className={cn(
                          "text-xs font-bold uppercase tracking-widest mb-3",
                          result.requires_us_clearance_or_citizenship ? "text-red-500" : "text-gray-400"
                        )}>Match Analysis</h4>
                        <div className="space-y-3">
                          <div className="flex items-end gap-2">
                            <span className={cn(
                              "text-4xl font-black",
                              result.requires_us_clearance_or_citizenship ? "text-red-700" : "text-brand-green"
                            )}>{result.matched_skills.length}</span>
                            <span className={cn(
                              "text-sm font-bold mb-1",
                              result.requires_us_clearance_or_citizenship ? "text-red-900" : "text-gray-500"
                            )}>/ {result.jd_skills?.length || 0} Skills Matched</span>
                          </div>
                          <p className={cn(
                            "text-sm leading-relaxed",
                            result.requires_us_clearance_or_citizenship ? "text-red-800 font-medium" : "text-xs text-gray-600"
                          )}>
                            Your resume covers <span className="font-bold">{Math.round((result.matched_skills.length / (result.jd_skills?.length || 1)) * 100)}%</span> of the required technical competencies identified in the Job Description.
                          </p>
                          {result.missing_critical_skills.length > 0 && (
                            <div className="pt-3 border-t border-gray-200">
                              <p className="text-[10px] font-bold text-red-500 uppercase tracking-tighter mb-1">Critical Gaps</p>
                              <p className="text-[10px] text-gray-500">{result.missing_critical_skills.slice(0, 3).join(', ')}{result.missing_critical_skills.length > 3 ? '...' : ''}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Skills & Compliance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Skills Analysis */}
                <div className={cn(
                  "bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors",
                  result.requires_us_clearance_or_citizenship ? "border-red-200" : "border-gray-200"
                )}>
                  <div className={cn(
                    "p-6 border-b flex items-center justify-between",
                    result.requires_us_clearance_or_citizenship ? "border-red-100 bg-red-50/30" : "border-gray-100"
                  )}>
                    <div className="flex items-center gap-2">
                      <Cpu className={result.requires_us_clearance_or_citizenship ? "text-red-600" : "text-brand-green"} size={20} />
                      <h3 className={cn("font-bold", result.requires_us_clearance_or_citizenship ? "text-red-900" : "text-gray-900")}>Competency Analysis</h3>
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Hard Skills Detected</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.hard_skills_found.map((skill, i) => (
                          <span key={i} className={cn(
                            "px-3 py-1 rounded-lg text-xs font-semibold border",
                            result.requires_us_clearance_or_citizenship 
                              ? "bg-red-50 text-red-700 border-red-100" 
                              : "bg-brand-green/10 text-brand-green border-brand-green/20"
                          )}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Soft Skills Detected</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.soft_skills_found.map((skill, i) => (
                          <span key={i} className="px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-semibold border border-gray-200">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    {result.missing_critical_skills.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">Missing Critical Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {result.missing_critical_skills.map((skill, i) => (
                            <span key={i} className="px-3 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-semibold border border-red-100">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Compliance & Science */}
                <div className="space-y-8">
                  <div className={cn(
                    "bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors",
                    result.requires_us_clearance_or_citizenship ? "border-red-200" : "border-gray-200"
                  )}>
                    <div className={cn(
                      "p-6 border-b flex items-center gap-2",
                      result.requires_us_clearance_or_citizenship ? "border-red-100 bg-red-50/30" : "border-gray-100"
                    )}>
                      <ShieldCheck className={result.requires_us_clearance_or_citizenship ? "text-red-600" : "text-emerald-600"} size={20} />
                      <h3 className={cn("font-bold", result.requires_us_clearance_or_citizenship ? "text-red-900" : "text-gray-900")}>US Compliance Check</h3>
                    </div>
                    <div className="p-6">
                      {result.us_compliance_issues.length === 0 ? (
                        <div className={cn(
                          "flex items-center gap-3 p-4 rounded-xl",
                          result.requires_us_clearance_or_citizenship ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50"
                        )}>
                          <CheckCircle2 size={24} />
                          <div>
                            <p className="font-bold text-sm">Full Compliance Detected</p>
                            <p className="text-xs opacity-80">No PII or discriminatory markers found.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {result.us_compliance_issues.map((issue, i) => (
                            <div key={i} className="flex items-center gap-3 text-amber-600 bg-amber-50 p-3 rounded-xl">
                              <AlertCircle size={18} />
                              <p className="text-sm font-medium">{issue}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={cn(
                    "bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors",
                    result.requires_us_clearance_or_citizenship ? "border-red-200" : "border-gray-200"
                  )}>
                    <div className={cn(
                      "p-6 border-b flex items-center gap-2",
                      result.requires_us_clearance_or_citizenship ? "border-red-100 bg-red-50/30" : "border-gray-100"
                    )}>
                      <Beaker className={result.requires_us_clearance_or_citizenship ? "text-red-600" : "text-brand-green"} size={20} />
                      <h3 className={cn("font-bold", result.requires_us_clearance_or_citizenship ? "text-red-900" : "text-gray-900")}>Science: Impact Analysis</h3>
                    </div>
                    <div className="p-6">
                      <div className={cn(
                        "flex items-center justify-between p-4 rounded-xl",
                        result.requires_us_clearance_or_citizenship ? "bg-red-50" : "bg-gray-50"
                      )}>
                        <div>
                          <p className={cn("text-sm font-bold", result.requires_us_clearance_or_citizenship ? "text-red-900" : "text-gray-900")}>Quantified Achievements</p>
                          <p className="text-xs text-gray-500">Evidence of measurable success (%, $, KPIs).</p>
                        </div>
                        {result.quantified_achievements_detected ? (
                          <div className={result.requires_us_clearance_or_citizenship ? "text-red-600" : "text-emerald-500"}><CheckCircle2 size={24} /></div>
                        ) : (
                          <div className="text-amber-500"><AlertCircle size={24} /></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

                {/* Suggestions */}
                <div className={cn(
                  "rounded-2xl p-8 text-white transition-colors",
                  result.requires_us_clearance_or_citizenship ? "bg-red-600" : "bg-brand-green"
                )}>
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <ChevronRight className={result.requires_us_clearance_or_citizenship ? "text-white" : "text-brand-gold"} />
                    Auriic Optimization Roadmap
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {result.improvement_suggestions.map((suggestion, i) => (
                      <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold",
                          result.requires_us_clearance_or_citizenship ? "bg-white text-red-600" : "bg-brand-gold/20 text-brand-gold"
                        )}>
                          {i + 1}
                        </div>
                        <p className="text-sm text-brand-white/90 leading-relaxed">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </motion.div>
          )}
        </AnimatePresence>

        {/* Pro Upgrade Modal */}
        <AnimatePresence>
          {showProModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowProModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 text-center space-y-6"
              >
                <div className="w-20 h-20 bg-brand-gold/10 text-brand-gold rounded-full flex items-center justify-center mx-auto">
                  <Crown size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-gray-900">Upgrade to Pro Plan</h3>
                  <p className="text-gray-500">
                    Unlock multi-resume and multi-JD analysis. Free users are limited to a single comparison.
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl space-y-3 text-left">
                  <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                    <CheckCircle2 className="text-brand-green" size={18} />
                    Unlimited Resumes
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                    <CheckCircle2 className="text-brand-green" size={18} />
                    Unlimited Job Descriptions
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                    <CheckCircle2 className="text-brand-green" size={18} />
                    Advanced Recruiter Simulation
                  </div>
                </div>
                <button 
                  onClick={() => setShowProModal(false)}
                  className="w-full py-4 bg-brand-green text-white rounded-2xl font-black shadow-lg hover:bg-brand-green/90 transition-all"
                >
                  View Pricing
                </button>
                <button 
                  onClick={() => setShowProModal(false)}
                  className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Maybe Later
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Auth Modal */}
        <AnimatePresence>
          {showAuthModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAuthModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 space-y-6"
              >
                <div className="text-center space-y-4">
                  <img 
                    src="https://auriic.co/wp-content/uploads/2026/03/Auriic_Logo-_1_-2-1.svg" 
                    alt="Auriic Logo" 
                    className="h-12 w-auto mx-auto mb-2" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-gray-900">
                      {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {authMode === 'login' ? 'Login to access your resumes' : 'Join Auriic Intelligence today'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleManualAuth} className="space-y-4">
                  {authMode === 'signup' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                      <input 
                        type="text" 
                        required
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green outline-none transition-all"
                        placeholder="John Doe"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                    <input 
                      type="email" 
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green outline-none transition-all"
                      placeholder="name@example.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
                    <input 
                      type="password" 
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>

                  {authError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[10px] font-bold flex items-center gap-2">
                      <AlertCircle size={14} />
                      {authError}
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full py-4 bg-brand-green text-white rounded-2xl font-black shadow-lg hover:bg-brand-green/90 transition-all"
                  >
                    {authMode === 'login' ? 'Login' : 'Sign Up'}
                  </button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                  <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest"><span className="bg-white px-2 text-gray-400">Or continue with</span></div>
                </div>

                <button 
                  onClick={handleGoogleLogin}
                  className="w-full py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-all shadow-sm"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                  Google Account
                </button>

                <p className="text-center text-xs font-bold text-gray-500">
                  {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
                  <button 
                    onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                    className="ml-1 text-brand-green hover:underline"
                  >
                    {authMode === 'login' ? 'Sign Up' : 'Login'}
                  </button>
                </p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <footer className="bg-white border-t border-gray-200 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <img 
            src="https://auriic.co/wp-content/uploads/2026/03/Auriic_Logo-_1_-2-1.svg" 
            alt="Auriic Logo" 
            className="h-12 w-auto mx-auto opacity-80" 
            referrerPolicy="no-referrer"
          />
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-[0.2em]">
            Connecting Ambitions With Opportunities
          </p>
        </div>
      </footer>
    </div>
  );
}

function MetricCard({ icon, label, value, description, variant = 'green' }: { icon: React.ReactNode, label: string, value: string | number, description: string, variant?: 'green' | 'red' }) {
  return (
    <div className={cn(
      "bg-white border p-6 rounded-2xl shadow-sm transition-colors",
      variant === 'red' ? "border-red-200 hover:border-red-300" : "border-gray-200 hover:border-brand-green/20"
    )}>
      <div className="flex items-center gap-3 mb-4">
        <div className={cn(
          "p-2 rounded-lg",
          variant === 'red' ? "bg-red-50 text-red-600" : "bg-brand-green/5 text-brand-green"
        )}>
          {icon}
        </div>
        <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest">{label}</h3>
      </div>
      <div className={cn(
        "text-2xl font-black mb-1",
        variant === 'red' ? "text-red-700" : "text-gray-900"
      )}>{value}</div>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}
