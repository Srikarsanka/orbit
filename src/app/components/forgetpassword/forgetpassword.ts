import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-forgetpassword',
  templateUrl: './forgetpassword.html',
  styleUrls: ['./forgetpassword.css'],
  imports: [FormsModule, CommonModule]
})
export class Forgetpassword {

  email = "";
  otp = "";
  newPassword = "";
  confirmPassword = "";

  showEmail = true;
  showOtp = false;
  showNewPassword = false;

  timer: number = 60;
  interval: any;
  canResend: boolean = false;

  success = "";
  error = "";

  constructor(private http: HttpClient) { }

  // 🔹 Step 1 — Send OTP
  sendOtp() {
    this.error = this.success = "";

    this.http.post<any>('https://orbitbackend-0i66.onrender.com/otp/forgot-password', { email: this.email })
      .subscribe({
        next: () => {
          this.success = "OTP sent to your email";
          localStorage.setItem("forgotEmail", this.email);

          this.showEmail = false;
          this.showOtp = true;

          this.startTimer();
        },
        error: (err) => this.error = err.error.message
      });
  }

  // ⏱ Timer for resend OTP
  startTimer() {
    this.timer = 60;
    this.canResend = false;

    this.interval = setInterval(() => {
      this.timer--;
      if (this.timer === 0) {
        this.canResend = true;
        clearInterval(this.interval);
      }
    }, 1000);
  }

  // 🔁 Resend OTP
  resendOtp() {
    if (!this.canResend) return;

    const email = localStorage.getItem("forgotEmail");

    this.http.post<any>('https://orbitbackend-0i66.onrender.com/otp/forgot-password', { email })
      .subscribe({
        next: () => {
          this.success = "New OTP sent to your email";
          this.startTimer();
        },
        error: (err) => this.error = err.error.message
      });
  }

  // 🔹 Step 2 — Verify OTP
  verifyOtp() {
    this.error = this.success = "";

    const email = localStorage.getItem("forgotEmail");

    this.http.post<any>('https://orbitbackend-0i66.onrender.com/otp/verify-otp', { email, otp: this.otp })
      .subscribe({
        next: (res) => {
          this.success = "OTP verified";
          localStorage.setItem("resetToken", res.resetToken);

          this.showOtp = false;
          this.showNewPassword = true;
        },
        error: (err) => this.error = err.error.message
      });
  }

  // 🔹 Step 3 — Reset Password
  resetPassword() {
    this.error = this.success = "";

    if (this.newPassword !== this.confirmPassword) {
      this.error = "Passwords do not match";
      return;
    }

    const resetToken = localStorage.getItem("resetToken");

    this.http.post<any>('https://orbitbackend-0i66.onrender.com/otp/reset-password', {
      resetToken,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.success = "Password updated successfully";

        localStorage.removeItem("forgotEmail");
        localStorage.removeItem("resetToken");

        setTimeout(() => window.location.href = "/login", 1500);
      },
      error: (err) => this.error = err.error.message
    });
  }
}
