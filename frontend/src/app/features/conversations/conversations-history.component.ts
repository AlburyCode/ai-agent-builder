import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgFor, NgIf, NgClass, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConversationService } from '../../core/services/conversation.service';
import { Conversation } from '../../core/models';

@Component({
  selector: 'app-conversations-history',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    NgClass,
    DatePipe,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './conversations-history.component.html',
  styleUrl: './conversations-history.component.scss'
})
export class ConversationsHistoryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly conversationService = inject(ConversationService);

  agentId!: number;
  conversations: Conversation[] = [];
  isLoading = false;

  get widgetConversations(): Conversation[] {
    return this.conversations.filter(c => c.userId === null);
  }

  get privateConversations(): Conversation[] {
    return this.conversations.filter(c => c.userId !== null);
  }

  ngOnInit(): void {
    this.agentId = +this.route.snapshot.params['id'];
    this.loadConversations();
  }

  loadConversations(): void {
    this.isLoading = true;
    this.conversationService.getAllByAgent(this.agentId).subscribe({
      next: (conversations) => {
        this.conversations = conversations;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}
