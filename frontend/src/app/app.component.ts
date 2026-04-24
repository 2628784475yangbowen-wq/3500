import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';

interface Tab {
  path: string;
  label: string;
  hint: string;
  role: 'applicant' | 'manager';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private readonly auth = inject(AuthService);

  readonly currentUser = this.auth.currentUser;
  readonly isLoggedIn = this.auth.isLoggedIn;

  private readonly allTabs: Tab[] = [
    { path: '/applicant', label: 'Applicant Portal', hint: 'DAV-first, low stress', role: 'applicant' },
    { path: '/manager', label: 'Manager Dashboard', hint: 'Aggregated HR view', role: 'manager' }
  ];

  readonly visibleTabs = computed<Tab[]>(() => {
    const user = this.currentUser();
    if (!user) return [];
    return this.allTabs.filter((tab) => tab.role === user.role);
  });

  logout(): void {
    this.auth.logout();
  }
}
