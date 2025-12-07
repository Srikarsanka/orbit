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
export class LoginComponent implements OnInit, OnDestroy{


  loginForm!: FormGroup;
  capturedImage: string | null = null;
  stream: MediaStream | null = null;

  @ViewChild('video') videoRef!: ElementRef;
  @ViewChild('canvas') canvasRef!: ElementRef;
  @ViewChild('fileInput') fileInputRef!: ElementRef;

  constructor(private fb: FormBuilder, private http: HttpClient) {  console.log("🔥 LoginComponent Loaded!");}
  
  
  ngOnInit() {
    this.loginForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      password: ['', Validators.required],
    });
  }



  // -------------------------
  // CAMERA FUNCTIONS
  // -------------------------
  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.videoRef.nativeElement.srcObject = this.stream;
    } catch (err) {
      console.error('Camera error:', err);
      alert('Camera access failed.');
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
      alert('Please fill all fields correctly.');
      return;
    }

    if (!this.capturedImage) {
      alert('Please capture or upload your face image.');
      return;
    }

    const body = {
      fullName: this.loginForm.value.fullName,
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
        alert(res.message || 'Login successful');

        if (res.user.role === 'student') {
          window.location.href = '/studentdashboard';
        } else {
          window.location.href = '/teacherdashboard';
        }
      },
      (err) => {
        console.error('Login error:', err);
        alert(err.error.message || 'Login failed');
      }
    );
  }
}
