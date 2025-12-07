import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}

  checkRedirect() {
    return this.http.get<any>(
      'http://localhost:5000/auth/redirect',
      { withCredentials: true }
    );
  }
}
