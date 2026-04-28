---
applyTo: "frontend/src/app/**/*.service.ts"
---

# Instrucciones para servicios Angular — AI Agent Builder

Aplica estas reglas a TODOS los archivos `*.service.ts` en `frontend/src/app/`.

---

## Cuándo usar cada tipo de `@Injectable` — regla de performance

La elección afecta directamente al **tree-shaking** y al **bundle size**.

| Escenario | Configuración | Resultado |
|-----------|--------------|-----------|
| Servicio global compartido por toda la app (auth, api, notificaciones) | `providedIn: 'root'` | Singleton en el root injector. Incluido en el bundle inicial. |
| Servicio usado **solo** dentro de una feature cargada con `loadComponent` / lazy route | `providedIn: 'root'` también es válido — Angular hace tree-shaking si nadie lo importa en el bundle eagerly | Preferir `root` salvo que necesites instancias separadas por feature |
| Servicio con **estado propio por instancia de componente** (ej: stepper, wizard, carrito temporal) | `providers: [MiServicio]` en el `@Component` que lo necesite | Nueva instancia por cada instancia del componente. Se destruye con el componente. |
| Servicio de **estado compartido solo dentro de una feature lazy** con múltiples componentes que necesitan instancias aisladas entre features | `providers: [MiServicio]` en el componente raíz de la feature (el que actúa como layout) | Instancia compartida dentro de esa sub-jerarquía, destruida al salir de la feature. |

### Regla práctica para este proyecto

```
¿Necesitas una sola instancia global y sin estado por instancia?
  → providedIn: 'root'   ← caso 90% de los servicios

¿El servicio tiene estado que debe vivir y morir con un componente concreto?
  → providers: [MiServicio] en @Component

¿Necesitas aislar el estado entre dos instancias de la misma feature abierta en paralelo?
  → providers: [MiServicio] en el componente raíz de cada instancia de la feature
```

### Ejemplos en este proyecto

```typescript
// ✅ root — servicios de datos y auth (globales, sin estado por instancia)
@Injectable({ providedIn: 'root' })
export class AgentService { ... }

@Injectable({ providedIn: 'root' })
export class AuthService { ... }

// ✅ providers en @Component — estado temporal de un formulario multi-paso
// (si en el futuro se añade un wizard de configuración de agente)
@Component({
  selector: 'app-agent-wizard',
  providers: [AgentWizardStateService]  // nueva instancia por cada wizard abierto
})
export class AgentWizardComponent { ... }
```

> **Nunca** uses `providedIn: 'any'` — está deprecado desde Angular 14 y su comportamiento
> en el contexto de lazy loading con standalone components es inconsistente.

---

## Estructura estándar de un servicio

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'  // singleton global — válido para el 90% de los servicios de este proyecto
})
export class MyEntityService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getAll(): Observable<MyEntity[]> {
    return this.http.get<MyEntity[]>(`${this.apiUrl}/endpoint`);
  }

  getById(id: number): Observable<MyEntity> {
    return this.http.get<MyEntity>(`${this.apiUrl}/endpoint/${id}`);
  }

  create(data: Partial<MyEntity>): Observable<MyEntity> {
    return this.http.post<MyEntity>(`${this.apiUrl}/endpoint`, data);
  }

  update(id: number, data: Partial<MyEntity>): Observable<MyEntity> {
    return this.http.put<MyEntity>(`${this.apiUrl}/endpoint/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/endpoint/${id}`);
  }
}
```

---

## Reglas para `auth.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'aiagentbuilder_token'; // clave consistente
  private readonly USER_KEY = 'aiagentbuilder_user';

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap(response => {
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): User | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  }
}
```

---

## Interfaces TypeScript de este proyecto

Define las interfaces en `core/models/` y exportarlas desde `core/models/index.ts`:

```typescript
// core/models/index.ts
export interface User {
  id: number;
  email: string;
  role: 'admin' | 'user';
}

export interface Agent {
  id: number;
  name: string;
  description?: string;
  instructions?: string;
  openaiVectorStoreId?: string;
  userId: number;
  createdAt?: string;
}

export interface Document {
  id: number;
  agentId: number;
  fileName: string;
  fileType: string;
  openaiFileId: string;
  createdAt?: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Conversation {
  id: number;
  agentId: number;
  messages: Message[];
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ChatResponse {
  reply: string;
  conversationId: number;
}
```

---

## Uso de `environment.apiUrl`

```typescript
// ✅ CORRECTO — siempre usar environment.apiUrl como base
private apiUrl = environment.apiUrl; // 'http://localhost:3000'

this.http.get(`${this.apiUrl}/agents`)

// ❌ INCORRECTO — nunca hardcodear la URL
this.http.get('http://localhost:3000/agents')
```

---

## Manejo de errores en componentes

Los servicios devuelven `Observable`. El componente se suscribe y maneja errores:

```typescript
// En el componente
this.agentService.getAll().subscribe({
  next: (agents) => {
    this.agents = agents;
    this.loading = false;
  },
  error: (err) => {
    this.errorMessage = err.error?.error || 'Error al cargar los agentes';
    this.loading = false;
  }
});
```
