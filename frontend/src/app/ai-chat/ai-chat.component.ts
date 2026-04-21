import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../api.service';
import { friendlyError } from '../logic';

interface ChatMessage {
  role: 'assistant' | 'user';
  text: string;
}

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chat.component.html'
})
export class AiChatComponent {
  @Input() applicantId = '';

  private readonly api = inject(ApiService);

  chatInput = 'I am free on Tuesday mornings and I know basic troubleshooting. What jobs can I do?';
  chatMessages: ChatMessage[] = [
    {
      role: 'assistant',
      text: 'Tell me your free time and skills in one sentence. I will keep the answer short and job-focused.'
    }
  ];
  chatError = '';
  sendingChat = false;

  sendChat(): void {
    const message = this.chatInput.trim();

    if (!message) {
      this.chatError = 'Type a short question first.';
      return;
    }

    this.chatMessages = [...this.chatMessages, { role: 'user', text: message }];
    this.chatInput = '';
    this.sendingChat = true;
    this.chatError = '';

    this.api.chat(message, this.applicantId).subscribe({
      next: (response) => {
        this.chatMessages = [...this.chatMessages, { role: 'assistant', text: response.reply }];
        this.sendingChat = false;
      },
      error: (error: unknown) => {
        this.chatError = friendlyError(error, 'The assistant could not answer right now.');
        this.sendingChat = false;
      }
    });
  }
}
