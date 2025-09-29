import { Component, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-aboutus',
  standalone: true,
  imports: [RouterLink, NgFor],
  templateUrl: './aboutus.html',
  styleUrls: ['./aboutus.css']
})
export class Aboutus implements AfterViewInit {
  members = [
    { name:'SrikarS',role:'CEO and Co-Founder',place:'Narsapuram',Country:'IN',img:'https://res.cloudinary.com/dnevq4wek/image/upload/v1757526850/Generated_Image_September_10_2025_-_11_20PM_c8vvkf.png'},
    {name:'KanthuS',role:'Sr. Product Designer',place:'Kadapa',Country:'IN',img:'https://res.cloudinary.com/dnevq4wek/image/upload/v1757527047/prop4_hhc1xt.png'},
    {name:'BunnyS',role:'UI/UX Designer',place:'Nidrovollu',Country:'IN',img:'https://res.cloudinary.com/dnevq4wek/image/upload/v1757524561/prop2_ym1fzf.png'},
    {name:'GowthamS',role:'Software Engineer',Country:'IN',place:'Kakinada' ,img:'https://res.cloudinary.com/dnevq4wek/image/upload/v1757528536/Generated_Image_September_10_2025_-_11_47PM_1_dn4mlo.png'},
    {name:'AbhiramS',role:'Customer Relation Manager',Country:'IN',place:'Kakinada' ,img:'https://res.cloudinary.com/dnevq4wek/image/upload/v1757528931/Generated_Image_September_10_2025_-_11_57PM_d4xywi.png'},
    {name:'SandeepS',role:'Staff Product Manager',Country:'IN',place:'Vijaywada' ,img:'https://res.cloudinary.com/dnevq4wek/image/upload/v1757596230/Generated_Image_September_11_2025_-_6_38PM_o3wgha.png'}
  ];

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

    // If IntersectionObserver available, use it; otherwise fallback
    const win: any = window as any;
    if (win && win.IntersectionObserver) {
      const observer = new win.IntersectionObserver((entries: IntersectionObserverEntry[]) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('visible');
            observer.unobserve(entry.target); // animate once
          }
        });
      }, { threshold: 0.2 });

      document.querySelectorAll('.animate').forEach((el) => observer.observe(el));
    } else {
      // Fallback: reveal all (or optionally use a scroll listener)
      document.querySelectorAll('.animate').forEach((el) => (el as HTMLElement).classList.add('visible'));
    }
  }
    missionVisionData = {
    title: "Our Mission & Vision",
    intro: "At Orbit, we believe education should be <span>borderless, inclusive, and inspiring</span>. Our mission and vision guide everything we create, shaping the future of digital learning.",
    cards: [
      {
        icon: "fas fa-bullseye",
        title: "Our Mission",
        description: "To empower teachers and students by making virtual classrooms seamless, engaging, and accessible—anytime, anywhere."
      },
      {
        icon: "fas fa-eye",
        title: "Our Vision",
        description: "To create a world where learning has no boundaries, powered by innovation, collaboration, and creativity."
      }
    ]
  };
  valuesData = {
    title: "Our Values",
    intro: "The principles that guide us as we build Orbit.",
    values: [
      {
        icon: "fas fa-lightbulb",
        title: "Innovation",
        description: "We constantly push boundaries to bring new ideas to digital learning."
      },
      {
        icon: "fas fa-users",
        title: "Collaboration",
        description: "We thrive on teamwork, building tools that connect people worldwide."
      },
      {
        icon: "fas fa-universal-access",
        title: "Accessibility",
        description: "Education should be open to all, regardless of place or background."
      },
      {
        icon: "fas fa-heart",
        title: "Transparency",
        description: "We believe in openness—building trust through clarity and honesty."
      }
    ]
  };
}


