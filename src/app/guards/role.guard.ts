import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {

  constructor(private router: Router) { }

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const expectedRole = route.data['role'];  // 'student' or 'faculty'
    const userRaw = localStorage.getItem("user");
    const user = JSON.parse(userRaw || "{}");

    const actualRole = (user.role || "").toLowerCase();

    console.log("RoleGuard Check:", {
      expectedRole,
      actualRole,
      userRaw
    });

    if (actualRole === expectedRole.toLowerCase()) {
      return true;
    }

    console.log("RoleGuard: Unauthorized. Redirecting...");
    this.router.navigate(['/login']); // Redirect to login for now if unauthorized
    return false;
  }
}
