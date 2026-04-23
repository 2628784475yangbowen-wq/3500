import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from '../api.service';
import { AiChatComponent } from '../ai-chat/ai-chat.component';
import { DAYS, dayLabel, friendlyError, parseSkills } from '../logic';
import { Applicant, AvailabilityBlock, Job, JobApplication } from '../models';

type BlockValue = { dayOfWeek: number; startTime: string; endTime: string; note: string };
type PortalValue = {
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
  skillsText: string;
  availability: BlockValue[];
};

@Component({
  selector: 'app-applicant-portal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DragDropModule, AiChatComponent, RouterLink],
  templateUrl: './applicant-portal.component.html'
})
export class ApplicantPortalComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  readonly applicantId = '30000000-0000-0000-0000-000000000001';
  readonly days = DAYS;

  readonly portalForm = this.buildForm();
  saveStatus = 'Draft ready';
  loadError = '';
  loadingApplicant = false;
  savingApplicant = false;
  jobs: Job[] = [];
  jobLoadError = '';
  applicationByJob: Record<string, string> = {};
  applyingJobId: string | null = null;
  private savedSnapshot: PortalValue | null = null;

  get availabilityArray(): FormArray<FormGroup> {
    return this.portalForm.get('availability') as FormArray<FormGroup>;
  }

  ngOnInit(): void {
    this.loadAll();
  }

  private buildForm() {
    return this.fb.group({
      firstName: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
      lastName: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
      email: this.fb.control('', { validators: [Validators.required, Validators.email], nonNullable: true }),
      phone: this.fb.control('', { nonNullable: true }),
      preferredContact: this.fb.control<'email' | 'phone' | 'text'>('email', { nonNullable: true }),
      major: this.fb.control('', { nonNullable: true }),
      yearLevel: this.fb.control('undergraduate', { nonNullable: true }),
      publicSummary: this.fb.control('', { nonNullable: true }),
      accessNeeds: this.fb.control('', { nonNullable: true }),
      maxWeeklyHours: this.fb.control(12, {
        validators: [Validators.required, Validators.min(1), Validators.max(25)],
        nonNullable: true
      }),
      skillsText: this.fb.control('', { nonNullable: true }),
      availability: this.fb.array<FormGroup>([])
    });
  }

  private createBlockGroup(block: Partial<AvailabilityBlock> = {}): FormGroup {
    return this.fb.group({
      dayOfWeek: this.fb.control(block.dayOfWeek ?? 1, { validators: [Validators.required], nonNullable: true }),
      startTime: this.fb.control(block.startTime ?? '09:00', { validators: [Validators.required], nonNullable: true }),
      endTime: this.fb.control(block.endTime ?? '12:00', { validators: [Validators.required], nonNullable: true }),
      note: this.fb.control(block.note ?? '', { nonNullable: true })
    });
  }

  private loadAll(): void {
    this.loadingApplicant = true;
    this.loadError = '';
    this.jobLoadError = '';

    forkJoin({
      jobs: this.api.getJobs().pipe(
        catchError((err: unknown) => {
          this.jobLoadError = friendlyError(err, 'Could not load open jobs.');
          return of({ jobs: [] as Job[] });
        })
      ),
      applications: this.api.getMyApplications(this.applicantId).pipe(
        catchError(() => of({ applications: [] as JobApplication[] }))
      ),
      applicant: this.api.getApplicant(this.applicantId).pipe(
        map((r) => r.applicant),
        catchError((err: unknown) => {
          this.loadError = friendlyError(
            err,
            'Could not load applicant from server. You can still edit the form and try Save when the API is up.'
          );
          return of(null);
        })
      )
    }).subscribe({
      next: ({ jobs, applications, applicant }) => {
        this.jobs = jobs.jobs;
        this.mergeApplications(applications.applications);
        if (applicant) {
          this.patchFromApplicant(applicant);
        } else {
          this.setDemoFormBody();
        }
        this.captureSnapshot();
        this.saveStatus = applicant ? 'Loaded saved applicant profile' : 'Form ready. Connect the API to load live data.';
        this.loadingApplicant = false;
      }
    });
  }

  private mergeApplications(apps: JobApplication[]): void {
    this.applicationByJob = Object.fromEntries(apps.map((a) => [a.jobId, a.status]));
  }

  private setDemoFormBody(): void {
    this.portalForm.patchValue({
      firstName: 'Alex',
      lastName: 'Morgan',
      email: 'alex.morgan@student.example',
      phone: '555-0101',
      preferredContact: 'email',
      major: 'Computer Science',
      yearLevel: 'junior',
      publicSummary: 'Reliable with front desk and basic tech support experience.',
      accessNeeds: 'Prefers clear written steps and lightweight pages.',
      maxWeeklyHours: 12,
      skillsText: 'customer service, basic troubleshooting, data entry'
    });
    this.availabilityArray.clear();
    this.availabilityArray.push(
      this.createBlockGroup({
        dayOfWeek: 2,
        startTime: '08:00',
        endTime: '12:00',
        note: 'Free before afternoon classes'
      })
    );
    this.availabilityArray.push(
      this.createBlockGroup({
        dayOfWeek: 4,
        startTime: '13:00',
        endTime: '17:00',
        note: 'Available after lab'
      })
    );
  }

  private patchFromApplicant(applicant: Applicant): void {
    this.portalForm.patchValue({
      firstName: applicant.first_name,
      lastName: applicant.last_name,
      email: applicant.email,
      phone: applicant.phone ?? '',
      preferredContact: applicant.preferred_contact ?? 'email',
      major: applicant.major ?? '',
      yearLevel: applicant.year_level ?? 'undergraduate',
      publicSummary: applicant.public_summary ?? '',
      accessNeeds: applicant.access_needs ?? '',
      maxWeeklyHours: Number(applicant.max_weekly_hours ?? 12),
      skillsText: [...(applicant.skills ?? [])].sort().join(', ')
    });
    this.availabilityArray.clear();
    for (const block of applicant.availability ?? []) {
      this.availabilityArray.push(this.createBlockGroup(block));
    }
    if (this.availabilityArray.length === 0) {
      this.availabilityArray.push(
        this.createBlockGroup({ dayOfWeek: 1, startTime: '09:00', endTime: '12:00', note: '' })
      );
    }
  }

  loadApplicantFromServer(message = 'Loaded saved applicant profile'): void {
    this.loadingApplicant = true;
    this.loadError = '';
    this.api.getApplicant(this.applicantId).subscribe({
      next: ({ applicant }) => {
        this.patchFromApplicant(applicant);
        this.captureSnapshot();
        this.saveStatus = message;
        this.loadingApplicant = false;
      },
      error: (error: unknown) => {
        this.loadError = friendlyError(error, 'Could not load applicant data. Using demo form values.');
        this.captureSnapshot();
        this.loadingApplicant = false;
      }
    });
  }

  saveAll(): void {
    this.portalForm.markAllAsTouched();
    if (this.portalForm.invalid) {
      this.saveStatus = 'Check highlighted fields, then try Save again.';
      return;
    }

    this.savingApplicant = true;
    this.saveStatus = 'Saving profile, skills, and availability...';
    const v = this.portalForm.getRawValue() as PortalValue;
    const skills = parseSkills(v.skillsText);
    const availability: AvailabilityBlock[] = v.availability.map((b) => ({
      dayOfWeek: b.dayOfWeek,
      startTime: b.startTime,
      endTime: b.endTime,
      note: b.note
    }));
    const profile = {
      firstName: v.firstName,
      lastName: v.lastName,
      email: v.email,
      phone: v.phone,
      preferredContact: v.preferredContact,
      major: v.major,
      yearLevel: v.yearLevel,
      publicSummary: v.publicSummary,
      accessNeeds: v.accessNeeds,
      maxWeeklyHours: v.maxWeeklyHours
    };

    forkJoin({
      profile: this.api.updateProfile(this.applicantId, profile),
      skills: this.api.replaceSkills(this.applicantId, skills),
      availability: this.api.replaceAvailability(this.applicantId, availability)
    }).subscribe({
      next: () => {
        this.savingApplicant = false;
        this.loadApplicantFromServer('Saved safely. You can still undo draft edits before the next save.');
      },
      error: (error: unknown) => {
        this.savingApplicant = false;
        this.saveStatus = friendlyError(error, 'Save failed. Nothing was changed in this screen.');
      }
    });
  }

  undoDraft(): void {
    if (!this.savedSnapshot) {
      this.saveStatus = 'No saved version is available yet.';
      return;
    }
    const s = this.savedSnapshot;
    this.portalForm.patchValue({
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      phone: s.phone,
      preferredContact: s.preferredContact,
      major: s.major,
      yearLevel: s.yearLevel,
      publicSummary: s.publicSummary,
      accessNeeds: s.accessNeeds,
      maxWeeklyHours: s.maxWeeklyHours,
      skillsText: s.skillsText
    });
    this.availabilityArray.clear();
    for (const row of s.availability) {
      this.availabilityArray.push(this.createBlockGroup(row));
    }
    this.saveStatus = 'Draft edits undone. Saved database data was not changed.';
  }

  addAvailability(): void {
    this.availabilityArray.push(
      this.createBlockGroup({ dayOfWeek: 1, startTime: '09:00', endTime: '12:00', note: '' })
    );
    this.saveStatus = 'New availability row added. Review it before saving.';
  }

  removeAvailability(index: number): void {
    this.availabilityArray.removeAt(index);
    this.saveStatus = 'Availability row removed from draft. Use Save to commit or Undo to restore.';
  }

  onAvailabilityDrop(event: CdkDragDrop<FormGroup[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    const a = this.availabilityArray;
    const c = a.at(event.previousIndex);
    a.removeAt(event.previousIndex);
    a.insert(event.currentIndex, c);
    this.saveStatus = 'Reordered. Save to keep this order in the database.';
  }

  dayLabel(dayOfWeek: number): string {
    return dayLabel(dayOfWeek);
  }

  statusLabel(status: string | undefined): string {
    if (!status) {
      return '';
    }
    const m: Record<string, string> = {
      draft: 'Draft',
      submitted: 'Submitted',
      reviewing: 'Under review',
      offered: 'Offer received',
      accepted: 'Accepted',
      declined: 'Not selected'
    };
    return m[status] || status;
  }

  canApply(status: string | undefined): boolean {
    if (!status) {
      return true;
    }
    return status === 'draft' || status === 'declined';
  }

  submitApplication(job: Job, note: string = ''): void {
    this.jobLoadError = '';
    this.applyingJobId = job.id;
    this.api.applyToJob(this.applicantId, job.id, note).subscribe({
      next: ({ application }) => {
        this.applicationByJob[application.jobId] = application.status;
        this.applyingJobId = null;
        this.saveStatus = `Applied to ${job.title}. Managers will see it after refresh.`;
      },
      error: (err: unknown) => {
        this.applyingJobId = null;
        this.jobLoadError = friendlyError(err, 'Application failed. Try again in a moment.');
      }
    });
  }

  private captureSnapshot(): void {
    const raw = this.portalForm.getRawValue() as PortalValue;
    this.savedSnapshot = {
      ...raw,
      availability: raw.availability.map((b) => ({ ...b }))
    };
  }
}
