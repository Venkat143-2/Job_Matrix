import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, onSnapshot, addDoc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, 
  User, 
  Search, 
  CheckCircle, 
  XCircle, 
  LogOut, 
  Plus, 
  FileText, 
  Building2, 
  ShieldCheck,
  LayoutDashboard,
  Bell,
  ChevronRight,
  Loader2,
  Globe,
  MapPin,
  X
} from 'lucide-react';
import Markdown from 'react-markdown';
import { UserProfile, StudentProfile, RecruiterProfile, Job, Application } from './types';
import { getJobRecommendations, getCandidateMatches, searchExternalJobs, generateATSResume } from './services/geminiService';
import { cn } from './lib/utils';

// --- Components ---

const LoadingScreen = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
    <motion.div 
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
    >
      <Loader2 className="w-12 h-12 text-indigo-600" />
    </motion.div>
  </div>
);

const Navbar = ({ user, profile }: { user: any, profile: UserProfile | null }) => {
  const navigate = useNavigate();
  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-40 w-full glass border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-indigo-600">
        <Briefcase className="w-8 h-8" />
        <span>Job Matrix</span>
      </Link>
      
      <div className="flex items-center gap-6">
        {user ? (
          <>
            <Link to="/dashboard" className="text-slate-600 hover:text-indigo-600 font-medium flex items-center gap-1">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Link>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold">{profile?.displayName}</p>
                <p className="text-xs text-slate-500 capitalize">{profile?.role}</p>
              </div>
              <button onClick={handleLogout} className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <Link to="/login" className="btn-primary">Get Started</Link>
        )}
      </div>
    </nav>
  );
};

// --- Pages ---

const LandingPage = () => (
  <div className="max-w-7xl mx-auto px-6 py-20 text-center">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-6xl font-extrabold tracking-tight text-slate-900 mb-6"
    >
      The Future of Hiring is <span className="text-indigo-600">AI-Powered</span>
    </motion.h1>
    <motion.p 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="text-xl text-slate-600 max-w-2xl mx-auto mb-10"
    >
      Connect students with their dream jobs and recruiters with top talent through smart matching and secure verification.
    </motion.p>
    <div className="flex justify-center gap-4">
      <Link to="/login" className="btn-primary text-lg px-8 py-4">I'm a Student</Link>
      <Link to="/login" className="btn-secondary text-lg px-8 py-4">I'm a Recruiter</Link>
    </div>
    
    <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
      {[
        { icon: ShieldCheck, title: "Verified Profiles", desc: "CIN & OTP verification ensures a trusted ecosystem." },
        { icon: Search, title: "Smart Matching", desc: "AI recommends jobs based on skills and interests." },
        { icon: CheckCircle, title: "Easy Hiring", desc: "One-click apply and streamlined application tracking." }
      ].map((feature, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 + i * 0.1 }}
          className="p-8 glass rounded-2xl text-left"
        >
          <feature.icon className="w-12 h-12 text-indigo-600 mb-4" />
          <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
          <p className="text-slate-600">{feature.desc}</p>
        </motion.div>
      ))}
    </div>
  </div>
);

