export interface AvailabilityBlock {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  note?: string;
}

export interface Applicant {
  id: string;
  student_number?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  preferred_contact?: 'email' | 'phone' | 'text';
  major?: string;
  year_level?: string;
  public_summary?: string;
  access_needs?: string;
  max_weekly_hours?: number;
  skills: string[];
  availability: AvailabilityBlock[];
}

export interface ApplicantProfileDraft {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredContact: 'email' | 'phone' | 'text';
  major: string;
  yearLevel: string;
  publicSummary: string;
  accessNeeds: string;
  maxWeeklyHours: number;
}

export interface JobShift {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  openSlots?: number;
  label?: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  hourlyRate: number;
  minHoursPerWeek: number;
  maxHoursPerWeek: number;
  remotePossible: boolean;
  lowBandwidthFriendly: boolean;
  departmentName: string;
  shifts: JobShift[];
  skills: Array<{ skill: string; required: boolean }>;
}

export interface Dashboard {
  summary: {
    activeApplicants: number;
    activeJobs: number;
    openShiftSlots: number;
    pendingApplications: number;
  };
  applicationsByStatus: Array<{ status: string; count: number }>;
  availabilityByDay: Array<{ dayOfWeek: number; dayName: string; count: number }>;
  departments: Array<{ id: string; name: string; activeJobs: number; applications: number; openSlots: number }>;
}

export interface AiRecommendation {
  id: string;
  title: string;
  departmentName: string;
  hourlyRate: number;
  score: number;
  reasons: string[];
  matchedSkills: string[];
  matchedShifts: JobShift[];
}

export interface ChatResponse {
  reply: string;
  recommendations: AiRecommendation[];
  criteria: {
    provider: string;
    timeWindows: AvailabilityBlock[];
    skills: string[];
    remotePreferred: boolean;
    maxHoursPerWeek: number | null;
  };
}

export interface CandidateMatch {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  major: string;
  maxWeeklyHours: number;
  score: number;
  matchedSkills: string[];
  missingRequiredSkills: string[];
  matchedShifts: JobShift[];
}
