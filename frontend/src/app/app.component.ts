import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  readonly tabs = [
    { path: '/applicant', label: 'Applicant Portal', hint: 'DAV-first, low stress' },
    { path: '/manager', label: 'Manager Dashboard', hint: 'Aggregated HR view' }
  ];
}
