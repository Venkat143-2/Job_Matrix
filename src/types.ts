export type UserRole = 'student' | 'recruiter' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  isVerified: boolean;
  createdAt: string;
}

export interface StudentProfile extends UserProfile {
  skills: string[];
  education: string;
  resumeUrl?: string;
  interests: string[];
  phone?: string;
}

export interface RecruiterProfile extends UserProfile {
  companyName: string;
  cin: string;
  phone?: string;
}

export interface Job {
  id: string;
  recruiterId: string;
  companyName: string;
  title: string;
  description: string;
  skillsRequired: string[];
  salary: string;
  location: string;
  role: string;
  createdAt: string;
  status: 'open' | 'closed';
}

export interface Application {
  id: string;
  jobId: string;
  studentId: string;
  studentName: string;
  status: 'applied' | 'shortlisted' | 'rejected' | 'selected';
  appliedAt: string;
}
