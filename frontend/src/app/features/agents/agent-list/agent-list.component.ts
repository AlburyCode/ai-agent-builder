import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AsyncPipe, NgIf } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AgentService } from '../../../core/services/agent.service';
import { Agent } from '../../../core/models';

@Component({
  selector: 'app-agent-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule,
    RouterLink,
    AsyncPipe,
    NgIf
  ],
  templateUrl: './agent-list.component.html',
  styleUrl: './agent-list.component.scss'
})
export class AgentListComponent implements OnInit {
  private readonly agentService = inject(AgentService);
  private readonly router = inject(Router);

  agents: Agent[] = [];
  displayedColumns: string[] = ['name', 'description', 'actions'];

  ngOnInit(): void {
    this.agentService.getAgents().subscribe({
      next: (agents) => (this.agents = agents),
      error: () => (this.agents = [])
    });
  }

  deleteAgent(id: number): void {
    if (!window.confirm('¿Seguro que quieres eliminar este agente?')) return;

    this.agentService.deleteAgent(id).subscribe({
      next: () => (this.agents = this.agents.filter(a => a.id !== id))
    });
  }
}
