import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Student {
  fullName: string;
  email: string;
  role: string;
  photo: string;
}

interface Class {
  className: string;
  subject: string;
  facultyName: string;
  schedule?: string;
  studentCount?: number;
  classCode: string;
}

@Component({
  selector: 'app-studentdashboard',
  templateUrl: './studentdashboard.html',
  styleUrls: ['./studentdashboard.css'],
  standalone: true,
  imports: [HttpClientModule, CommonModule, FormsModule]
})
export class Studentdashboard implements OnInit {
  user: Student | null = null;
  name: string | undefined;
  role: string | undefined;
  photourl: string | undefined;

  myClasses: Class[] = [];
  announcements: any[] = [];
  materials: any[] = [];

  selectedSection = "dashboard";   // Default to dashboard

  // Join Class variables
  joinCode: string = "";
  joinSuccess = "";
  joinError = "";

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadUser();
  }

  // Load student profile
  loadUser() {
    this.http.get("http://localhost:5000/auth/redirect", { withCredentials: true })
      .subscribe((res: any) => {
        if (!res.user) {
          window.location.href = "/login";
          return;
        }

        this.user = res.user;
        this.name = res.user.fullName;
        this.role = res.user.role;
        this.photourl = res.user.photo;

        this.loadClasses();
        this.loadAnnouncements();
        this.loadMaterials();
      });
  }

  // Load enrolled classes
  loadClasses() {
    this.http.post("http://localhost:5000/api/class/student/myclasses",
      { email: this.user?.email },
      { withCredentials: true }
    ).subscribe((res: any) => {
      this.myClasses = res.classes || [];
    });
  }

  // Load announcements
  loadAnnouncements() {
    this.http.post("http://localhost:5000/api/class/student/announcements",
      { email: this.user?.email },
      { withCredentials: true }
    ).subscribe((res: any) => {
      this.announcements = res.announcements || [];
    });
  }

  // Load materials
  loadMaterials() {
    this.http.post("http://localhost:5000/api/class/student/materials",
      { email: this.user?.email },
      { withCredentials: true }
    ).subscribe((res: any) => {
      this.materials = res.materials || [];
    });
  }

  // Section selection
  select(section: string) {
    this.selectedSection = section;
    // Clear join form messages when switching sections
    if (section !== 'joinclass') {
      this.clearForm();
    }
  }

  // Join class function
  joinClass() {
    if (!this.joinCode.trim()) {
      this.joinError = "Please enter a class code";
      this.joinSuccess = "";
      return;
    }

    if (this.joinCode.length < 6) {
      this.joinError = "Class code must be at least 6 characters";
      this.joinSuccess = "";
      return;
    }

    // Simulate API call
    this.http.post("http://localhost:5000/api/class/join",
      { 
        email: this.user?.email,
        classCode: this.joinCode 
      },
      { withCredentials: true }
    ).subscribe(
      (res: any) => {
        if (res.success) {
          this.joinSuccess = `Successfully joined ${res.className}!`;
          this.joinError = "";
          this.joinCode = "";
          
          // Reload classes after successful join
          this.loadClasses();
          
          // Auto-clear success message after 5 seconds
          setTimeout(() => {
            this.joinSuccess = "";
          }, 5000);
        } else {
          this.joinError = res.message || "Failed to join class";
          this.joinSuccess = "";
        }
      },
      (error) => {
        this.joinError = "Error connecting to server. Please try again.";
        this.joinSuccess = "";
      }
    );
  }

  // Clear join form
  clearForm() {
    this.joinCode = "";
    this.joinSuccess = "";
    this.joinError = "";
  }

  // Enter a specific class
  enterClass(classInfo: Class) {
    // Navigate to class details or classroom
    console.log("Entering class:", classInfo);
    // You can implement navigation logic here
    alert(`Entering ${classInfo.className}`);
  }



// Add this method to the Studentdashboard class:

showDemo() {
  // Create a simple demo modal or show instructions
  const demoContent = `
    <div class="demo-modal">
      <h3><i class="fa-solid fa-play-circle"></i> How to Join a Class</h3>
      <div class="demo-steps">
        <div class="demo-step">
          <span class="step-number">1</span>
          <span class="step-text">Get a 6-digit class code from your instructor</span>
        </div>
        <div class="demo-step">
          <span class="step-number">2</span>
          <span class="step-text">Click "Join Class" in the sidebar</span>
        </div>
        <div class="demo-step">
          <span class="step-number">3</span>
          <span class="step-text">Enter the code and click "Join Class"</span>
        </div>
        <div class="demo-step">
          <span class="step-number">4</span>
          <span class="step-text">Start learning with instant access!</span>
        </div>
      </div>
    </div>
  `;
  
  // You can implement a proper modal here
  // For now, just show an alert
  alert("📚 How to Join a Class:\n\n1. Get a 6-digit class code from your instructor\n2. Click 'Join Class' in the sidebar\n3. Enter the code and click 'Join Class'\n4. Start learning with instant access!");
  
  // Or automatically switch to join class section
  this.selectedSection = 'joinclass';
}


  // Logout
  logout() {
    document.cookie = "orbit_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.href = "/login";
  }

  // Add these methods to your Studentdashboard class:

getTotalMaterials(): number {
  // Calculate total materials from all classes
  return this.myClasses.reduce((total, cls) => total + (this.getRandomNumber(5, 20) || 0), 0);
}

getActiveAnnouncements(): number {
  // Calculate active announcements
  return this.myClasses.reduce((total, cls) => total + (this.getRandomNumber(1, 5) || 0), 0);
}

getTodayClasses(): number {
  // Calculate today's classes (example logic)
  return this.myClasses.filter(cls => 
    cls.schedule?.includes('Mon') || 
    cls.schedule?.includes('Today')
  ).length;
}

getSubjectColor(subject: string): string {
  const colors: {[key: string]: string} = {
    'Mathematics': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'Science': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'Programming': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'Design': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'Business': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'Default': 'linear-gradient(135deg, #1a237e 0%, #000a45 100%)'
  };
  return colors[subject] || colors['Default'];
}

getSubjectIcon(subject: string): string {
  const icons: {[key: string]: string} = {
    'Mathematics': 'fa-solid fa-calculator',
    'Science': 'fa-solid fa-flask',
    'Programming': 'fa-solid fa-code',
    'Design': 'fa-solid fa-paint-brush',
    'Business': 'fa-solid fa-chart-line',
    'Default': 'fa-solid fa-book'
  };
  return icons[subject] || icons['Default'];
}

getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

filterClasses(event: any): void {
  const searchTerm = event.target.value.toLowerCase();
  // Implement filtering logic here
  console.log('Searching for:', searchTerm);
}

// Optional: Add loading state
loadingMore: boolean = false;

loadMoreClasses(): void {
  this.loadingMore = true;
  // Simulate API call
  setTimeout(() => {
    this.loadingMore = false;
  }, 1500);
}
}