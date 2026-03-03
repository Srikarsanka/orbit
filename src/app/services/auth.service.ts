import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) { }

  checkRedirect() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('orbit_user') : null;
    let headers = new HttpHeaders();

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.get<any>(
      'https://orbitbackend-0i66.onrender.com/auth/redirect',
      {
        withCredentials: true,
        headers: headers
      }
    );
  }
}
