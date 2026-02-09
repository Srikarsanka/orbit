import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) { }

  canActivate() {
    return this.auth.checkRedirect().pipe(
      map((res: any) => {
        const redirectTo = res.redirectTo;
        const current = window.location.pathname;

        // 🔥 RESTORE USER SESSION IF MISSING (Critical for RoleGuard)
        const storedUser = localStorage.getItem('user');
        if (res.user && (!storedUser || storedUser === '{}')) {
          console.log("Restoring user session from AuthGuard:", res.user);
          localStorage.setItem('user', JSON.stringify({
            email: res.user.email,
            role: res.user.role,
            name: res.user.fullName,
            photo: res.user.photo
          }));
        }

        if (redirectTo === '/login') {
          this.router.navigateByUrl('/login');
          return false;
        }

        if (current === redirectTo) {
          return true;
        }

        this.router.navigateByUrl(redirectTo); // ⭐ fix
        return false;
      })
    );
  }
}
