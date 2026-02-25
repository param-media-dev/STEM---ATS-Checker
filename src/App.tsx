/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
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
  Key,
  ExternalLink,
  Target,
  Users,
  BookOpen,
  Linkedin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeResume, ATSResult } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeMode, setResumeMode] = useState<'text' | 'pdf'>('text');
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ATSResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(id);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleSelectKey = async () => {
    try {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setIsQuotaExceeded(false);
      setError(null);
    } catch (err) {
      console.error('Failed to open key selector:', err);
    }
  };

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

  const handleAnalyze = async () => {
    if (resumeMode === 'text' && !resumeText.trim()) {
      setError('Please provide resume text.');
      return;
    }
    if (resumeMode === 'pdf' && !resumeFile) {
      setError('Please upload a resume PDF.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setIsQuotaExceeded(false);
    try {
      let resumeSource: { text?: string; pdfBase64?: string } = {};
      
      if (resumeMode === 'pdf' && resumeFile) {
        const base64 = await fileToBase64(resumeFile);
        resumeSource = { pdfBase64: base64 };
      } else {
        resumeSource = { text: resumeText };
      }

      const data = await analyzeResume(resumeSource, jobDescription);
      setResult(data);
    } catch (err: any) {
      const errorMessage = err.message || '';
      if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
        setIsQuotaExceeded(true);
        setError('API Quota Exceeded. The free tier has strict limits. Please wait a moment or use your own API key for higher limits.');
      } else {
        setError(errorMessage || 'An error occurred during analysis.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setResumeFile(file);
      setError(null);
    } else if (file) {
      setError('Please upload a valid PDF file.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F3] text-[#1A1A1A] font-sans selection:bg-brand-green/10">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ rotate: 10 }}
              className="w-10 h-10 bg-brand-green rounded-xl flex items-center justify-center text-brand-white shadow-lg shadow-brand-green/20"
            >
              <ShieldCheck size={24} />
            </motion.div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900 flex items-center">
              Auriic<span className="text-brand-gold ml-0.5">ATS</span>
              <span className="ml-2 px-1.5 py-0.5 bg-gray-200/50 text-[10px] font-black rounded text-gray-400 uppercase tracking-tighter">Enterprise</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-2 md:gap-6">
            <div className="hidden lg:flex items-center gap-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              <span className="flex items-center gap-1.5 hover:text-brand-green cursor-default transition-colors"><Beaker size={14} /> Science</span>
              <span className="flex items-center gap-1.5 hover:text-brand-green cursor-default transition-colors"><Cpu size={14} /> Tech</span>
              <span className="flex items-center gap-1.5 hover:text-brand-green cursor-default transition-colors"><Scale size={14} /> Engineering</span>
              <span className="flex items-center gap-1.5 hover:text-brand-green cursor-default transition-colors"><Calculator size={14} /> Math</span>
            </div>

            {result && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shadow-md"
              >
                <ArrowRight className="rotate-180" size={14} />
                <span className="hidden sm:inline">New Analysis</span>
              </motion.button>
            )}

            <button 
              onClick={handleSelectKey}
              className="p-2.5 hover:bg-brand-green/5 text-brand-green rounded-xl transition-all flex items-center gap-2 border border-brand-green/10 hover:border-brand-green/30"
              title="Select API Key"
            >
              <Key size={18} />
              <span className="hidden sm:inline text-xs font-bold">API Key</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="input-stage"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              {/* Left Column: Inputs */}
              <div className="space-y-6">
                <div className="bento-card p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-green/10 text-brand-green rounded-xl flex items-center justify-center">
                        <FileText size={22} />
                      </div>
                      <div>
                        <h2 className="font-bold text-xl">Resume Content</h2>
                        <p className="text-xs text-gray-400">Upload or paste your professional history</p>
                      </div>
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                      <button 
                        onClick={() => setResumeMode('text')}
                        className={cn(
                          "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                          resumeMode === 'text' ? "bg-brand-white text-brand-green shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                      >
                        Text
                      </button>
                      <button 
                        onClick={() => setResumeMode('pdf')}
                        className={cn(
                          "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                          resumeMode === 'pdf' ? "bg-brand-white text-brand-green shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                      >
                        PDF
                      </button>
                    </div>
                  </div>

                  {resumeMode === 'text' ? (
                    <div className="relative group">
                      <textarea
                        className="w-full h-72 p-5 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-brand-green/5 focus:border-brand-green transition-all resize-none text-sm font-mono leading-relaxed"
                        placeholder="Paste resume text here..."
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                      />
                      {resumeText && (
                        <button 
                          onClick={() => setResumeText('')}
                          className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur border border-gray-200 rounded-lg text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <AlertCircle size={14} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-72 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-5 hover:border-brand-gold hover:bg-brand-gold/5 transition-all cursor-pointer group relative overflow-hidden"
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".pdf" 
                        onChange={handleFileChange}
                      />
                      <div className="w-20 h-20 bg-brand-gold/10 text-brand-gold rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                        <Upload size={36} />
                      </div>
                      <div className="text-center px-6">
                        <p className="font-bold text-gray-700 text-lg">
                          {resumeFile ? resumeFile.name : 'Drop Resume PDF Here'}
                        </p>
                        <p className="text-xs text-gray-400 mt-2 font-medium">
                          {resumeFile ? `${(resumeFile.size / 1024 / 1024).toFixed(2)} MB` : 'Click to browse files (Max 10MB)'}
                        </p>
                      </div>
                      {resumeFile && (
                        <div className="absolute bottom-0 left-0 h-1 bg-brand-gold w-full transition-all" />
                      )}
                    </div>
                  )}
                  
                  <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <ShieldCheck size={12} className="text-brand-green" />
                    {resumeMode === 'text' ? 'Optimized for text extraction' : 'AI-powered document parsing active'}
                  </div>
                </div>

                <div className="bento-card p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-brand-green/10 text-brand-green rounded-xl flex items-center justify-center">
                      <Briefcase size={22} />
                    </div>
                    <div>
                      <h2 className="font-bold text-xl">Job Description</h2>
                      <p className="text-xs text-gray-400">Optional: For role-specific weighted matching</p>
                    </div>
                  </div>
                  <textarea
                    className="w-full h-56 p-5 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-brand-green/5 focus:border-brand-green transition-all resize-none text-sm font-mono leading-relaxed"
                    placeholder="Paste job description here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Right Column: Info & Action */}
              <div className="space-y-6">
                <div className="bg-brand-green rounded-2xl p-8 text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <h2 className="text-2xl font-bold mb-4">Auriic Intelligence</h2>
                    <p className="text-brand-white/80 mb-6 leading-relaxed">
                      Our system uses strict STEM principles to evaluate candidates. 
                      No score inflation. No bias. Just data-driven evidence.
                    </p>
                    <ul className="space-y-3 mb-8">
                      {[
                        'Evidence-based performance evaluation',
                        'Technical stack depth analysis',
                        'Career progression & role alignment',
                        'US Corporate Compliance verification'
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-brand-white/70">
                          <CheckCircle2 size={16} className="text-brand-gold" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="w-full py-4 bg-brand-gold text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          Analyzing STEM Data...
                        </>
                      ) : (
                        <>
                          Run Auriic Analysis
                          <ArrowRight size={20} />
                        </>
                      )}
                    </button>
                    {error && (
                      <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200 text-sm space-y-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle size={18} className="shrink-0 mt-0.5" />
                          <p>{error}</p>
                        </div>
                        {isQuotaExceeded && (
                          <div className="pt-2 border-t border-red-500/20 flex flex-col gap-3">
                            <p className="text-xs text-red-300/80">
                              To avoid quota limits, you can use your own Google Cloud project's API key.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={handleSelectKey}
                                className="px-3 py-1.5 bg-white text-brand-green rounded-lg font-bold text-xs flex items-center gap-1.5 hover:bg-brand-green/5 transition-colors"
                              >
                                <Key size={14} />
                                Select My Own Key
                              </button>
                              <a 
                                href="https://ai.google.dev/gemini-api/docs/billing" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-brand-green/20 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 hover:bg-brand-green/30 transition-colors"
                              >
                                <ExternalLink size={14} />
                                Billing Docs
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Decorative background element */}
                  <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                    <div className="text-brand-green mb-2"><Beaker size={24} /></div>
                    <h3 className="font-bold text-sm">Science</h3>
                    <p className="text-xs text-gray-500">Measurable KPIs & evidence-based impact.</p>
                  </div>
                  <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                    <div className="text-brand-green mb-2"><Cpu size={24} /></div>
                    <h3 className="font-bold text-sm">Technology</h3>
                    <p className="text-xs text-gray-500">Hard skill depth & modern stack relevance.</p>
                  </div>
                  <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                    <div className="text-brand-green mb-2"><Scale size={24} /></div>
                    <h3 className="font-bold text-sm">Engineering</h3>
                    <p className="text-xs text-gray-500">System design & career progression.</p>
                  </div>
                  <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                    <div className="text-brand-green mb-2"><Calculator size={24} /></div>
                    <h3 className="font-bold text-sm">Mathematics</h3>
                    <p className="text-xs text-gray-500">Weighted scoring & statistical matching.</p>
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
              {/* Results Top Bar */}
              <div className="glass sticky top-20 z-40 p-4 rounded-2xl border border-gray-200/50 shadow-lg flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={reset}
                    className="p-2.5 hover:bg-gray-100 rounded-xl transition-all text-gray-500 hover:text-brand-green"
                  >
                    <ArrowRight className="rotate-180" size={20} />
                  </button>
                  <div>
                    <h2 className="font-extrabold text-lg text-gray-900">Auriic Intelligence Report</h2>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black bg-brand-green/10 text-brand-green px-1.5 py-0.5 rounded uppercase tracking-tighter">
                        {result.mode === 'with_jd' ? 'Weighted Match' : 'Independent Evaluation'}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Analysis Complete
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className={cn(
                    "px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-tighter shadow-sm",
                    result.resume_strength_level === 'Excellent' ? "bg-emerald-500 text-white" :
                    result.resume_strength_level === 'Strong' ? "bg-brand-green text-white" :
                    result.resume_strength_level === 'Moderate' ? "bg-brand-gold text-white" :
                    "bg-red-500 text-white"
                  )}>
                    {result.resume_strength_level}
                  </div>
                </div>
              </div>

              {/* Main Dashboard Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Interview Probability Score */}
                <div className="bento-card p-8 flex flex-col items-center justify-center relative overflow-hidden group">
                  <div className="absolute top-4 left-4 text-gray-100 group-hover:text-brand-gold/20 transition-colors"><Target size={60} /></div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8 text-center">Interview Probability</h3>
                  <div className="relative w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { value: result.analytics.interview_probability_score },
                            { value: 100 - result.analytics.interview_probability_score }
                          ]}
                          innerRadius={55}
                          outerRadius={75}
                          startAngle={90}
                          endAngle={450}
                          dataKey="value"
                          stroke="none"
                        >
                          <Cell fill="#C89C36" />
                          <Cell fill="#F3F4F6" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-black text-gray-900">{result.analytics.interview_probability_score}%</span>
                    </div>
                  </div>
                  <div className="mt-8 text-center">
                    <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest">
                      {result.analytics.interview_probability_score >= 75 ? 'High Conversion' : 
                       result.analytics.interview_probability_score >= 40 ? 'Moderate Chance' : 
                       'Low Visibility'}
                    </p>
                  </div>
                </div>

                {/* Score Card */}
                <div className="bento-card p-8 flex flex-col items-center justify-center relative overflow-hidden group">
                  <div className="absolute top-4 left-4 text-gray-100 group-hover:text-brand-green/20 transition-colors"><Calculator size={60} /></div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8">ATS Readiness Score</h3>
                  {result.mode === 'with_jd' && (
                    <div className="absolute top-4 right-4 bg-brand-gold text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter shadow-sm">
                      Weighted
                    </div>
                  )}
                  <div className="relative w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { value: result.ats_score },
                            { value: 100 - result.ats_score }
                          ]}
                          innerRadius={55}
                          outerRadius={75}
                          startAngle={90}
                          endAngle={450}
                          dataKey="value"
                          stroke="none"
                        >
                          <Cell fill="#027A68" />
                          <Cell fill="#F3F4F6" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-black text-gray-900">{result.ats_score}</span>
                      <span className="text-[10px] font-bold text-gray-400 mt-1">/ 100</span>
                    </div>
                  </div>
                  <div className="mt-8 text-center">
                    <p className="text-[10px] font-black text-brand-green uppercase tracking-widest">
                      {result.ats_score >= 80 ? 'Highly Competitive' : 
                       result.ats_score >= 60 ? 'Market Ready' : 
                       'Optimization Needed'}
                    </p>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                  <MetricCard 
                    icon={<BarChart3 size={18} />}
                    label="Keyword Match"
                    value={result.keyword_match_percentage ? `${result.keyword_match_percentage}%` : 'N/A'}
                    description="Industry alignment"
                  />
                  <MetricCard 
                    icon={<Award size={18} />}
                    label="Tech Depth"
                    value={result.technical_depth_level}
                    description="Stack complexity"
                  />
                  <MetricCard 
                    icon={<Briefcase size={18} />}
                    label="Experience"
                    value={`${result.experience_years_detected}y`}
                    description={result.career_progression_level}
                  />
                  <MetricCard 
                    icon={<GraduationCap size={18} />}
                    label="Education"
                    value={result.education_level_detected}
                    description={result.education_match ? "Matches" : "Review"}
                  />
                </div>
              </div>

              {/* Recruiter Simulation Engine */}
              <div className="bento-card overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-green/10 text-brand-green rounded-xl flex items-center justify-center">
                      <Users size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Recruiter Simulation</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">AI Persona: Senior Talent Acquisition</p>
                    </div>
                  </div>
                </div>
                <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-4 space-y-8">
                    <div className="relative">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">First Impression</h4>
                      <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 relative">
                        <div className="absolute -top-2 -left-2 text-brand-gold opacity-20"><Users size={32} /></div>
                        <p className="text-sm text-gray-700 font-medium italic leading-relaxed relative z-10">
                          "{result.analytics.recruiter_simulation.first_impression}"
                        </p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Perceived Seniority</h4>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-xl text-xs font-black uppercase tracking-tighter shadow-md shadow-brand-green/20">
                        <Award size={14} />
                        {result.analytics.recruiter_simulation.perceived_seniority}
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-emerald-50/30 border border-emerald-100/50 p-6 rounded-3xl">
                      <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-5 flex items-center gap-2">
                        <CheckCircle2 size={14} /> Green Flags
                      </h4>
                      <ul className="space-y-4">
                        {result.analytics.recruiter_simulation.green_flags.map((flag, i) => (
                          <li key={i} className="text-xs text-emerald-800 flex items-start gap-3 font-medium">
                            <div className="mt-1 w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                            {flag}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-red-50/30 border border-red-100/50 p-6 rounded-3xl">
                      <h4 className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-5 flex items-center gap-2">
                        <AlertCircle size={14} /> Red Flags
                      </h4>
                      <ul className="space-y-4">
                        {result.analytics.recruiter_simulation.red_flags.map((flag, i) => (
                          <li key={i} className="text-xs text-red-800 flex items-start gap-3 font-medium">
                            <div className="mt-1 w-1.5 h-1.5 bg-red-400 rounded-full shrink-0 shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
                            {flag}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Skill Gap Learning Path & LinkedIn Optimizer */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bento-card overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-green/10 text-brand-green rounded-xl flex items-center justify-center">
                      <GraduationCap size={20} />
                    </div>
                    <h3 className="font-bold text-lg">Learning Roadmap</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {result.analytics.skill_gap_learning_path.map((item, i) => (
                      <motion.div 
                        key={i} 
                        whileHover={{ x: 5 }}
                        className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-brand-gold/30 hover:bg-brand-white transition-all group"
                      >
                        <div className="w-12 h-12 bg-brand-white rounded-xl flex items-center justify-center text-brand-gold shadow-sm shrink-0 group-hover:bg-brand-gold group-hover:text-brand-white transition-colors">
                          <BookOpen size={22} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[9px] font-black text-brand-green uppercase tracking-widest">{item.skill}</span>
                            <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">•</span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{item.resource_type}</span>
                          </div>
                          <p className="text-sm font-bold text-gray-900">{item.topic}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-300 group-hover:border-brand-gold group-hover:text-brand-gold transition-all">
                          <ArrowRight size={14} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="bento-card overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-green/10 text-brand-green rounded-xl flex items-center justify-center">
                      <Linkedin size={20} />
                    </div>
                    <h3 className="font-bold text-lg">LinkedIn Optimizer</h3>
                  </div>
                  <div className="p-6 space-y-8">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Headline Suggestion</h4>
                        <button 
                          onClick={() => handleCopy(result.analytics.linkedin_optimization.headline_suggestion, 'headline')}
                          className="text-[10px] font-bold text-brand-green hover:underline flex items-center gap-1"
                        >
                          {copyFeedback === 'headline' ? <CheckCircle2 size={12} /> : <FileText size={12} />}
                          {copyFeedback === 'headline' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="p-5 bg-brand-green/5 border border-brand-green/10 rounded-2xl text-sm font-bold text-brand-green leading-relaxed relative group">
                        "{result.analytics.linkedin_optimization.headline_suggestion}"
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">About Section Strategy</h4>
                      <ul className="grid grid-cols-1 gap-3">
                        {result.analytics.linkedin_optimization.about_section_tips.map((tip, i) => (
                          <li key={i} className="text-xs text-gray-600 flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="mt-1 w-1.5 h-1.5 bg-brand-gold rounded-full shrink-0" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Experience Formatting</h4>
                      <div className="p-4 bg-gray-50 rounded-2xl text-xs text-gray-500 leading-relaxed border border-gray-100">
                        {result.analytics.linkedin_optimization.experience_formatting}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Analytics Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bento-card overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-green/10 text-brand-green rounded-xl flex items-center justify-center">
                        <BarChart3 size={20} />
                      </div>
                      <h3 className="font-bold text-lg">Skill Gap Analysis</h3>
                    </div>
                  </div>
                  <div className="p-8 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.analytics.skill_gap_analysis} layout="vertical" margin={{ left: 20, right: 40 }}>
                        <XAxis type="number" hide domain={[0, 100]} />
                        <YAxis 
                          dataKey="skill" 
                          type="category" 
                          width={100} 
                          tick={{ fontSize: 10, fontWeight: 800, fill: '#6B7280' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          cursor={{ fill: 'rgba(2, 122, 104, 0.05)' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-gray-900 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">
                                  {payload[0].value}% Gap
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="gap_score" radius={[0, 10, 10, 0]} barSize={20}>
                          {result.analytics.skill_gap_analysis.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.gap_score > 50 ? '#C89C36' : '#027A68'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bento-card p-8 group">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Leadership Potential</h4>
                    <div className="flex items-center gap-5">
                      <div className={cn(
                        "w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3",
                        result.analytics.leadership_potential === 'Exceptional' ? "bg-brand-gold shadow-brand-gold/20" :
                        result.analytics.leadership_potential === 'High' ? "bg-brand-green shadow-brand-green/20" :
                        "bg-gray-400 shadow-gray-400/20"
                      )}>
                        {result.analytics.leadership_potential.charAt(0)}
                      </div>
                      <div>
                        <div className="font-black text-xl text-gray-900">{result.analytics.leadership_potential}</div>
                        <p className="text-xs text-gray-400 font-medium mt-1">Strategic alignment score</p>
                      </div>
                    </div>
                  </div>
                  <div className="bento-card p-8">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Tone Analysis</h4>
                    <div className="relative">
                      <div className="absolute -top-1 -left-1 text-brand-green opacity-10"><Search size={32} /></div>
                      <div className="text-sm font-bold text-gray-700 italic leading-relaxed relative z-10">
                        "{result.analytics.tone_analysis}"
                      </div>
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
                />
                <MetricCard 
                  icon={<Search size={20} />}
                  label="Industry Relevance"
                  value={`${result.analytics.industry_relevance_score}%`}
                  description="Alignment with current market demands."
                />
                <MetricCard 
                  icon={<Cpu size={20} />}
                  label="Project Impact"
                  value={`${result.analytics.project_impact_score}%`}
                  description="Measurable influence of past projects."
                />
              </div>

              {/* Skills & Compliance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Skills Analysis */}
                <div className="bento-card overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-green/10 text-brand-green rounded-xl flex items-center justify-center">
                        <Cpu size={20} />
                      </div>
                      <h3 className="font-bold text-lg">Competency Analysis</h3>
                    </div>
                  </div>
                  <div className="p-8 space-y-8">
                    <div>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Hard Skills Detected</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.hard_skills_found.map((skill, i) => (
                          <span key={i} className="px-4 py-1.5 bg-brand-green/5 text-brand-green rounded-xl text-[11px] font-bold border border-brand-green/10 hover:bg-brand-green hover:text-white transition-all cursor-default">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Soft Skills Detected</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.soft_skills_found.map((skill, i) => (
                          <span key={i} className="px-4 py-1.5 bg-gray-50 text-gray-600 rounded-xl text-[11px] font-bold border border-gray-200 hover:bg-gray-100 transition-all cursor-default">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    {result.missing_critical_skills.length > 0 && (
                      <div className="pt-6 border-t border-gray-100">
                        <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-4">Missing Critical Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {result.missing_critical_skills.map((skill, i) => (
                            <span key={i} className="px-4 py-1.5 bg-red-50 text-red-700 rounded-xl text-[11px] font-bold border border-red-100">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Compliance & Science */}
                <div className="space-y-6">
                  <div className="bento-card overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-gray-50/30">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                        <ShieldCheck size={20} />
                      </div>
                      <h3 className="font-bold text-lg">US Compliance Check</h3>
                    </div>
                    <div className="p-8">
                      {result.us_compliance_issues.length === 0 ? (
                        <div className="flex items-center gap-4 text-emerald-600 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/50">
                          <CheckCircle2 size={32} />
                          <div>
                            <p className="font-black text-sm uppercase tracking-tight">Full Compliance Detected</p>
                            <p className="text-xs font-medium opacity-80 mt-0.5">No PII or discriminatory markers found.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {result.us_compliance_issues.map((issue, i) => (
                            <div key={i} className="flex items-center gap-3 text-amber-600 bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50">
                              <AlertCircle size={20} />
                              <p className="text-xs font-bold">{issue}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bento-card overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-gray-50/30">
                      <div className="w-10 h-10 bg-brand-green/10 text-brand-green rounded-xl flex items-center justify-center">
                        <Beaker size={20} />
                      </div>
                      <h3 className="font-bold text-lg">Impact Analysis</h3>
                    </div>
                    <div className="p-8">
                      <div className="flex items-center justify-between p-5 bg-gray-50/50 rounded-2xl border border-gray-100">
                        <div>
                          <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Quantified Achievements</p>
                          <p className="text-xs font-medium text-gray-400 mt-0.5">Measurable success evidence (%, $, KPIs).</p>
                        </div>
                        {result.quantified_achievements_detected ? (
                          <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20"><CheckCircle2 size={20} /></div>
                        ) : (
                          <div className="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-amber-500/20"><AlertCircle size={20} /></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Suggestions */}
              <div className="bento-card p-10 bg-[#014D41] text-brand-white relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
                    <ChevronRight className="text-brand-gold" size={32} />
                    Optimization Roadmap
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {result.improvement_suggestions.map((suggestion, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-4 p-5 bg-brand-white/5 backdrop-blur-sm rounded-2xl border border-brand-white/10 hover:bg-brand-white/10 transition-all group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-brand-gold text-[#014D41] flex items-center justify-center font-black text-sm shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                          {i + 1}
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-brand-white/80">
                          {suggestion}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
                {/* Decorative background element */}
                <div className="absolute -top-20 -right-20 w-96 h-96 bg-brand-gold/5 rounded-full blur-[100px]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="bg-brand-white border-t border-gray-200 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">
            Auriic ATS v1.2.0 // Enterprise Intelligence Engine // Analytical Mode Active
          </p>
        </div>
      </footer>
    </div>
  );
}

function MetricCard({ icon, label, value, description }: { icon: React.ReactNode, label: string, value: string | number, description: string }) {
  return (
    <div className="bento-card p-6 flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-gray-50 text-brand-green rounded-xl flex items-center justify-center group-hover:bg-brand-green group-hover:text-brand-white transition-all duration-300">
            {icon}
          </div>
          <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest group-hover:text-brand-green transition-colors">Metric</div>
        </div>
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</h4>
        <div className="text-2xl font-black text-gray-900 tracking-tight">{value}</div>
      </div>
      <p className="text-[10px] font-bold text-gray-400 mt-4 leading-relaxed">{description}</p>
    </div>
  );
}
