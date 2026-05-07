---
mode: agent
description: >
  Crea el componente ConversationsHistoryComponent para el backoffice Angular.
  Muestra todas las conversaciones de un agente (widget público + backoffice),
  identificando el origen de cada una con un chip visual según userId === null o no.
tools:
  - createFile
  - editFile
---

# Conversations History — Componente de historial (frontend Angular)

Implementa la pantalla de historial de conversaciones del backoffice. Crea los tres ficheros del componente, actualiza el modelo, el servicio, las rutas y la tabla de agentes. **Sigue exactamente el orden de pasos indicado.**

---

## PASO 1 — Actualizar el modelo Conversation

Edita `/frontend/src/app/core/models/index.ts`.

Añade `userId: number | null` al interfaz `Conversation`:

```typescript
export interface Conversation {
  id: number;
  agentId: number;
  userId: number | null;
  messages: ChatMessage[];
  createdAt: string;
}
```

---

## PASO 2 — Añadir método al servicio de conversaciones

Edita `/frontend/src/app/core/services/conversation.service.ts`.

Añade el método `getAllByAgent` después del método `getByAgent` existente:

```typescript
getAllByAgent(agentId: number): Observable<Conversation[]> {
  return this.api.get<Conversation[]>(`/conversations/agent/${agentId}/all`);
}
```

---

## PASO 3 — Crear el componente TypeScript

Crea `/frontend/src/app/features/conversations/conversations-history.component.ts` con este contenido exacto:

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { NgFor, NgIf, NgClass, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConversationService } from '../../core/services/conversation.service';
import { Conversation } from '../../core/models';

@Component({
  selector: 'app-conversations-history',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    NgClass,
    DatePipe,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './conversations-history.component.html',
  styleUrl: './conversations-history.component.scss'
})
export class ConversationsHistoryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly conversationService = inject(ConversationService);

  agentId!: number;
  conversations: Conversation[] = [];
  isLoading = false;

  get widgetConversations(): Conversation[] {
    return this.conversations.filter(c => c.userId === null);
  }

  get privateConversations(): Conversation[] {
    return this.conversations.filter(c => c.userId !== null);
  }

  ngOnInit(): void {
    this.agentId = +this.route.snapshot.params['id'];
    this.loadConversations();
  }

  private loadConversations(): void {
    this.isLoading = true;
    this.conversationService.getAllByAgent(this.agentId).subscribe({
      next: (conversations) => {
        this.conversations = conversations;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}
```

---

## PASO 4 — Crear la plantilla HTML

Crea `/frontend/src/app/features/conversations/conversations-history.component.html` con este contenido exacto:

```html
<div class="conversations-container">
  <div class="header">
    <div class="header-left">
      <button mat-icon-button [routerLink]="['/agents']" matTooltip="Volver a agentes">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <h2>Historial de conversaciones</h2>
    </div>
    <div class="header-stats" *ngIf="!isLoading">
      <span class="stat-badge widget-badge">
        <mat-icon>public</mat-icon>
        {{ widgetConversations.length }} widget
      </span>
      <span class="stat-badge private-badge">
        <mat-icon>lock</mat-icon>
        {{ privateConversations.length }} backoffice
      </span>
    </div>
  </div>

  <div *ngIf="isLoading" class="loading-container">
    <mat-spinner diameter="48"></mat-spinner>
  </div>

  <div *ngIf="!isLoading && conversations.length === 0" class="empty-state">
    <mat-icon>forum</mat-icon>
    <p>Este agente aún no ha recibido ninguna conversación.</p>
  </div>

  <div *ngIf="!isLoading && conversations.length > 0" class="conversations-list">
    <mat-accordion multi>
      <mat-expansion-panel
        *ngFor="let conv of conversations; let i = index"
        class="conversation-panel"
        [ngClass]="conv.userId === null ? 'panel-widget' : 'panel-private'"
      >
        <mat-expansion-panel-header>
          <mat-panel-title class="panel-title">
            <span class="conv-index">#{{ i + 1 }}</span>
            <span
              class="origin-chip"
              [class.chip-widget]="conv.userId === null"
              [class.chip-private]="conv.userId !== null"
              [matTooltip]="conv.userId === null ? 'Conversación anónima desde el widget público' : 'Conversación autenticada desde el backoffice'"
            >
              <mat-icon>{{ conv.userId === null ? 'public' : 'lock' }}</mat-icon>
              {{ conv.userId === null ? 'Widget público' : 'Backoffice' }}
            </span>
            <span class="msg-count">{{ conv.messages.length }} mensaje{{ conv.messages.length !== 1 ? 's' : '' }}</span>
          </mat-panel-title>
          <mat-panel-description>
            {{ conv.createdAt | date:'dd/MM/yyyy HH:mm' }}
          </mat-panel-description>
        </mat-expansion-panel-header>

        <div class="messages-container">
          <div
            *ngFor="let msg of conv.messages"
            class="message"
            [class.message-user]="msg.role === 'user'"
            [class.message-assistant]="msg.role === 'assistant'"
          >
            <mat-icon class="msg-icon">{{ msg.role === 'user' ? 'person' : 'smart_toy' }}</mat-icon>
            <div class="msg-bubble">
              <span class="msg-role">{{ msg.role === 'user' ? 'Usuario' : 'Agente' }}</span>
              <p class="msg-content">{{ msg.content }}</p>
            </div>
          </div>

          <div *ngIf="conv.messages.length === 0" class="no-messages">
            Sin mensajes en esta conversación.
          </div>
        </div>
      </mat-expansion-panel>
    </mat-accordion>
  </div>
</div>
```

---

## PASO 5 — Crear los estilos SCSS

Crea `/frontend/src/app/features/conversations/conversations-history.component.scss` con este contenido exacto:

```scss
.conversations-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 16px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;

  h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 500;
  }
}

.header-stats {
  display: flex;
  gap: 10px;
}

.stat-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 500;

  mat-icon {
    font-size: 16px;
    width: 16px;
    height: 16px;
  }

  &.widget-badge {
    background: #e3f2fd;
    color: #1565c0;
  }

  &.private-badge {
    background: #f3e5f5;
    color: #6a1b9a;
  }
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 0;
  color: rgba(0, 0, 0, 0.38);

  mat-icon {
    font-size: 64px;
    width: 64px;
    height: 64px;
    margin-bottom: 16px;
  }

  p {
    font-size: 1rem;
    margin: 0;
  }
}

