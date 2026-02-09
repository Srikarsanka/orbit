import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  OnDestroy,
} from '@angular/core';

import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';


// ====================== TOAST MODEL ======================
interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}



@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule
  ]
})
export class LoginComponent implements OnInit, OnDestroy {


  loginForm!: FormGroup;
  capturedImage: string | null = null;
  stream: MediaStream | null = null;

  @ViewChild('video') videoRef!: ElementRef;
  @ViewChild('canvas') canvasRef!: ElementRef;
  @ViewChild('fileInput') fileInputRef!: ElementRef;

  constructor(private fb: FormBuilder, private http: HttpClient) { console.log("🔥 LoginComponent Loaded!"); }


  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  // ====================== TOAST STATE ======================
  toasts: Toast[] = [];
  private toastId = 0;



  // -------------------------
  // CAMERA FUNCTIONS
  // -------------------------
  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.videoRef.nativeElement.srcObject = this.stream;
    } catch (err) {
      console.error('Camera error:', err);
      this.showToast('Camera access failed.', 'error');
    }
  }

  capturePhoto() {
    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    this.capturedImage = canvas.toDataURL('image/png');
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  // -------------------------
  // FILE UPLOAD
  // -------------------------
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.capturedImage = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // -------------------------
  // FORM SUBMIT
  // -------------------------
  onSubmit() {
    console.log("🔥 onSubmit() called");
    if (this.loginForm.invalid) {
      this.showToast('Please fill all fields correctly.', 'error');
      return;
    }

    if (!this.capturedImage) {
      this.showToast('Please capture or upload your face image.', 'error');
      return;
    }

    const body = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password,
      role: this.loginForm.value.role,
      photoBase64: this.capturedImage,
    };

    console.log('Sending login details:', body);

    this.http.post('http://localhost:5000/auth/login', body, {
      withCredentials: true
    })
      .subscribe(
        (res: any) => {
          this.showToast('Login successful 🎉', 'success');
          this.showToast(res.user?.role, 'info')
          localStorage.setItem("user", JSON.stringify(res.user));
          console.log("SAVED TOKEN:", localStorage.getItem("token"));



          if (res.user.role === 'student') {
            setTimeout(() => {
              window.location.href = '/studentdashboard';
            }, 2000);

          } else {
            setTimeout(() => {
              window.location.href = '/teacherdashboard';
            }, 2000);
          }
        },
        (err) => {
          console.error('Login error:', err);
          this.showToast(err.error.message || 'Login failed', 'error');
        }
      );
  }


  showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = ++this.toastId;
    this.toasts.push({ id, message, type });

    setTimeout(() => this.removeToast(id), 3000);
  }

  removeToast(id: number) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }
}