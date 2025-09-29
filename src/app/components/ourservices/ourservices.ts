import { Component, Inject, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-ourservices',
  templateUrl: './ourservices.html',
  styleUrls: ['./ourservices.css'] // corrected from 'styleUrl' to 'styleUrls'
})
export class Ourservices implements AfterViewInit { // added 'Component' suffix and interface

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

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

  ngAfterViewInit(): void {
    // Only run client-side
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Add any client-side logic here
  }
}