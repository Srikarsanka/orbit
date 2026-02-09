import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {

  constructor(private router: Router) { }

  canActivate(route: ActivatedRouteSnapshot): boolean {
    console.log("🔍 [RoleGuard] canActivate() called");

    const expectedRole = route.data['role'];  // 'student' or 'faculty'
    const userRaw = localStorage.getItem("user");
    const user = JSON.parse(userRaw || "{}");
    const actualRole = (user.role || "").toLowerCase();

    console.log("🔍 [RoleGuard] Role check:", {
      expectedRole,
      actualRole,
      userRaw,
      match: actualRole === expectedRole.toLowerCase()
    });

    if (actualRole === expectedRole.toLowerCase()) {
      console.log("✅ [RoleGuard] Role matches - allowing access");
      return true;
    }

    console.log("❌ [RoleGuard] Role mismatch - redirecting to /login");
    console.log(`❌ [RoleGuard] Expected: ${expectedRole}, Got: ${actualRole}`);
    this.router.navigate(['/login']);
    return false;
  }
}
