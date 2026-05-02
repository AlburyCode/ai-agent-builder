import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Conversation } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ConversationService {
  private readonly api = inject(ApiService);

  getByAgent(agentId: number): Observable<Conversation[]> {
    return this.api.get<Conversation[]>(`/conversations/agent/${agentId}`);
  }
}
