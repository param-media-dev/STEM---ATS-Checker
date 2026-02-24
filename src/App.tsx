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
  ExternalLink
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
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <ShieldCheck size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              STEM<span className="text-indigo-600">ATS</span>
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-500">
            <span className="flex items-center gap-1.5"><Beaker size={14} /> Science</span>
            <span className="flex items-center gap-1.5"><Cpu size={14} /> Tech</span>
            <span className="flex items-center gap-1.5"><Scale size={14} /> Engineering</span>
            <span className="flex items-center gap-1.5"><Calculator size={14} /> Math</span>
            <button 
              onClick={handleSelectKey}
              className="ml-4 p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors flex items-center gap-2 border border-indigo-100"
              title="Select API Key"
            >
              <Key size={16} />
              <span className="text-xs font-bold">API Key</span>
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
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="text-indigo-600" size={20} />
                      <h2 className="font-semibold text-lg">Resume Content</h2>
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setResumeMode('text')}
                        className={cn(
                          "px-3 py-1 text-xs font-bold rounded-md transition-all",
                          resumeMode === 'text' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                      >
                        Text
                      </button>
                      <button 
                        onClick={() => setResumeMode('pdf')}
                        className={cn(
                          "px-3 py-1 text-xs font-bold rounded-md transition-all",
                          resumeMode === 'pdf' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                      >
                        PDF
                      </button>
                    </div>
                  </div>

                  {resumeMode === 'text' ? (
                    <textarea
                      className="w-full h-64 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-sm font-mono"
                      placeholder="Paste resume text here..."
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                    />
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-64 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-4 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".pdf" 
                        onChange={handleFileChange}
                      />
                      <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload size={32} />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-gray-700">
                          {resumeFile ? resumeFile.name : 'Click to upload Resume PDF'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {resumeFile ? `${(resumeFile.size / 1024 / 1024).toFixed(2)} MB` : 'Maximum size: 10MB'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <p className="mt-2 text-xs text-gray-400">
                    {resumeMode === 'text' ? 'STEM-ATS performs best with raw text extraction.' : 'Gemini 3.1 Pro will analyze the document structure and content.'}
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="text-indigo-600" size={20} />
                    <h2 className="font-semibold text-lg">Job Description (Optional)</h2>
                  </div>
                  <textarea
                    className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-sm font-mono"
                    placeholder="Paste job description here for weighted matching..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Right Column: Info & Action */}
              <div className="space-y-6">
                <div className="bg-indigo-900 rounded-2xl p-8 text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <h2 className="text-2xl font-bold mb-4">Enterprise-Grade Analysis</h2>
                    <p className="text-indigo-100 mb-6 leading-relaxed">
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
                        <li key={i} className="flex items-center gap-2 text-sm text-indigo-200">
                          <CheckCircle2 size={16} className="text-emerald-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="w-full py-4 bg-white text-indigo-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          Analyzing STEM Data...
                        </>
                      ) : (
                        <>
                          Run STEM Analysis
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
                                className="px-3 py-1.5 bg-white text-red-600 rounded-lg font-bold text-xs flex items-center gap-1.5 hover:bg-red-50 transition-colors"
                              >
                                <Key size={14} />
                                Select My Own Key
                              </button>
                              <a 
                                href="https://ai.google.dev/gemini-api/docs/billing" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-red-500/20 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 hover:bg-red-500/30 transition-colors"
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
                    <div className="text-indigo-600 mb-2"><Beaker size={24} /></div>
                    <h3 className="font-bold text-sm">Science</h3>
                    <p className="text-xs text-gray-500">Measurable KPIs & evidence-based impact.</p>
                  </div>
                  <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                    <div className="text-indigo-600 mb-2"><Cpu size={24} /></div>
                    <h3 className="font-bold text-sm">Technology</h3>
                    <p className="text-xs text-gray-500">Hard skill depth & modern stack relevance.</p>
                  </div>
                  <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                    <div className="text-indigo-600 mb-2"><Scale size={24} /></div>
                    <h3 className="font-bold text-sm">Engineering</h3>
                    <p className="text-xs text-gray-500">System design & career progression.</p>
                  </div>
                  <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                    <div className="text-indigo-600 mb-2"><Calculator size={24} /></div>
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
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={reset}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                  >
                    <ArrowRight className="rotate-180" size={20} />
                  </button>
                  <div>
                    <h2 className="font-bold text-lg">Analysis Report</h2>
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Score Card */}
                <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute top-4 left-4 text-gray-300"><Calculator size={40} /></div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">ATS Readiness Score</h3>
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
                          <Cell fill="#4F46E5" />
                          <Cell fill="#F3F4F6" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-black text-gray-900">{result.ats_score}</span>
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
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MetricCard 
                    icon={<BarChart3 size={20} />}
                    label="Keyword Match"
                    value={result.keyword_match_percentage ? `${result.keyword_match_percentage}%` : 'N/A'}
                    description="Relevance to industry standards & JD keywords."
                  />
                  <MetricCard 
                    icon={<Award size={20} />}
                    label="Technical Depth"
                    value={result.technical_depth_level}
                    description="Evaluation of technical stack complexity."
                  />
                  <MetricCard 
                    icon={<Briefcase size={20} />}
                    label="Experience"
                    value={`${result.experience_years_detected} Years`}
                    description={`Career Level: ${result.career_progression_level}`}
                  />
                  <MetricCard 
                    icon={<GraduationCap size={20} />}
                    label="Education"
                    value={result.education_level_detected}
                    description={result.education_match ? "Matches requirements" : "Review needed"}
                  />
                </div>
              </div>

              {/* Skills & Compliance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Skills Analysis */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="text-indigo-600" size={20} />
                      <h3 className="font-bold">Competency Analysis</h3>
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Hard Skills Detected</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.hard_skills_found.map((skill, i) => (
                          <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold border border-indigo-100">
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
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                      <ShieldCheck className="text-emerald-600" size={20} />
                      <h3 className="font-bold">US Compliance Check</h3>
                    </div>
                    <div className="p-6">
                      {result.us_compliance_issues.length === 0 ? (
                        <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 p-4 rounded-xl">
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

                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                      <Beaker className="text-indigo-600" size={20} />
                      <h3 className="font-bold">Science: Impact Analysis</h3>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-sm font-bold">Quantified Achievements</p>
                          <p className="text-xs text-gray-500">Evidence of measurable success (%, $, KPIs).</p>
                        </div>
                        {result.quantified_achievements_detected ? (
                          <div className="text-emerald-500"><CheckCircle2 size={24} /></div>
                        ) : (
                          <div className="text-amber-500"><AlertCircle size={24} /></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Suggestions */}
              <div className="bg-indigo-900 rounded-2xl p-8 text-white">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <ChevronRight className="text-indigo-400" />
                  STEM Optimization Roadmap
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {result.improvement_suggestions.map((suggestion, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 font-bold text-indigo-300">
                        {i + 1}
                      </div>
                      <p className="text-sm text-indigo-100 leading-relaxed">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">
            STEM-ATS v1.0.0 // Enterprise Compliance Engine // Analytical Mode Active
          </p>
        </div>
      </footer>
    </div>
  );
}

function MetricCard({ icon, label, value, description }: { icon: React.ReactNode, label: string, value: string | number, description: string }) {
  return (
    <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm hover:border-indigo-200 transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
          {icon}
        </div>
        <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest">{label}</h3>
      </div>
      <div className="text-2xl font-black text-gray-900 mb-1">{value}</div>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}
