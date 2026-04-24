import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { friendlyError } from '../logic';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  submitting = false;
  errorMessage = '';

  readonly demoUsers = [
    { label: 'Applicant: Alex Morgan', email: 'alex.morgan@student.example', role: 'applicant' },
    { label: 'Applicant: Nina Lopez', email: 'nina.lopez@student.example', role: 'applicant' },
    { label: 'Manager: Maya Rivera', email: 'maya.rivera@kean.example', role: 'manager' },
    { label: 'Manager: Sam Patel', email: 'sam.patel@kean.example', role: 'manager' }
  ];

  fillDemo(email: string): void {
    this.form.patchValue({ email, password: 'password123' });
  }

  submit(): void {
    this.errorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: (res) => {
        this.submitting = false;
        this.auth.redirectAfterLogin(res.user);
      },
      error: (err: unknown) => {
        this.submitting = false;
        this.errorMessage = friendlyError(err, 'Login failed. Check your email and password.');
      }
    });
  }
}
