import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../api.service';
import { AiChatComponent } from '../ai-chat/ai-chat.component';
import { DAYS, dayLabel, friendlyError, parseSkills } from '../logic';
import {
  Applicant,
  ApplicantProfileDraft,
  AvailabilityBlock
} from '../models';

interface PortalSnapshot {
  profile: ApplicantProfileDraft;
  skillsText: string;
  availability: AvailabilityBlock[];
}

@Component({
  selector: 'app-applicant-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, AiChatComponent],
  templateUrl: './applicant-portal.component.html'
})
export class ApplicantPortalComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly applicantId = '30000000-0000-0000-0000-000000000001';
  readonly days = DAYS;

  profile: ApplicantProfileDraft = {
    firstName: 'Alex',
    lastName: 'Morgan',
    email: 'alex.morgan@student.example',
    phone: '555-0101',
    preferredContact: 'email',
    major: 'Computer Science',
    yearLevel: 'junior',
    publicSummary: 'Reliable with front desk and basic tech support experience.',
    accessNeeds: 'Prefers clear written steps and lightweight pages.',
    maxWeeklyHours: 12
  };
  skillsText = 'customer service, basic troubleshooting, data entry';
  availability: AvailabilityBlock[] = [
    { dayOfWeek: 2, startTime: '08:00', endTime: '12:00', note: 'Free before afternoon classes' },
    { dayOfWeek: 4, startTime: '13:00', endTime: '17:00', note: 'Available after lab' }
  ];
  saveStatus = 'Draft ready';
  loadError = '';
  loadingApplicant = false;
  savingApplicant = false;
  private savedSnapshot: PortalSnapshot | null = null;

  ngOnInit(): void {
    this.loadApplicant();
  }

  loadApplicant(successMessage = 'Loaded saved applicant profile'): void {
    this.loadingApplicant = true;
    this.loadError = '';

    this.api.getApplicant(this.applicantId).subscribe({
      next: ({ applicant }) => {
        this.applyApplicant(applicant);
        this.savedSnapshot = this.createSnapshot();
        this.saveStatus = successMessage;
        this.loadingApplicant = false;
      },
      error: (error: unknown) => {
        this.loadError = friendlyError(error, 'Could not load applicant data. Using demo draft values.');
        this.savedSnapshot = this.createSnapshot();
        this.loadingApplicant = false;
      }
    });
  }

  saveAll(): void {
    this.savingApplicant = true;
    this.saveStatus = 'Saving profile, skills, and availability...';
    const skills = parseSkills(this.skillsText);

    forkJoin({
      profile: this.api.updateProfile(this.applicantId, this.profile),
      skills: this.api.replaceSkills(this.applicantId, skills),
      availability: this.api.replaceAvailability(this.applicantId, this.availability)
    }).subscribe({
      next: () => {
        this.savingApplicant = false;
        this.loadApplicant('Saved safely. You can still undo draft edits before the next save.');
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

    this.profile = { ...this.savedSnapshot.profile };
    this.skillsText = this.savedSnapshot.skillsText;
    this.availability = this.clone(this.savedSnapshot.availability);
    this.saveStatus = 'Draft edits undone. Saved database data was not changed.';
  }

  addAvailability(): void {
    this.availability = [
      ...this.availability,
      { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', note: '' }
    ];
    this.saveStatus = 'New availability row added. Review it before saving.';
  }

  removeAvailability(index: number): void {
    this.availability = this.availability.filter((_, currentIndex) => currentIndex !== index);
    this.saveStatus = 'Availability row removed from draft. Use Save to commit or Undo to restore.';
  }

  dayLabel(dayOfWeek: number): string {
    return dayLabel(dayOfWeek);
  }

  private applyApplicant(applicant: Applicant): void {
    this.profile = {
      firstName: applicant.first_name,
      lastName: applicant.last_name,
      email: applicant.email,
      phone: applicant.phone ?? '',
      preferredContact: applicant.preferred_contact ?? 'email',
      major: applicant.major ?? '',
      yearLevel: applicant.year_level ?? 'undergraduate',
      publicSummary: applicant.public_summary ?? '',
      accessNeeds: applicant.access_needs ?? '',
      maxWeeklyHours: Number(applicant.max_weekly_hours ?? 12)
    };
    this.skillsText = [...(applicant.skills ?? [])].sort().join(', ');
    this.availability = this.clone(applicant.availability ?? []);
  }

  private createSnapshot(): PortalSnapshot {
    return {
      profile: { ...this.profile },
      skillsText: this.skillsText,
      availability: this.clone(this.availability)
    };
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