const Login = ({ setProfile }: { setProfile: any }) => {
  const navigate = useNavigate();
  const [role, setRole] = useState<'student' | 'recruiter'>('student');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email!,
          role: role,
          displayName: user.displayName || 'User',
          isVerified: false,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', user.uid), newProfile);
        setProfile(newProfile);
      } else {
        setProfile(userDoc.data() as UserProfile);
      }
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 glass rounded-3xl">
      <h2 className="text-3xl font-bold text-center mb-8">Welcome Back</h2>
      <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
        <button 
          onClick={() => setRole('student')}
          className={cn("flex-1 py-2 rounded-lg font-medium transition-all", role === 'student' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500")}
        >
          Student
        </button>
        <button 
          onClick={() => setRole('recruiter')}
          className={cn("flex-1 py-2 rounded-lg font-medium transition-all", role === 'recruiter' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500")}
        >
          Recruiter
        </button>
      </div>
      <button 
        onClick={handleGoogleLogin} 
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-medium"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />}
        Continue with Google
      </button>
    </div>
  );
};

const StudentDashboard = ({ profile }: { profile: StudentProfile }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [externalJobs, setExternalJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [searchingMNC, setSearchingMNC] = useState(false);
  const [generatedResume, setGeneratedResume] = useState<{ resumeMarkdown: string, atsScore: number, optimizationTips: string[] } | null>(null);
  const [generatingResume, setGeneratingResume] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'jobs'), where('status', '==', 'open'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
      setJobs(jobsData);
      setLoading(false);
    }, (error) => {
      console.error("Jobs fetch error:", error);
      setLoading(false);
    });

    const appQ = query(collection(db, 'applications'), where('studentId', '==', profile.uid));
    const unsubscribeApps = onSnapshot(appQ, (snapshot) => {
      setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application)));
    }, (error) => {
      console.error("Applications fetch error:", error);
    });

    return () => {
      unsubscribe();
      unsubscribeApps();
    };
  }, [profile.uid]);

  const handleGetAIRecommendations = async (jobsToMatch: Job[]) => {
    if (jobsToMatch.length === 0 || matching) return;
    setMatching(true);
    try {
      const recs = await getJobRecommendations(profile, jobsToMatch);
      setRecommendations(recs);
    } catch (error) {
      console.error("AI Recommendation Error:", error);
    } finally {
      setMatching(false);
    }
  };

  const handleSearchMNCJobs = async () => {
    setSearchingMNC(true);
    try {
      const { jobs: mncJobs } = await searchExternalJobs(profile);
      setExternalJobs(mncJobs);
    } catch (error) {
      console.error("External search error:", error);
    } finally {
      setSearchingMNC(false);
    }
  };

  const handleGenerateResume = async (job: { title: string, companyName: string, description: string }) => {
    setGeneratingResume(true);
    try {
      const resumeData = await generateATSResume(profile, job);
      setGeneratedResume(resumeData);
    } catch (error) {
      console.error("Resume generation error:", error);
      alert("Failed to generate resume. Please try again.");
    } finally {
      setGeneratingResume(false);
    }
  };

  // Auto-trigger recommendations once when jobs are loaded and recommendations are empty
  useEffect(() => {
    if (!loading && jobs.length > 0 && recommendations.length === 0 && !matching) {
      handleGetAIRecommendations(jobs);
    }
  }, [loading, jobs, recommendations.length, matching]);

  const handleApply = async (job: Job) => {
    try {
      const appData = {
        jobId: job.id,
        studentId: profile.uid,
        studentName: profile.displayName,
        recruiterId: job.recruiterId,
        status: 'applied',
        appliedAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'applications'), appData);
    } catch (error) {
      console.error("Apply error:", error);
      alert("Failed to apply for the job. Please try again.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold">Jobs for You</h2>
          {matching && (
            <div className="flex items-center gap-2 text-indigo-600 text-sm font-medium animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" /> AI Matching...
            </div>
          )}
        </div>
        <button 
          onClick={() => handleGetAIRecommendations(jobs)} 
          disabled={matching || jobs.length === 0} 
          className="btn-secondary flex items-center gap-2"
        >
          <ShieldCheck className="w-4 h-4" /> Refresh AI Recommendations
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 glass rounded-3xl">
          <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">No active jobs found. Check back later!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map(job => {
            const isRecommended = recommendations.includes(job.id);
            const hasApplied = applications.some(app => app.jobId === job.id);
            
            return (
              <motion.div 
                key={job.id} 
                layout
                className={cn("p-6 glass rounded-2xl relative flex flex-col", isRecommended && "ring-2 ring-indigo-500")}
              >
                {isRecommended && (
                  <span className="absolute -top-3 left-6 bg-indigo-600 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg">
                    AI MATCH
                  </span>
                )}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold line-clamp-1">{job.title}</h3>
                    <p className="text-slate-500 flex items-center gap-1 text-sm">
                      <Building2 className="w-4 h-4" /> {job.companyName}
                    </p>
                  </div>
                  <p className="text-indigo-600 font-bold whitespace-nowrap">{job.salary}</p>
                </div>
                <p className="text-slate-600 text-sm mb-4 line-clamp-3 flex-1">{job.description}</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {job.skillsRequired.slice(0, 4).map(skill => (
                    <span key={skill} className="text-[10px] bg-slate-100 px-2 py-1 rounded-md text-slate-600 font-medium">
                      {skill}
                    </span>
                  ))}
                  {job.skillsRequired.length > 4 && (
                    <span className="text-[10px] text-slate-400">+{job.skillsRequired.length - 4} more</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button 
                    disabled={hasApplied}
                    onClick={() => handleApply(job)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2", 
                      hasApplied ? "bg-green-50 text-green-600 cursor-default" : "btn-primary"
                    )}
                  >
                    {hasApplied ? (
                      <><CheckCircle className="w-4 h-4" /> Applied</>
                    ) : (
                      "One-Click Apply"
                    )}
                  </button>
                  <button 
                    onClick={() => handleGenerateResume(job)}
                    disabled={generatingResume}
                    className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-slate-600"
                    title="Generate ATS Resume"
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* External MNC Jobs Section */}
      <div className="pt-12 border-t border-slate-200">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold">MNC Jobs (External)</h2>
            {searchingMNC && (
              <div className="flex items-center gap-2 text-indigo-600 text-sm font-medium animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching Internet...
              </div>
            )}
          </div>
          <button 
            onClick={handleSearchMNCJobs} 
            disabled={searchingMNC} 
            className="btn-primary flex items-center gap-2"
          >
            <Search className="w-4 h-4" /> Search MNC Openings
          </button>
        </div>

        {externalJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {externalJobs.map((job, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-6 glass rounded-2xl flex flex-col border-indigo-100 bg-indigo-50/30"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold line-clamp-1">{job.title}</h3>
                    <p className="text-slate-500 flex items-center gap-1 text-sm">
                      <Building2 className="w-4 h-4" /> {job.companyName}
                    </p>
                  </div>
                  <Globe className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="text-slate-600 text-sm mb-4 line-clamp-3 flex-1">{job.description}</p>
                
                {/* Match Analysis Section */}
                <div className="mb-6 p-4 bg-white/50 rounded-xl border border-indigo-50 space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-green-600">Match: {job.matchPercentage}%</span>
                    <span className="text-red-500">Mismatch: {job.mismatchPercentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-green-500" style={{ width: `${job.matchPercentage}%` }} />
                    <div className="h-full bg-red-400" style={{ width: `${job.mismatchPercentage}%` }} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-slate-600 leading-tight">
                        <span className="font-bold text-green-700">Match Reason:</span> {job.matchReason}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <XCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-slate-600 leading-tight">
                        <span className="font-bold text-red-600">Mismatch Reason:</span> {job.mismatchReason}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
                  <MapPin className="w-3 h-3" /> {job.location}
                </div>
                <div className="flex gap-3">
                  <a 
                    href={job.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-xl font-bold btn-primary flex items-center justify-center gap-2"
                  >
                    Apply <ChevronRight className="w-4 h-4" />
                  </a>
                  <button 
                    onClick={() => handleGenerateResume(job)}
                    disabled={generatingResume}
                    className="p-2.5 rounded-xl border border-indigo-200 hover:bg-indigo-50 transition-all text-indigo-600 bg-white"
                    title="Generate ATS Resume"
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : !searchingMNC && (
          <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Globe className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Click the button above to find real-time job openings from top MNCs across the web.</p>
          </div>
        )}
      </div>

      {/* Resume Generation Modal */}
      <AnimatePresence>
        {(generatingResume || generatedResume) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
                <div>
                  <h3 className="text-xl font-bold">ATS Optimized Resume</h3>
                  <p className="text-indigo-100 text-sm">Tailored for your selected job</p>
                </div>
                <button 
                  onClick={() => { setGeneratedResume(null); setGeneratingResume(false); }}
                  className="p-2 hover:bg-white/10 rounded-full transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                {generatingResume ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
                    <p className="text-slate-600 font-medium animate-pulse">AI is crafting your perfect resume...</p>
                  </div>
                ) : generatedResume && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="prose prose-slate max-w-none bg-slate-50 p-8 rounded-2xl border border-slate-100 shadow-inner">
                        <Markdown>{generatedResume.resumeMarkdown}</Markdown>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                        <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5" /> ATS Score
                        </h4>
                        <div className="relative pt-1">
                          <div className="flex mb-2 items-center justify-between">
                            <div>
                              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200">
                                Match Quality
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold inline-block text-indigo-600">
                                {generatedResume.atsScore}%
                              </span>
                            </div>
                          </div>
                          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-200">
                            <div style={{ width: `${generatedResume.atsScore}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"></div>
                          </div>
                        </div>
                        <p className="text-xs text-indigo-700 leading-relaxed">
                          This score represents how well your profile matches the job requirements after AI optimization.
                        </p>
                      </div>

                      <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
                        <h4 className="font-bold text-amber-900 mb-4 flex items-center gap-2">
                          <Bell className="w-5 h-5" /> Optimization Tips
                        </h4>
                        <ul className="space-y-3">
                          {generatedResume.optimizationTips.map((tip, i) => (
                            <li key={i} className="flex gap-2 text-xs text-amber-800">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button 
                        onClick={() => {
                          const blob = new Blob([generatedResume.resumeMarkdown], { type: 'text/markdown' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'ATS_Resume.md';
                          a.click();
                        }}
                        className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                      >
                        <FileText className="w-5 h-5" /> Download Markdown
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const RecruiterDashboard = ({ profile }: { profile: RecruiterProfile }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [showPostJob, setShowPostJob] = useState(false);
  const [newJob, setNewJob] = useState({ title: '', description: '', salary: '', location: '', skills: '' });

  useEffect(() => {
    const q = query(collection(db, 'jobs'), where('recruiterId', '==', profile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)));
    });

    const appQ = query(collection(db, 'applications'), where('recruiterId', '==', profile.uid));
    const unsubscribeApps = onSnapshot(appQ, (snapshot) => {
      setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application)));
    });

    return () => {
      unsubscribe();
      unsubscribeApps();
    };
  }, [profile.uid]);

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const jobData: Omit<Job, 'id'> = {
      recruiterId: profile.uid,
      companyName: profile.companyName,
      title: newJob.title,
      description: newJob.description,
      skillsRequired: newJob.skills.split(',').map(s => s.trim()),
      salary: newJob.salary,
      location: newJob.location,
      role: 'Full-time',
      createdAt: new Date().toISOString(),
      status: 'open'
    };
    await addDoc(collection(db, 'jobs'), jobData);
    setShowPostJob(false);
    setNewJob({ title: '', description: '', salary: '', location: '', skills: '' });
  };

  const handleStatusUpdate = async (appId: string, status: string) => {
    await updateDoc(doc(db, 'applications', appId), { status });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Recruiter Dashboard</h2>
        <button onClick={() => setShowPostJob(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> Post New Job
        </button>
      </div>

      {showPostJob && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-8 glass rounded-3xl max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold mb-6">Post a New Job</h3>
          <form onSubmit={handlePostJob} className="space-y-4">
            <input className="input-field" placeholder="Job Title" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} required />
            <textarea className="input-field h-32" placeholder="Description" value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})} required />
            <div className="grid grid-cols-2 gap-4">
              <input className="input-field" placeholder="Salary" value={newJob.salary} onChange={e => setNewJob({...newJob, salary: e.target.value})} required />
              <input className="input-field" placeholder="Location" value={newJob.location} onChange={e => setNewJob({...newJob, location: e.target.value})} required />
            </div>
            <input className="input-field" placeholder="Skills (comma separated)" value={newJob.skills} onChange={e => setNewJob({...newJob, skills: e.target.value})} required />
            <div className="flex gap-4 pt-4">
              <button type="submit" className="btn-primary flex-1">Post Job</button>
              <button type="button" onClick={() => setShowPostJob(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2"><Briefcase className="w-5 h-5" /> Your Active Jobs</h3>
          {jobs.map(job => (
            <div key={job.id} className="p-4 glass rounded-xl flex justify-between items-center">
              <div>
                <p className="font-bold">{job.title}</p>
                <p className="text-xs text-slate-500">{job.location} • {job.salary}</p>
              </div>
              <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full font-bold uppercase">{job.status}</span>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2"><User className="w-5 h-5" /> Recent Applications</h3>
          {applications.map(app => (
            <div key={app.id} className="p-4 glass rounded-xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold">{app.studentName}</p>
                  <p className="text-xs text-slate-500">Applied for {jobs.find(j => j.id === app.jobId)?.title}</p>
                </div>
                <span className={cn("text-xs px-2 py-1 rounded-full font-bold uppercase", 
                  app.status === 'applied' ? "bg-blue-100 text-blue-600" : 
                  app.status === 'shortlisted' ? "bg-indigo-100 text-indigo-600" : 
                  app.status === 'selected' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                )}>
                  {app.status}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleStatusUpdate(app.id, 'shortlisted')} className="text-xs btn-primary py-1">Shortlist</button>
                <button onClick={() => handleStatusUpdate(app.id, 'selected')} className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg font-medium">Select</button>
                <button onClick={() => handleStatusUpdate(app.id, 'rejected')} className="text-xs btn-secondary py-1">Reject</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ProfileSetup = ({ profile, setProfile }: { profile: UserProfile, setProfile: any }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'info' | 'email-otp' | 'phone-otp'>('info');
  const [formData, setFormData] = useState({
    skills: '',
    education: '',
    interests: '',
    companyName: '',
    cin: '',
    phone: '',
    email: profile.email
  });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = async (target: string, type: 'email' | 'phone') => {
    setLoading(true);
    try {
      await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, type })
      });
      setStep(type === 'email' ? 'email-otp' : 'phone-otp');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (target: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, code: otp })
      });
      const data = await res.json();
      if (data.success) {
        if (step === 'email-otp') {
          await sendOtp(formData.phone, 'phone');
        } else {
          await finalizeProfile();
        }
      } else {
        alert("Invalid OTP. Please try again.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const finalizeProfile = async () => {
    setLoading(true);
    let updatedProfile: any = { ...profile };

    if (profile.role === 'student') {
      updatedProfile = {
        ...updatedProfile,
        skills: formData.skills.split(',').map(s => s.trim()),
        education: formData.education,
        interests: formData.interests.split(',').map(s => s.trim()),
        phone: formData.phone,
        isVerified: true
      };
    } else {
      updatedProfile = {
        ...updatedProfile,
        companyName: formData.companyName,
        cin: formData.cin,
        phone: formData.phone,
        isVerified: true
      };
    }

    await setDoc(doc(db, 'users', profile.uid), updatedProfile);
    setProfile(updatedProfile);
    setLoading(false);
    navigate('/dashboard');
  };

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile.role === 'recruiter') {
      setLoading(true);
      const res = await fetch('/api/verify-cin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cin: formData.cin })
      });
      const data = await res.json();
      setLoading(false);
      if (!data.valid) {
        alert("Invalid CIN number. Please check and try again.");
        return;
      }
    }
    await sendOtp(formData.email, 'email');
  };

  return (
    <div className="max-w-2xl mx-auto mt-20 p-8 glass rounded-3xl">
      <h2 className="text-3xl font-bold mb-8">
        {step === 'info' ? 'Complete Your Profile' : 
         step === 'email-otp' ? 'Verify Your Email' : 'Verify Your Phone'}
      </h2>

      {step === 'info' && (
        <form onSubmit={handleInitialSubmit} className="space-y-6">
          {profile.role === 'student' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Skills (comma separated)</label>
                <input className="input-field" placeholder="e.g. React, Python, SQL" value={formData.skills} onChange={e => setFormData({...formData, skills: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Education</label>
                <input className="input-field" placeholder="e.g. B.Tech Computer Science" value={formData.education} onChange={e => setFormData({...formData, education: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Interests</label>
                <input className="input-field" placeholder="e.g. Web Dev, AI, Design" value={formData.interests} onChange={e => setFormData({...formData, interests: e.target.value})} required />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Company Name</label>
                <input className="input-field" placeholder="e.g. Tech Solutions Inc." value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">CIN Number (21 digits)</label>
                <input className="input-field" placeholder="e.g. U72200MH2020PTC123456" value={formData.cin} onChange={e => setFormData({...formData, cin: e.target.value})} required />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
            <input className="input-field" placeholder="+91 98765 43210" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
          </div>
          <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-lg">
            {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Continue to Verification"}
          </button>
        </form>
      )}

      {(step === 'email-otp' || step === 'phone-otp') && (
        <div className="space-y-6 text-center">
          <p className="text-slate-600">
            We've sent a 6-digit code to <span className="font-bold text-indigo-600">{step === 'email-otp' ? formData.email : formData.phone}</span>.
            <br />
            <span className="text-xs text-slate-400">(Check your terminal/console for the mock OTP)</span>
          </p>
          <div className="flex justify-center gap-2">
            <input 
              className="input-field text-center text-2xl tracking-widest max-w-[200px]" 
              maxLength={6} 
              placeholder="000000" 
              value={otp} 
              onChange={e => setOtp(e.target.value)} 
            />
          </div>
          <button 
            onClick={() => verifyOtp(step === 'email-otp' ? formData.email : formData.phone)} 
            disabled={loading || otp.length !== 6}
            className="w-full btn-primary py-3 text-lg"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Verify OTP"}
          </button>
          <button onClick={() => setStep('info')} className="text-indigo-600 font-medium">Back to Profile</button>
        </div>
      )}
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} profile={profile} />
        <main className="flex-1 px-6 py-8">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login setProfile={setProfile} />} />
            <Route path="/setup" element={user && profile ? <ProfileSetup profile={profile} setProfile={setProfile} /> : <Navigate to="/login" />} />
            <Route path="/dashboard" element={
              user && profile ? (
                !profile.isVerified ? <Navigate to="/setup" /> : (
                  profile.role === 'student' ? <StudentDashboard profile={profile as StudentProfile} /> : <RecruiterDashboard profile={profile as RecruiterProfile} />
                )
              ) : <Navigate to="/login" />
            } />
          </Routes>
        </main>
        <footer className="py-8 border-t border-slate-200 text-center text-slate-500 text-sm">
          © 2026 Job Matrix. Built with ❤️ for Students & Recruiters.
        </footer>
      </div>
    </Router>
  );
}
