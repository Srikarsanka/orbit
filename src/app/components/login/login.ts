import { Component, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
// other imports
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, HttpClientModule,CommonModule], 
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit, OnDestroy {

  // The main login form group
  loginForm!: FormGroup;

  // References to DOM elements for webcam and file input
  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  // Holds the MediaStream for the webcam
  private videoStream: MediaStream | null = null;

  // Holds the captured or uploaded image as a base64 string
  capturedImage: string | null = null;

  // Tracks if the form has been submitted
  submitted = false;

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit(): void {
    // Initialize the login form with validation rules
    this.loginForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
      ,role: ['student', Validators.required] // Added role field with default value
    });
  }

  // Start the webcam and display the video stream
  async startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.videoStream = stream;
      this.videoRef.nativeElement.srcObject = stream;
      await this.videoRef.nativeElement.play();
    } catch (err) {
      console.error('Could not start camera', err);
      alert('Cannot access camera. You can also upload a photo instead.');
    }
  }

  // Capture a photo from the webcam and store as base64
  capturePhoto() {
    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) { return; }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.capturedImage = canvas.toDataURL('image/png');
    this.stopCamera();
  }

  // Stop the webcam stream and clear the video element
  stopCamera() {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
    if (this.videoRef && this.videoRef.nativeElement) {
      try { this.videoRef.nativeElement.pause(); } catch {}
      try { this.videoRef.nativeElement.srcObject = null; } catch {}
    }
  }

  // Handle file input for photo upload and convert to base64
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) { return; }
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.capturedImage = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  // Getter for easy access to form controls in template
  get f() { return this.loginForm.controls; }

  // Handle form submission
  onSubmit() {
    this.submitted = true;
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid) {
      console.warn('Form Invalid');
      return;
    }

    if (!this.capturedImage) {
      alert('Please capture or upload a photo.');
      return;
    }

    const payload = {
      fullName: this.f['fullName'].value,
      email: this.f['email'].value,
      password: this.f['password'].value,
      photoBase64: this.capturedImage,
      role:this.f['role'].value
    };

    this.http.post('http://localhost:5000/api/auth/login', payload).subscribe({
      next: (res) => {
        alert('Signup successful! Please login.');
        if(this.f['role'].value==='student')
        {
          window.location.href = '/studentdashboard';
        }
        else{
          window.location.href = '/teacherdashboard';
        }
      },
      error: (err) => {
        alert(err.error?.message || 'Signup failed.');
      }
    });
  }

  // Cleanup: stop camera when component is destroyed
  ngOnDestroy(): void {
    this.stopCamera();
  }
}
