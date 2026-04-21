import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Applicant,
  ApplicantProfileDraft,
  AvailabilityBlock,
  CandidateMatch,
  ChatResponse,
  Dashboard,
  Job
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  getApplicant(id: string): Observable<{ applicant: Applicant }> {
    return this.http.get<{ applicant: Applicant }>(`${this.baseUrl}/applicants/${id}`);
  }

  updateProfile(id: string, profile: ApplicantProfileDraft): Observable<{ applicant: Applicant; message: string }> {
    return this.http.patch<{ applicant: Applicant; message: string }>(`${this.baseUrl}/applicants/${id}/profile`, profile);
  }

  replaceSkills(id: string, skills: string[]): Observable<{ applicant: Applicant; message: string }> {
    return this.http.put<{ applicant: Applicant; message: string }>(`${this.baseUrl}/applicants/${id}/skills`, { skills });
  }

  replaceAvailability(id: string, availability: AvailabilityBlock[]): Observable<{ applicant: Applicant; message: string }> {
    return this.http.put<{ applicant: Applicant; message: string }>(`${this.baseUrl}/applicants/${id}/availability`, { availability });
  }

  getDashboard(): Observable<{ dashboard: Dashboard }> {
    return this.http.get<{ dashboard: Dashboard }>(`${this.baseUrl}/managers/dashboard`);
  }

  getJobs(): Observable<{ jobs: Job[] }> {
    return this.http.get<{ jobs: Job[] }>(`${this.baseUrl}/jobs`);
  }

  getCandidateMatches(jobId: string): Observable<{ candidates: CandidateMatch[]; job: Job }> {
    return this.http.get<{ candidates: CandidateMatch[]; job: Job }>(`${this.baseUrl}/managers/jobs/${jobId}/matches`);
  }

  chat(message: string, applicantId: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.baseUrl}/ai/chat`, { message, applicantId });
  }
}
