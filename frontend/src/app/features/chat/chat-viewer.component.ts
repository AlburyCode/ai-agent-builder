import { Component, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { ChatService } from '../../core/services/chat.service';
import { ConversationService } from '../../core/services/conversation.service';
import { ChatMessage } from '../../core/models';

@Component({
  selector: 'app-chat-viewer',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, RouterLink, MatInputModule, MatButtonModule, MatIconModule, MatCardModule],
  templateUrl: './chat-viewer.component.html',
  styleUrl: './chat-viewer.component.scss'
})
export class ChatViewerComponent implements OnInit {
  @ViewChild('messagesEnd') private messagesEnd!: ElementRef;

  private readonly route = inject(ActivatedRoute);
  private readonly chatService = inject(ChatService);
  private readonly conversationService = inject(ConversationService);

  agentId!: number;
  messages: ChatMessage[] = [];
  messageInput = '';
  conversationId: number | undefined = undefined;
  isLoading = false;
  isLoadingHistory = false;

  ngOnInit(): void {
    this.agentId = +this.route.snapshot.params['id'];
    this.loadHistory();
  }

  private loadHistory(): void {
    this.isLoadingHistory = true;
    this.conversationService.getByAgent(this.agentId).subscribe({
      next: (conversations) => {
        // Flatten all messages from all past conversations into one timeline
        this.messages = conversations.flatMap(c => c.messages);
        this.isLoadingHistory = false;
        this.scrollToBottom();
      },
      error: () => {
        this.isLoadingHistory = false;
      }
    });
  }

  sendMessage(): void {
    if (!this.messageInput.trim()) {
      return;
    }

    const content = this.messageInput.trim();
    this.messages.push({ role: 'user', content });
    this.messageInput = '';
    this.isLoading = true;
    this.scrollToBottom();

    this.chatService.sendMessage(this.agentId, content, this.conversationId).subscribe({
      next: (res) => {
        this.messages.push({ role: 'assistant', content: res.reply });
        this.conversationId = res.conversationId;
        this.isLoading = false;
        this.scrollToBottom();
      },
      error: () => {
        this.messages.push({ role: 'assistant', content: 'Error al obtener respuesta. Inténtalo de nuevo.' });
        this.isLoading = false;
        this.scrollToBottom();
      }
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  }
}

