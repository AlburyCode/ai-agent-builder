import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'agents', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'agents',
    loadComponent: () =>
      import('./features/agents/agent-list/agent-list.component').then(m => m.AgentListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'agents/new',
    loadComponent: () =>
      import('./features/agents/agent-form/agent-form.component').then(m => m.AgentFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'agents/:id/edit',
    loadComponent: () =>
      import('./features/agents/agent-form/agent-form.component').then(m => m.AgentFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'agents/:id/documents',
    loadComponent: () =>
      import('./features/documents/documents.component').then(m => m.DocumentsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'agents/:id/chat',
    loadComponent: () =>
      import('./features/chat/chat-viewer.component').then(m => m.ChatViewerComponent),
    canActivate: [authGuard]
  },
  {
    path: 'agents/:id/widget',
    loadComponent: () =>
      import('./features/widget-config/widget-config.component').then(m => m.WidgetConfigComponent),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: 'login' }
];
