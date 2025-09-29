import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-contactus',
  templateUrl: './contactus.html',
  styleUrls: ['./contactus.css']
})
export class Contactus {
  videoUrl: SafeResourceUrl;

  constructor(private router: Router, private sanitizer: DomSanitizer) {
    this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      "https://res.cloudinary.com/dnevq4wek/video/upload/v1757779247/zh-concierge-vid_ynn6y2.mp4"
    );
  }

  myfunc() {
    this.router.navigate(['/signup']);
  }

  goToAbout() {
    alert('Navigates to about page');
    this.router.navigate(['/about']);
  }

  goToServices() {
    this.router.navigate(['/services']);
  }

  goToContact() {
    this.router.navigate(['/contact']);
  }
}
