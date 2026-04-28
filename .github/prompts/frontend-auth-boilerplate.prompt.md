---
mode: agent
description: 'Boilerplate de Angular 17+ para AI Agent Builder: crea el proyecto, instala Angular Material, configura la estructura de carpetas, los modelos TypeScript, el servicio de auth con BehaviorSubject, interceptor JWT funcional, guard funcional, app.config con provideAnimationsAsync y los componentes de login y registro. Sigue estrictamente las instrucciones de .github/instructions/angular-components.instructions.md y angular-services.instructions.md'
tools:
  - createFile
  - runCommand
  - codebase
---

# Frontend Auth Boilerplate — AI Agent Builder

Genera el arranque completo del frontend Angular para el proyecto AI Agent Builder.
Sigue ESTRICTAMENTE las instrucciones en `.github/instructions/angular-components.instructions.md`
y `.github/instructions/angular-services.instructions.md`.

Trabaja dentro de la carpeta `/frontend`. Si ya existe como carpeta vacía, ejecuta los comandos desde ahí.

---

## PASO 1 — Inicializar el proyecto Angular

Desde la raíz del workspace, ejecuta:

```bash
ng new frontend --routing --style=scss --standalone --skip-git --directory frontend --force
```

Si el comando falla porque la carpeta existe, entra en `/frontend` y ejecuta:

```bash
ng new . --routing --style=scss --standalone --skip-git
```

---

## PASO 2 — Verificar y completar la configuración de TypeScript

`ng new` genera `tsconfig.json` y `tsconfig.app.json` automáticamente. Verifica que `tsconfig.json` contiene exactamente estas opciones clave (añade las que falten, no elimines las que ya estén):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "dom"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "experimentalDecorators": true,
    "sourceMap": true
  },
  "angularCompilerOptions": {
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  }
}
```

> **Por qué esta configuración:**
> - `target/module: ES2022` — Angular CLI usa esbuild como bundler; no necesita bajar a ES5 porque el bundler hace el transpile final para los navegadores objetivo.
> - `moduleResolution: bundler` — delega la resolución de módulos a esbuild/webpack, no a Node. Es obligatorio con `module: ES2022`.
> - `lib: ["ES2022", "dom"]` — incluye las APIs del navegador (DOM, fetch, localStorage…) que no existen en el servidor.
> - `isolatedModules: true` — cada archivo se compila de forma independiente; permite compilación incremental más rápida y es requerido por esbuild.
> - `experimentalDecorators: true` — requerido para que funcionen `@Component`, `@Injectable`, `@Input`, etc.
> - `sourceMap: true` — genera mapas de código fuente para depurar TypeScript directamente en las DevTools del navegador.
> - `strict: true` + `strictTemplates: true` — detecta errores de tipos también dentro de las plantillas HTML.

---

## PASO 4 — Instalar Angular Material y dependencias

Dentro de `/frontend`, ejecuta:

```bash
ng add @angular/material --theme=indigo-pink --typography=true --animations=enabled --skip-confirmation
npm install @angular/cdk
```

Tras la instalación, **verifica manualmente `src/app/app.config.ts`**: debe contener `provideAnimationsAsync()`.
Si no está, añádelo importándolo desde `'@angular/platform-browser/animations/async'`.

---

## PASO 5 — Crear la estructura de carpetas

Dentro de `/frontend/src/app/`, crea la siguiente estructura con archivos `.gitkeep` vacíos donde haga falta:

```
src/app/
├── features/
│   ├── auth/
│   │   ├── login/
│   │   └── register/
│   ├── agents/
│   │   ├── agent-list/
│   │   └── agent-form/
│   ├── documents/
│   ├── chat/
│   └── widget-config/
├── core/
│   ├── services/
│   ├── interceptors/
│   ├── guards/
│   └── models/
└── shared/
    └── components/
```

---

## PASO 6 — Crear el archivo de entorno

Crea `/frontend/src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000'
};
```

Si el archivo ya existe, actualiza el valor de `apiUrl` a `'http://localhost:3000'`.

---

## PASO 7 — Crear las interfaces TypeScript del proyecto

Crea `/frontend/src/app/core/models/index.ts`:

```typescript
export interface User {
  id: number;
  email: string;
  role: string;
}

export interface Agent {
  id: number;
  name: string;
  description: string;
  instructions: string;
  openaiVectorStoreId?: string;
  userId: number;
  createdAt: string;
}

