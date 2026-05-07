import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-widget-config',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatSnackBarModule
  ],
  templateUrl: './widget-config.component.html',
  styleUrl: './widget-config.component.scss'
})
export class WidgetConfigComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  agentId!: number;
  form!: FormGroup;
  snippetCode = '';

  constructor() {
    this.form = this.fb.group({
      primaryColor: ['#1976d2'],
      position: ['bottom-right'],
      title: ['Chat con nosotros']
    });
  }

  ngOnInit(): void {
    this.agentId = +this.route.snapshot.params['id'];
    this.updateSnippet();

    this.form.valueChanges.subscribe(() => this.updateSnippet());
  }

  private updateSnippet(): void {
    const { primaryColor, position, title } = this.form.value;
    this.snippetCode =
`<script
  src="${environment.widgetUrl}/widget.js"
  data-agent-id="${this.agentId}"
  data-color="${primaryColor}"
  data-position="${position}"
  data-title="${title}">
</script>`;
  }

  copySnippet(): void {
    navigator.clipboard.writeText(this.snippetCode).then(() => {
      this.snackBar.open('Copiado al portapapeles', 'Cerrar', { duration: 2500 });
    });
  }

  openPreview(): void {
    const { title, primaryColor, position } = this.form.value;
    const params = new URLSearchParams({
      agentId: String(this.agentId),
      title,
      color: primaryColor,
      position,
    });
    window.open(`${environment.widgetUrl}?${params.toString()}`, '_blank');
  }
}
