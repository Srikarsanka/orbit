import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) { }

  canActivate() {
    console.log("🔍 [AuthGuard] canActivate() called");
    console.log("🔍 [AuthGuard] Current path:", window.location.pathname);
    console.log("🔍 [AuthGuard] Token in localStorage:", !!localStorage.getItem('orbit_user'));
    console.log("🔍 [AuthGuard] User in localStorage:", localStorage.getItem('user'));

    return this.auth.checkRedirect().pipe(
      map((res: any) => {
        console.log("🔍 [AuthGuard] Backend response:", res);
        const redirectTo = res.redirectTo;
        const current = window.location.pathname;

        console.log("🔍 [AuthGuard] Redirect comparison:", { current, redirectTo });

        // 🔥 RESTORE USER SESSION IF MISSING (Critical for RoleGuard)
        const storedUser = localStorage.getItem('user');
        console.log("🔍 [AuthGuard] Stored user before restore:", storedUser);

        if (res.user && (!storedUser || storedUser === '{}')) {
          console.log("✅ [AuthGuard] Restoring user session from backend:", res.user);
          const userData = {
            email: res.user.email,
            role: res.user.role,
            name: res.user.fullName,
            photo: res.user.photo
          };
          localStorage.setItem('user', JSON.stringify(userData));
          console.log("✅ [AuthGuard] User data saved to localStorage:", userData);
        } else {
          console.log("ℹ️ [AuthGuard] User session already exists or no user in response");
        }

        if (redirectTo === '/login') {
          console.log("❌ [AuthGuard] Backend says redirect to /login - user not authenticated");
          this.router.navigateByUrl('/login');
          return false;
        }

        if (current === redirectTo) {
          console.log("✅ [AuthGuard] User is on correct route - allowing access");
          return true;
        }

        console.log(`⚠️ [AuthGuard] User on wrong route - redirecting from ${current} to ${redirectTo}`);
        this.router.navigateByUrl(redirectTo);
        return false;
      })
    );
  }
}
