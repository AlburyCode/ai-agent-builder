import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { TextFieldModule } from '@angular/cdk/text-field';
import { AgentService } from '../../../core/services/agent.service';

@Component({
  selector: 'app-agent-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgIf,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    TextFieldModule,
    RouterLink
  ],
  templateUrl: './agent-form.component.html',
  styleUrl: './agent-form.component.scss'
})
export class AgentFormComponent implements OnInit {
  private readonly agentService = inject(AgentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  form!: FormGroup;
  isEditMode = false;
  agentId: number | null = null;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      instructions: ['']
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.agentId = +id;
      this.agentService.getAgent(this.agentId).subscribe({
        next: (agent) => {
          this.form.patchValue({
            name: agent.name,
            description: agent.description,
            instructions: agent.instructions
          });
        }
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const data = this.form.value;

    if (this.isEditMode && this.agentId !== null) {
      this.agentService.updateAgent(this.agentId, data).subscribe({
        next: () => this.router.navigate(['/agents'])
      });
    } else {
      this.agentService.createAgent(data).subscribe({
        next: () => this.router.navigate(['/agents'])
      });
    }
  }
}