export interface Document {
  id: number;
  agentId: number;
  fileName: string;
  fileType: string;
  openaiFileId: string;
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Conversation {
  id: number;
  agentId: number;
  messages: ChatMessage[];
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
```

---

## PASO 8 — Estrategia de `@Injectable` según el tipo de servicio

Antes de crear los servicios aplica esta regla para elegir la configuración correcta:

| Tipo de servicio | Configuración | Cuándo usarlo |
|-----------------|--------------|---------------|
| Global compartido (auth, api, notificaciones) | `providedIn: 'root'` | La instancia se crea una vez y vive toda la sesión. Angular lo tree-shakes si ningún bundle eagerly lo importa. **Caso por defecto.** |
| Estado temporal ligado a un componente | `providers: [MiServicio]` en `@Component` | Nueva instancia por cada instancia del componente; se destruye cuando el componente se destruye. Ideal para wizards, steppers, carritos temporales. |
| Estado aislado dentro de una feature lazy | `providers: [MiServicio]` en el componente raíz de la feature | Compartido por la sub-jerarquía del componente raíz, sin contaminar otras features. Útil cuando dos rutas lazy necesitan instancias independientes del mismo servicio. |

> **Nunca** uses `providedIn: 'any'` — deprecado en Angular 14, comportamiento inconsistente con standalone components.

Para este boilerplate todos los servicios del `core/` son globales → `providedIn: 'root'`.

---

## PASO 9 — Crear el servicio genérico HTTP

Crea `/frontend/src/app/core/services/api.service.ts`:

- `@Injectable({ providedIn: 'root' })`
- Inyectar `HttpClient` con `inject(HttpClient)`
- Propiedad privada `baseUrl = environment.apiUrl`
- Métodos genéricos que devuelven `Observable<T>`:
  - `get<T>(path: string): Observable<T>` → `this.http.get<T>(\`${this.baseUrl}${path}\`)`
  - `post<T>(path: string, body: unknown): Observable<T>` → POST
  - `put<T>(path: string, body: unknown): Observable<T>` → PUT
  - `delete<T>(path: string): Observable<T>` → DELETE
- Importar `environment` desde `'../../../environments/environment'`

---

## PASO 10 — Crear el servicio de autenticación

Crea `/frontend/src/app/core/services/auth.service.ts`:

- `@Injectable({ providedIn: 'root' })`
- Inyección con `inject()`: `ApiService`, `Router`
- Claves de localStorage como constantes privadas de solo lectura:
  ```typescript
  private readonly TOKEN_KEY = 'aiagentbuilder_token';
  private readonly USER_KEY = 'aiagentbuilder_user';
  ```
- `BehaviorSubject<User | null>` privado inicializado desde localStorage:
  ```typescript
  private currentUser$ = new BehaviorSubject<User | null>(
    JSON.parse(localStorage.getItem('aiagentbuilder_user') || 'null')
  );
  ```
- `isLoggedIn$: Observable<boolean>` derivado del BehaviorSubject con `map(user => user !== null)`
- Método `login(email: string, password: string): Observable<AuthResponse>`:
  - Llama a `this.api.post<AuthResponse>('/auth/login', { email, password })`
  - Con `pipe(tap(response => { ... }))` guarda token y user en localStorage, actualiza el BehaviorSubject
- Método `register(email: string, password: string): Observable<AuthResponse>`:
  - Mismo patrón con POST a `'/auth/register'`
- Método `logout(): void`:
  - Elimina `this.TOKEN_KEY` y `this.USER_KEY` de localStorage
  - Llama a `this.currentUser$.next(null)`
  - Navega a `'/login'` con Router
- Getter `getToken(): string | null` → `localStorage.getItem(this.TOKEN_KEY)`
- Getter `isLoggedIn(): boolean` → `!!this.getToken()` (síncrono)
- Getter `currentUser` → valor actual del BehaviorSubject (`.getValue()`)

---

## PASO 11 — Crear el interceptor JWT funcional

Crea `/frontend/src/app/core/interceptors/auth.interceptor.ts`:

```typescript
import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
```

**IMPORTANTE**: Debe ser una función `HttpInterceptorFn`, NUNCA una clase que implemente `HttpInterceptor`.

---

## PASO 12 — Crear el guard funcional

Crea `/frontend/src/app/core/guards/auth.guard.ts`:

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};
```

**IMPORTANTE**: Debe ser `CanActivateFn`, NUNCA una clase que implemente `CanActivate`.

---

## PASO 13 — Actualizar app.config.ts

Actualiza `/frontend/src/app/app.config.ts` con este contenido exacto:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
  ]
};
```

**CRÍTICO**: Usar `provideAnimationsAsync()` (de `@angular/platform-browser/animations/async`), NUNCA `provideAnimations()`.

---

## PASO 14 — Crear el routing de la aplicación

Crea o reemplaza `/frontend/src/app/app.routes.ts`:

```typescript
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
```

---

## PASO 15 — Crear el componente raíz AppComponent

Crea o reemplaza los 3 archivos de `/frontend/src/app/app.component`:

**`app.component.ts`**:
- `standalone: true`
- `selector: 'app-root'`
- `templateUrl: './app.component.html'` (NUNCA template inline)
- `styleUrl: './app.component.scss'` (NUNCA styles inline)
- `imports: [RouterOutlet, MatToolbarModule, MatButtonModule, NgIf, AsyncPipe]`
- Inyecta `AuthService` con `inject(AuthService)`
- Expone `isLoggedIn$` del AuthService al template
- Método `logout()` que llama a `this.authService.logout()`

**`app.component.html`**:
```html
<mat-toolbar color="primary" *ngIf="isLoggedIn$ | async">
  <span>AI Agent Builder</span>
  <span style="flex: 1"></span>
  <button mat-button (click)="logout()">Cerrar sesión</button>
</mat-toolbar>

<router-outlet></router-outlet>
```

**`app.component.scss`**: Archivo vacío (los estilos de toolbar los gestiona Angular Material).

---

## PASO 16 — Crear el componente LoginComponent

Crea los 3 archivos de `/frontend/src/app/features/auth/login/login.component`:

**`login.component.ts`**:
- `standalone: true`
- `imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, RouterLink, NgIf]`
- `templateUrl` y `styleUrl` externos (nunca inline)
- **CRÍTICO — FormGroup en constructor**:
  ```typescript
  form!: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }
  ```
- Inyecta `AuthService` y `Router` (pueden ser con `inject()` o constructor)
- Propiedades: `errorMessage = ''`, `isLoading = false`
- Método `onSubmit()`:
  - Si el form es inválido, return
  - Pone `isLoading = true`
  - Llama a `authService.login(email, password).subscribe({ next: () => this.router.navigate(['/agents']), error: () => { this.errorMessage = 'Credenciales inválidas'; this.isLoading = false; } })`

**`login.component.html`**:
- Div contenedor centrado (`display: flex; height: 100vh; align-items: center; justify-content: center`)
- `mat-card` con `mat-card-title` "Iniciar Sesión"
- `mat-card-content` con el formulario `[formGroup]="form" (ngSubmit)="onSubmit()"`
  - `mat-form-field` con `matInput formControlName="email" type="email"` y `mat-error` para validaciones
  - `mat-form-field` con `matInput formControlName="password" type="password"` y `mat-error`
  - Mensaje de error general: `<p class="error">{{ errorMessage }}</p>` (con `*ngIf="errorMessage"`)
- `mat-card-actions` con botón `mat-raised-button color="primary" type="submit"` deshabilitado si `form.invalid || isLoading`
- Link a `/register` con `routerLink`

**`login.component.scss`**:
```scss
.login-wrapper {
  display: flex;
  height: 100vh;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
}

mat-card {
  width: 400px;
  padding: 16px;
}

mat-form-field {
  width: 100%;
  margin-bottom: 8px;
}

.error {
  color: #f44336;
  font-size: 14px;
}

mat-card-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

---

## PASO 17 — Crear el componente RegisterComponent

Crea los 3 archivos de `/frontend/src/app/features/auth/register/register.component` siguiendo el mismo patrón que LoginComponent:

**`register.component.ts`**:
- `standalone: true`
- **CRÍTICO — FormGroup en constructor**:
  ```typescript
  form!: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { passwordMismatch: true };
  }
  ```
- Método `onSubmit()` que llama a `authService.register(email, password)` y navega a `/agents`

**`register.component.html`**: Similar a login con el campo adicional de confirmación de contraseña y validación `passwordMismatch` en el `mat-error` del form group.

**`register.component.scss`**: Mismo contenido que `login.component.scss`.

---

## Verificación final

Tras completar todos los pasos, verifica que:

1. `ng serve` en `/frontend` compila sin errores TypeScript
2. El navegador abre `http://localhost:4200`
3. Redirige automáticamente a `/login` (no hay sesión activa)
4. El formulario de login tiene validaciones en tiempo real
5. Acceder a `/agents` directamente redirige a `/login` (guard funcionando)
