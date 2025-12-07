import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.html',
  styleUrls: ['./signup.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule
  ]
})
export class Signup implements OnInit, OnDestroy {

  signupForm!: FormGroup;

  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  private videoStream: MediaStream | null = null;
  capturedImage: string | null = null;

  submitted = false;

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit(): void {
    this.signupForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      dob: ['', [Validators.required]],
      contact: ['', [Validators.required, Validators.pattern(/^\d{10,15}$/)]],
      role: ['student', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: [this.passwordMatchValidator] });
  }

  passwordMatchValidator(form: AbstractControl) {
    const p = form.get('password')?.value;
    const c = form.get('confirmPassword')?.value;
    return p === c ? null : { passwordMismatch: true };
  }

  async startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.videoStream = stream;
      this.videoRef.nativeElement.srcObject = stream;
      await this.videoRef.nativeElement.play();
    } catch (err) {
      console.error('Camera error:', err);
      alert('Cannot access camera. You can upload a photo instead.');
    }
  }

  capturePhoto() {
    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.capturedImage = canvas.toDataURL('image/png');
    this.stopCamera();
  }

  stopCamera() {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
    if (this.videoRef?.nativeElement) {
      try { this.videoRef.nativeElement.pause(); } catch {}
      try { this.videoRef.nativeElement.srcObject = null; } catch {}
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      this.capturedImage = reader.result as string;
    };

    reader.readAsDataURL(file);
  }

  get f() { return this.signupForm.controls; }

  onSubmit() {
    this.submitted = true;
    this.signupForm.markAllAsTouched();

    if (this.signupForm.invalid) {
      console.warn('Form invalid');
      return;
    }

    if (!this.capturedImage) {
      alert('Please capture or upload a photo.');
      return;
    }

    const payload = {
      fullName: this.f['fullName'].value,
      email: this.f['email'].value,
      dob: this.f['dob'].value,
      contact: this.f['contact'].value,
      role: this.f['role'].value,
      password: this.f['password'].value,
      photoBase64: this.capturedImage
    };

    this.http.post('http://localhost:5000/auth/signup', payload, {
      withCredentials: true
    }).subscribe({
      next: () => {
        alert('Signup successful! Please login.');
        window.location.href = '/login';
      },
      error: (err) => {
        alert(err.error?.message || 'Signup failed.');
      }
    });
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }
  login()
{
  window.location.href='/login'
}


}
