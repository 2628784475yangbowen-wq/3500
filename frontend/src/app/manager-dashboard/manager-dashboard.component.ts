import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../api.service';
import { friendlyError } from '../logic';
import { CandidateMatch, Dashboard, Job } from '../models';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manager-dashboard.component.html'
})
export class ManagerDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);

  dashboard: Dashboard | null = null;
  jobs: Job[] = [];
  selectedJobId = '';
  candidateMatches: CandidateMatch[] = [];
  managerError = '';
  loadingManager = false;

  ngOnInit(): void {
    this.refreshManager();
  }

  refreshManager(): void {
    this.loadingManager = true;
    this.managerError = '';

    forkJoin({
      dashboard: this.api.getDashboard(),
      jobs: this.api.getJobs()
    }).subscribe({
      next: ({ dashboard, jobs }) => {
        this.dashboard = dashboard.dashboard;
        this.jobs = jobs.jobs;
        this.loadingManager = false;

        if (!this.selectedJobId && this.jobs.length > 0) {
          this.selectedJobId = this.jobs[0].id;
        }

        if (this.selectedJobId) {
          this.loadCandidateMatches(this.selectedJobId);
        }
      },
      error: (error: unknown) => {
        this.managerError = friendlyError(error, 'Could not load manager dashboard. Is the backend and database running?');
        this.loadingManager = false;
      }
    });
  }

  loadCandidateMatches(jobId: string): void {
    this.selectedJobId = jobId;
    this.candidateMatches = [];

    if (!jobId) {
      return;
    }

    this.api.getCandidateMatches(jobId).subscribe({
      next: ({ candidates }) => {
        this.candidateMatches = candidates;
      },
      error: (error: unknown) => {
        this.managerError = friendlyError(error, 'Could not load candidate matches.');
      }
    });
  }

  onJobSelection(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.loadCandidateMatches(target.value);
  }

  selectedJob(): Job | undefined {
    return this.jobs.find((job) => job.id === this.selectedJobId);
  }
}
