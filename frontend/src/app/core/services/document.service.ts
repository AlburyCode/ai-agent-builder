import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Document } from '../models';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly api = inject(ApiService);

  getDocuments(agentId: number): Observable<Document[]> {
    return this.api.get<Document[]>(`/documents/${agentId}`);
  }

  uploadDocument(agentId: number, file: File): Observable<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('agentId', String(agentId));
    // No establecer Content-Type manualmente: el navegador lo gestiona con el boundary multipart
    return this.api.post<Document>('/documents/upload', formData);
  }

  deleteDocument(documentId: number): Observable<void> {
    return this.api.delete<void>(`/documents/${documentId}`);
  }
}
