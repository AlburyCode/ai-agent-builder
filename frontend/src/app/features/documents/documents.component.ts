import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIf, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DocumentService } from '../../core/services/document.service';
import { Document } from '../../core/models';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressBarModule,
    NgIf,
    DatePipe,
    RouterLink
  ],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.scss'
})
export class DocumentsComponent implements OnInit {
  private readonly documentService = inject(DocumentService);
  private readonly route = inject(ActivatedRoute);

  agentId!: number;
  documents: Document[] = [];
  displayedColumns: string[] = ['fileName', 'fileType', 'createdAt', 'actions'];
  isUploading = false;
  deletingId: number | null = null;

  ngOnInit(): void {
    this.agentId = +this.route.snapshot.paramMap.get('id')!;
    this.loadDocuments();
  }

  private loadDocuments(): void {
    this.documentService.getDocuments(this.agentId).subscribe({
      next: (docs) => (this.documents = docs),
      error: () => (this.documents = [])
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isUploading = true;
    this.documentService.uploadDocument(this.agentId, file).subscribe({
      next: () => {
        this.isUploading = false;
        input.value = '';
        this.loadDocuments();
      },
      error: () => {
        this.isUploading = false;
        input.value = '';
      }
    });
  }

  deleteDocument(doc: Document): void {
    if (!window.confirm(`¿Eliminar el documento "${doc.fileName}"?`)) return;

    this.deletingId = doc.id;
    this.documentService.deleteDocument(doc.id).subscribe({
      next: () => {
        this.deletingId = null;
        this.loadDocuments();
      },
      error: () => {
        this.deletingId = null;
      }
    });
  }
}
