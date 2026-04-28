---
applyTo: "frontend/src/app/**/*.component.ts"
---

# Instrucciones para componentes Angular — AI Agent Builder

Aplica estas reglas a TODOS los archivos `*.component.ts` en `frontend/src/app/`.

---

## ⚙️ Configuración `tsconfig.json` del frontend — opciones obligatorias

`ng new` genera el `tsconfig.json` automáticamente. Estas opciones deben estar presentes en todos los proyectos Angular de este stack:

| Opción | Por qué es necesaria |
|--------|----------------------|
| `target/module: ES2022` | Angular CLI usa esbuild; no baja a ES5 directamente (lo hace el bundler para cada navegador objetivo) |
| `moduleResolution: bundler` | Delega la resolución de módulos al bundler (esbuild); obligatorio con `module: ES2022` |
| `lib: ["ES2022", "dom"]` | Incluye las APIs del navegador — sin `dom`, no compilan `document`, `fetch`, `localStorage`, etc. |
| `isolatedModules: true` | Cada archivo se compila independientemente; requerido por esbuild y acelera la compilación incremental |
| `experimentalDecorators: true` | Requerido para `@Component`, `@Injectable`, `@Input`, `@Output`, etc. |
| `sourceMap: true` | Genera mapas de código para depurar TypeScript directamente en las DevTools del navegador |
| `strictTemplates: true` | Detecta errores de tipos dentro de las plantillas HTML (en `angularCompilerOptions`) |

---

## Estructura obligatoria de un componente

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
// Importar aquí todos los módulos de Angular Material necesarios

@Component({
  standalone: true,                          // ✅ SIEMPRE standalone: true
  selector: 'app-my-component',
  templateUrl: './my-component.component.html',  // ✅ SIEMPRE templateUrl externo
  styleUrl: './my-component.component.scss',      // ✅ SIEMPRE styleUrl externo
  imports: [                                 // ✅ Declarar dependencias aquí
    CommonModule,
    RouterLink,
    // MatButtonModule, MatCardModule, etc.
  ]
})
export class MyComponent implements OnInit {
  // ...
}
```

---

## ❌ NUNCA hacer esto

```typescript
// ❌ NUNCA template inline
@Component({ template: '<div>...</div>' })

// ❌ NUNCA styles inline
@Component({ styles: ['.class { color: red }'] })

// ❌ NUNCA NgModule
@NgModule({ declarations: [MyComponent] })

// ❌ NUNCA standalone: false en Angular 17+
@Component({ standalone: false })
```

---

## ⚠️ REGLA CRÍTICA — FormGroup: declarar con `!` e inicializar en el constructor

```typescript
// ✅ CORRECTO — evita TS2729 (property used before initialization)
export class MyFormComponent {
  form!: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    });
  }
}

// ❌ INCORRECTO — fb no existe como propiedad inyectada en el momento de la inicialización
export class MyFormComponent {
  form = this.fb.group({ name: [''] }); // Error TS2729
  constructor(private fb: FormBuilder) {}
}
```

---

## Inyección de dependencias — usar `inject()` o constructor

```typescript
// Opción 1: inject() (más moderno)
import { inject } from '@angular/core';

export class MyComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
}

// Opción 2: constructor (también válido)
export class MyComponent {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
}
```

---

## Guards — SIEMPRE funcionales (`CanActivateFn`)

```typescript
// ✅ CORRECTO
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};

// ❌ INCORRECTO — clase CanActivate deprecada desde Angular 14
@Injectable()
export class AuthGuard implements CanActivate { ... }
```

---

## Interceptores — SIEMPRE funcionales (`HttpInterceptorFn`) con manejo de 401

```typescript
// ✅ CORRECTO — incluye catchError para 401
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.logout(); // limpia localStorage y redirige al login
      }
      return throwError(() => error);
    })
  );
};

// ❌ INCORRECTO — sin manejo de 401, un token inválido bloquea la app indefinidamente
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};

// ❌ INCORRECTO — clase HttpInterceptor deprecada en Angular 14+
```

---

## Configuración en `app.config.ts`

```typescript
// ✅ CORRECTO
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),    // ← async, no provideAnimations()
    provideHttpClient(
      withInterceptors([authInterceptor])  // ← funcional, no withInterceptorsFromDi()
    ),
  ]
};
```

---

## Estructura de carpetas de cada componente

Siempre 3 archivos, nunca más ni menos:

```
my-feature/
├── my-feature.component.ts     ← lógica
├── my-feature.component.html   ← plantilla
└── my-feature.component.scss   ← estilos
```

---

## ⚠️ TRAMPA FRECUENTE — Profundidad de rutas relativas en imports

La profundidad del import relativo depende de cuántos niveles hay desde el componente
hasta `src/app/`. Un nivel equivocado produce `Cannot find module` en tiempo de compilación.

| Ubicación del componente | Niveles hasta `src/app/` | Import correcto |
|--------------------------|--------------------------|------------------|
| `features/chat/` | 2 (`../../`) | `../../core/services/chat.service` |
| `features/documents/` | 2 (`../../`) | `../../core/services/document.service` |
| `features/widget-config/` | 2 (`../../`) | `../../core/services/agent.service` |
| `features/auth/login/` | 3 (`../../../`) | `../../../core/services/auth.service` |
| `features/agents/agent-list/` | 3 (`../../../`) | `../../../core/services/agent.service` |

```typescript
// ✅ CORRECTO — componente en features/chat/ (directo, sin subcarpeta)
import { ChatService } from '../../core/services/chat.service';
import { ChatMessage } from '../../core/models';

// ✅ CORRECTO — componente en features/auth/login/ (con subcarpeta)
import { AuthService } from '../../../core/services/auth.service';

// ❌ INCORRECTO — un nivel de más para features/chat/
import { ChatService } from '../../../core/services/chat.service'; // ← Cannot find module
```

**Regla**: cuenta las carpetas entre el archivo `.component.ts` y `src/app/`.
`features/chat/chat-viewer.component.ts` → `chat/` (1) + `features/` (2) → dos `../`.

---

## Módulos de Angular Material más usados en este proyecto

```typescript
// Para importar en el array imports[] del componente:
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
```
