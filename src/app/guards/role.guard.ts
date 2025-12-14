import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const expectedRole = route.data['role'];  // 'student' or 'faculty'
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const actualRole = (user.role || "").toLowerCase();

    console.log("Role check:", { expectedRole, actualRole });

    if (actualRole === expectedRole.toLowerCase()) {
      return true;
    }

    this.router.navigate(['/un-authorized']);
    return false;
  }
}
