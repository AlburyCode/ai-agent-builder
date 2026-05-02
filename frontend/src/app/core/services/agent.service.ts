import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Agent } from '../models';

@Injectable({ providedIn: 'root' })
export class AgentService {
  private readonly api = inject(ApiService);

  getAgents(): Observable<Agent[]> {
    return this.api.get<Agent[]>('/agents');
  }

  getAgent(id: number): Observable<Agent> {
    return this.api.get<Agent>(`/agents/${id}`);
  }

  createAgent(data: { name: string; description?: string; instructions?: string }): Observable<Agent> {
    return this.api.post<Agent>('/agents', data);
  }

  updateAgent(id: number, data: Partial<{ name: string; description: string; instructions: string }>): Observable<Agent> {
    return this.api.put<Agent>(`/agents/${id}`, data);
  }

  deleteAgent(id: number): Observable<void> {
    return this.api.delete<void>(`/agents/${id}`);
  }
}
