import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// TODO: Replace with the actual entity attributes
export interface EntityName {
  id: number;
  // field1: string;
  // field2?: string;
}

@Injectable({ providedIn: 'root' })
export class EntityNameService {
  private url = `${environment.apiUrl}/api/entities`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<EntityName[]> {
    return this.http.get<EntityName[]>(this.url);
  }

  getById(id: number): Observable<EntityName> {
    return this.http.get<EntityName>(`${this.url}/${id}`);
  }

  create(data: Partial<EntityName>): Observable<EntityName> {
    return this.http.post<EntityName>(this.url, data);
  }

  update(id: number, data: Partial<EntityName>): Observable<EntityName> {
    return this.http.put<EntityName>(`${this.url}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
