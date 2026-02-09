import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) { }

  checkRedirect() {
    return this.http.get<any>(
      'https://orbitbackend-0i66.onrender.com/auth/redirect',
      { withCredentials: true }
    );
  }
}
