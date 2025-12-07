import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate() {
  return this.auth.checkRedirect().pipe(
    map((res: any) => {
      const redirectTo = res.redirectTo;
      const current = window.location.pathname;

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
