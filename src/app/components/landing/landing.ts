import { Component, AfterViewInit, Inject, PLATFORM_ID, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';  // ✅ Correct import
import { trigger, style, transition, animate } from '@angular/animations';


interface CarouselStep {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  buttonText?: string;
  videoUrl?: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.html',
  styleUrls: ['./landing.css'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-50px)' }),
        animate('600ms ease-in-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('400ms ease-in-out', style({ opacity: 0, transform: 'translateX(50px)' }))
      ])
    ]),
    trigger('imageSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(1.1)' }),
        animate('800ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ]),
    trigger('textFade', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('500ms 200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class Landing implements AfterViewInit, OnDestroy {
  @ViewChild('carousel', { static: false }) carouselRef!: ElementRef;
  isBrowser: boolean;

  // Typing animation variables
  fullText = 'Transform';
  displayText = '';
  index = 0;
  typingInterval1: any;

  fullText2 = 'Reimagine';
  displayText2 = '';
  index1 = 0;
  typingInterval2: any;

  typingSpeed = 150;
  pauseAfterComplete = 1000;
  isTyping1 = false;
  isTyping2 = false;

  // Carousel variables
  currentStep = 0;
  isAutoPlaying = true;
  autoPlayInterval: any;

  String = String;

  steps: CarouselStep[] = [
    {
      id: 1,
      title: "AI-Powered Learning",
      description: "Experience the future of education with our revolutionary AI-powered platform...",
      imageUrl: "",
      buttonText: "Explore AI Features",
      videoUrl: "https://res.cloudinary.com/dnevq4wek/video/upload/v1753535821/AI_Learning_Dashboard_Video_Ready_auaogw.mp4",
    },
    {
      id: 2,
      title: "Interactive Virtual Classroom",
      description: "Connect seamlessly through our advanced virtual classroom...",
      imageUrl: "",
      buttonText: "Join Classroom",
      videoUrl: "https://res.cloudinary.com/dnevq4wek/video/upload/v1753536412/Virtual_Classroom_Video_Ready_Link_ulbcqe.mp4",
    },
    {
      id: 3,
      title: "Smart Note Generation",
      description: "Never miss important information again with our AI-powered note transcription...",
      imageUrl: "",
      buttonText: "Try Smart Notes",
      videoUrl: "https://res.cloudinary.com/dnevq4wek/video/upload/v1753537243/Video_Ready_Holographic_Cherry_Red_nurdjx.mp4",
    },
    {
      id: 4,
      title: "Real-time Collaboration",
      description: "Foster teamwork and engagement with built-in collaboration tools...",
      imageUrl: "",
      buttonText: "Start Collaborating",
      videoUrl: "https://res.cloudinary.com/dnevq4wek/video/upload/v1753537180/Collaborative_Workspace_Video_Ready_w3orsb.mp4",
    }
  ];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    setTimeout(() => {
      this.startTyping();
      this.startTyping2();
      this.startAutoPlay();
      this.setupScrollListener();
      this.initializeVideos();
    }, 100);
  }

  ngOnDestroy(): void {
    clearInterval(this.typingInterval1);
    clearInterval(this.typingInterval2);
    clearInterval(this.autoPlayInterval);
  }

  // Typing animation
  startTyping(): void {
    if (this.isTyping1) return;
    this.isTyping1 = true;
    this.index = 0;
    this.displayText = '';
    this.typingInterval1 = setInterval(() => {
      if (this.index <= this.fullText.length) {
        this.displayText = this.fullText.substring(0, this.index++);
      } else {
        setTimeout(() => {
          this.index = 0;
          this.displayText = '';
        }, this.pauseAfterComplete);
      }
    }, this.typingSpeed);
  }

  startTyping2(): void {
    if (this.isTyping2) return;
    this.isTyping2 = true;
    this.index1 = 0;
    this.displayText2 = '';
    setTimeout(() => {
      this.typingInterval2 = setInterval(() => {
        if (this.index1 <= this.fullText2.length) {
          this.displayText2 = this.fullText2.substring(0, this.index1++);
        } else {
          setTimeout(() => {
            this.index1 = 0;
            this.displayText2 = '';
          }, this.pauseAfterComplete);
        }
      }, this.typingSpeed);
    }, 300);
  }

  setupScrollListener(): void {
    if (!this.carouselRef) return;
    const carousel = this.carouselRef.nativeElement;
    let isScrolling = false;

    carousel.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      if (isScrolling) return;
      isScrolling = true;

      e.deltaY > 0 ? this.nextStep() : this.prevStep();

      setTimeout(() => {
        isScrolling = false;
      }, 1200);
    });
  }

  nextStep(): void {
    this.pauseAutoPlay();
    this.currentStep = (this.currentStep + 1) % this.steps.length;
    this.restartAutoPlay();
  }

  prevStep(): void {
    this.pauseAutoPlay();
    this.currentStep = this.currentStep === 0 ? this.steps.length - 1 : this.currentStep - 1;
    this.restartAutoPlay();
  }

  goToStep(index: number): void {
    this.pauseAutoPlay();
    this.currentStep = index;
    this.restartAutoPlay();
  }

  startAutoPlay(): void {
    this.autoPlayInterval = setInterval(() => {
      if (this.isAutoPlaying) {
        this.currentStep = (this.currentStep + 1) % this.steps.length;
      }
    }, 8001);
  }

  pauseAutoPlay(): void {
    this.isAutoPlaying = false;
  }

  restartAutoPlay(): void {
    setTimeout(() => {
      this.isAutoPlaying = true;
    }, 3000);
  }

  initializeVideos(): void {
    if (!this.isBrowser) return;

    const videos = document.querySelectorAll('video');
    videos.forEach((video) => {
      video.muted = true;
      (video as HTMLVideoElement).playsInline = true;
      video.loop = true;
      video.play().catch(() => {
        const playOnInteraction = () => {
          video.play().catch(() => {});
          document.removeEventListener('click', playOnInteraction);
          document.removeEventListener('touchstart', playOnInteraction);
        };
        document.addEventListener('click', playOnInteraction);
        document.addEventListener('touchstart', playOnInteraction);
      });
    });
  }

  // Use router navigation instead of window.location for SPA navigation
  myfunc() {
    this.router.navigate(['/signup']);
  }

  goToAbout() {
    alert('Navigates to about page')
    this.router.navigate(['/about']);
  }

  goToServices() {
    this.router.navigate(['/services']);
  }

  goToContact() {
    this.router.navigate(['/contact']);
  }
}