.conversations-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conversation-panel {
  border-left: 4px solid transparent;
  border-radius: 4px !important;

  &.panel-widget {
    border-left-color: #1976d2;
  }

  &.panel-private {
    border-left-color: #7b1fa2;
  }
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.conv-index {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  font-size: 0.9rem;
  min-width: 28px;
}

.origin-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;

  mat-icon {
    font-size: 14px;
    width: 14px;
    height: 14px;
  }

  &.chip-widget {
    background: #e3f2fd;
    color: #1565c0;
  }

  &.chip-private {
    background: #f3e5f5;
    color: #6a1b9a;
  }
}

.msg-count {
  font-size: 0.82rem;
  color: rgba(0, 0, 0, 0.5);
}

.messages-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}

.message {
  display: flex;
  gap: 10px;
  align-items: flex-start;

  .msg-icon {
    margin-top: 4px;
    font-size: 20px;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  &.message-user {
    .msg-icon { color: #1976d2; }

    .msg-bubble {
      background: #e3f2fd;
      border-radius: 0 12px 12px 12px;
    }
  }

  &.message-assistant {
    flex-direction: row-reverse;

    .msg-icon { color: #388e3c; }

    .msg-bubble {
      background: #f1f8e9;
      border-radius: 12px 0 12px 12px;
      text-align: right;
    }
  }
}

.msg-bubble {
  padding: 8px 14px;
  max-width: 75%;

  .msg-role {
    display: block;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(0, 0, 0, 0.5);
    margin-bottom: 4px;
  }

  .msg-content {
    margin: 0;
    font-size: 0.92rem;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
}

.no-messages {
  font-size: 0.9rem;
  color: rgba(0, 0, 0, 0.38);
  font-style: italic;
  text-align: center;
  padding: 16px 0;
}
```

---

## PASO 6 — Registrar la ruta en app.routes.ts

Edita `/frontend/src/app/app.routes.ts`.

Añade la ruta de conversaciones **antes** de la ruta `agents/:id/chat`:

```typescript
{
  path: 'agents/:id/conversations',
  loadComponent: () =>
    import('./features/conversations/conversations-history.component').then(m => m.ConversationsHistoryComponent),
  canActivate: [authGuard]
},
```

---

## PASO 7 — Añadir el botón en la tabla de agentes

Edita `/frontend/src/app/features/agents/agent-list/agent-list.component.ts`.

Añade `MatTooltipModule` a los imports:

```typescript
import { MatTooltipModule } from '@angular/material/tooltip';
```

Y añádelo también al array `imports` del decorador `@Component`:

```typescript
imports: [
  MatTableModule,
  MatButtonModule,
  MatIconModule,
  MatCardModule,
  RouterLink,
  AsyncPipe,
  NgIf,
  MatTooltipModule
],
```

Edita `/frontend/src/app/features/agents/agent-list/agent-list.component.html`.

Añade el botón de conversaciones **entre** el botón de documentos y el botón de chat:

```html
<button mat-icon-button [routerLink]="['/agents', agent.id, 'conversations']" matTooltip="Conversaciones">
  <mat-icon>forum</mat-icon>
</button>
```

El bloque de acciones debe quedar así:

```html
<button mat-icon-button [routerLink]="['/agents', agent.id, 'edit']" matTooltip="Editar">
  <mat-icon>edit</mat-icon>
</button>
<button mat-icon-button [routerLink]="['/agents', agent.id, 'documents']" matTooltip="Documentos">
  <mat-icon>description</mat-icon>
</button>
<button mat-icon-button [routerLink]="['/agents', agent.id, 'conversations']" matTooltip="Conversaciones">
  <mat-icon>forum</mat-icon>
</button>
<button mat-icon-button [routerLink]="['/agents', agent.id, 'chat']" matTooltip="Chat">
  <mat-icon>chat</mat-icon>
</button>
<button mat-icon-button [routerLink]="['/agents', agent.id, 'widget']" matTooltip="Widget">
  <mat-icon>settings</mat-icon>
</button>
<button mat-icon-button color="warn" (click)="deleteAgent(agent.id)" matTooltip="Eliminar">
  <mat-icon>delete</mat-icon>
</button>
```
