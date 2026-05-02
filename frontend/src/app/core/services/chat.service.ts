import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly api = inject(ApiService);

  sendMessage(
    agentId: number,
    message: string,
    conversationId?: number
  ): Observable<{ reply: string; conversationId: number }> {
    return this.api.post<{ reply: string; conversationId: number }>('/chat/message', {
      agentId,
      message,
      conversationId
    });
  }
}
