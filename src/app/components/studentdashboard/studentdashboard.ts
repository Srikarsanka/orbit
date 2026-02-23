import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser'; // Added
import { lastValueFrom } from 'rxjs'

/* ============================================================
   INTERFACES
   ============================================================ */

/* Logged-in student details */
interface Student {
  fullName: string;
  email: string;
  role: string;
  photo: string;
}

/* Single class object */
interface LoadedClass {
  classId: string;
  className: string;
  classCode: string;
  facultyName: string;
  facultyEmail: string;
  facultyPhoto: string;
  subject: string;
  description?: string;
  totalStudents: number;
  createdAt?: string;
}

/* Subject style object */
interface SubjectStyle {
  gradient: string;
  alphabets: string[];
  keywords: string[];
}

/* Learning Hub Interfaces */
interface HubVideo {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  url: string;
  category: 'science' | 'math' | 'coding' | 'general' | 'physics' | 'chemistry';
}

interface HubBook {
  id: string;
  title: string;
  author_name?: string[];
  cover_url?: string;
  source: 'Project Gutenberg' | 'Open Library' | 'Google Books';
  full_text_url?: string;
  preview_link?: string;
  key?: string; // OpenLibrary work key
  ia?: string[]; // Internet Archive ID
  has_full_text: boolean;
  type: 'gutenberg' | 'openlibrary' | 'googlebooks';
  is_embeddable?: boolean;
  embed_id?: string;
  description?: string;
}

interface HubArticle {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  thumbnail?: string;
  description?: string;
  tags?: string[];
  content?: string;
  highlights?: string[];
}

@Component({
  selector: 'app-studentdashboard',
  templateUrl: './studentdashboard.html',
  styleUrls: ['./studentdashboard.css', './dashboard-modern.css', './attendance-styles.css'],
  standalone: true,
  imports: [HttpClientModule, CommonModule, FormsModule]
})
export class Studentdashboard implements OnInit {

  /* ============================================================
     MY CLASSES SEARCH
     ============================================================ */
  searchText: string = '';

  get filteredClasses() {
    if (!this.searchText) return this.myClasses;

    return this.myClasses.filter(cls =>
      cls.className.toLowerCase().includes(this.searchText.toLowerCase()) ||
      cls.subject.toLowerCase().includes(this.searchText.toLowerCase()) ||
      cls.facultyName.toLowerCase().includes(this.searchText.toLowerCase()) ||
      cls.classCode.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  /* ============================================================
     USER STATE
     ============================================================ */
  user: Student | null = null;
  name?: string;
  role?: string;
  photourl?: string;

  /* ============================================================
     CLASSES STATE (IMPORTANT)
     ============================================================ */
  // This array is used by *ngFor / @for in HTML
  myClasses: LoadedClass[] = [];

  /* ============================================================
     ATTENDANCE DATA
     ============================================================ */
  attendanceData: any = null;
  loadingAttendance: boolean = false;
  expandedClassId: string | null = null; // For expanding class details

  /* ============================================================
     ANNOUNCEMENTS STATE
     ============================================================ */
  announcements: any[] = [];
  loadingAnnouncements: boolean = false;

  /* ============================================================
     UI STATE
     ============================================================ */
  selectedSection: string = "dashboard";

  /* ============================================================
     RECORDINGS STATE
     ============================================================ */
  expandedRecordingClassId: string | null = null;
  loadingRecordings: boolean = false;
  currentClassRecordings: any[] = [];

  joinCode: string = "";
  joinSuccess: string = "";
  joinError: string = "";

  /* ============================================================
     PROFILE SECTION STATE
     ============================================================ */
  editMode: string = ''; // '', 'photo', 'password'

  // Photo Upload
  selectedFile: File | null = null;
  submitting: boolean = false;

  // Password Change
  currentPass: string = '';
  newPass: string = '';
  confirmPass: string = '';

  // Messages
  successMsg: string = '';
  errorMsg: string = '';

  /* ============================================================
     COMPILER VARIABLES
     ============================================================ */
  compilerLanguages: any[] = [
    { id: 'python', name: 'Python', icon: 'devicon-python-plain colored' },
    { id: 'java', name: 'Java', icon: 'devicon-java-plain colored' },
    { id: 'c', name: 'C', icon: 'devicon-c-plain colored' },
    { id: 'cpp', name: 'C++', icon: 'devicon-cplusplus-plain colored' }
  ];
  compilerLanguage: string = 'python';
  compilerCode: string = `# Python Code\nprint("Hello, World!")\n\n# Try some math\nx = 10\ny = 20\nprint(f"Sum: {x + y}")`;
  compilerInput: string = ''; // User input for stdin
  isExecutingCode: boolean = false;
  isGeneratingAi: boolean = false;
  compilerOutput: string = '';
  compilerError: string = '';
  compilerHasError: boolean = false;
  compilerExecutionTime: number | null = null;
  compilerAiSuggestion: string = '';

  private compilerTemplates: { [key: string]: string } = {
    python: `# Python Code\nprint("Hello, World!")\n\n# Try some math\nx = 10\ny = 20\nprint(f"Sum: {x + y}")`,
    java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n        \n        // Try some math\n        int x = 10;\n        int y = 20;\n        System.out.println("Sum: " + (x + y));\n    }\n}`,
    c: `#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    \n    // Try some math\n    int x = 10;\n    int y = 20;\n    printf("Sum: %d\\n", x + y);\n    \n    return 0;\n}`,
    cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    \n    // Try some math\n    int x = 10;\n    int y = 20;\n    cout << "Sum: " << (x + y) << endl;\n    \n    return 0;\n}`
  };

  /* ============================================================
     SUBJECT STYLES
     ============================================================ */


  // 🎨 MASTER SUBJECT STYLE DICTIONARY
  subjectStyles: { [key: string]: SubjectStyle } = {
    math: {
      gradient: "linear-gradient(135deg,#00c6ff,#0072ff)",
      alphabets: ["∑", "π", "√", "∞", "x²", "∫"],
      keywords: ["math", "algebra", "calculus", "matrix"]
    },
    physics: {
      gradient: "linear-gradient(135deg,#3a1c71,#d76d77,#ffaf7b)",
      alphabets: ["⚛", "→F", "λ", "E=mc²"],
      keywords: ["physics", "motion", "force", "energy", "science"]
    },
    chemistry: {
      gradient: "linear-gradient(135deg,#5433ff,#20bdff,#a5fecb)",
      alphabets: ["🧪", "⚗️", "🧫", "🔬"],
      keywords: ["chem", "formula", "reaction", "acid", "salt"]
    },
    biology: {
      gradient: "linear-gradient(135deg,#11998e,#38ef7d)",
      alphabets: ["DNA", "🧬", "🫁", "🌿"],
      keywords: ["bio", "cell", "dna"]
    },
    backend: {
      gradient: "linear-gradient(135deg,#373b44,#4286f4)",
      alphabets: ["{ }", "DB()", "API()", "</>"],
      keywords: ["backend", "server", "node", "java", "api"]
    },
    fullstack: {
      gradient: "linear-gradient(135deg,#1d2671,#c33764)",
      alphabets: ["</>", "fetch()", "GET /api", "await()"],
      keywords: ["full", "frontend", "full stack", "mern"]
    },
    ai: {
      gradient: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)",
      alphabets: ["🤖", "neural", "ML()", "dataset"],
      keywords: ["ai", "machine", "ml", "neural", "deep"]
    },
    cse: {
      gradient: "linear-gradient(135deg,#141E30,#243B55)",
      alphabets: ["010", "⚙", "CPU", "chip"],
      keywords: ["cse", "computer science"]
    },
    ece: {
      gradient: "linear-gradient(135deg,#1f4037,#99f2c8)",
      alphabets: ["📡", "⚡", "∿", "IC"],
      keywords: ["ece", "electronics"]
    },
    mechanical: {
      gradient: "linear-gradient(135deg,#e65c00,#f9d423)",
      alphabets: ["⚙", "🛠", "⛓", "gear"],
      keywords: ["mech", "mechanical"]
    },
    civil: {
      gradient: "linear-gradient(135deg,#19547b,#ffd89b)",
      alphabets: ["🏗", "🧱", "🚧", "📐"],
      keywords: ["civil", "construction"]
    },
    pharma: {
      gradient: "linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)",
      alphabets: ["💊", "🧪", "Rx", "🩺"],
      keywords: ["pharma", "medicine"]
    },
    telugu: {
      gradient: "linear-gradient(135deg,#7b4397,#dc2430)",
      alphabets: ["అ", "ఆ", "ఇ", "ఈ", "ఉ", "ఊ", "ఋ", "ఎ", "ఏ", "ఐ"],
      keywords: ["telugu", "తెలుగు"]
    },
    hindi: {
      gradient: "linear-gradient(135deg,#fc4a1a,#f7b733)",
      alphabets: ["अ", "आ", "इ", "ई", "उ", "ऊ", "ए", "ऐ", "ओ", "औ"],
      keywords: ["hindi", "हिन्दी"]
    },
    tamil: {
      gradient: "linear-gradient(135deg,#20002c,#cbb4d4)",
      alphabets: ["அ", "ஆ", "இ", "ஈ", "உ", "ஊ", "எ", "ஏ"],
      keywords: ["tamil", "தமிழ்"]
    }
  };

  // 🔍 Return best matching subject config
  getSubjectStyle(subject: string): SubjectStyle | { gradient: string; alphabets: string[] } {
    const s = subject.toLowerCase();
    return Object.values(this.subjectStyles).find((obj: SubjectStyle) =>
      obj.keywords.some((k: string) => s.includes(k))
    ) || { gradient: "#222", alphabets: ["*"] };
  }

  // Get random position for floating characters
  getRandomPosition(): number {
    return Math.random() * 90;
  }


  constructor(
    private http: HttpClient,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {
    this.rotateContent();
  }

  /* ============================================================
     ON INIT
     ============================================================ */
  ngOnInit() {
    this.loadUser();
  }

  /* ============================================================
     LOAD LOGGED-IN USER
     ============================================================ */
  loadUser() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('orbit_user') : null;
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    this.http.get<any>(
      "https://orbitbackend-0i66.onrender.com/auth/redirect",
      {
        withCredentials: true,
        headers: headers
      }
    ).subscribe(res => {
      if (!res.user) {
        window.location.href = "/login";
        return;
      }

      this.user = res.user;
      this.name = res.user.fullName;
      this.role = res.user.role;
      this.photourl = res.user.photo;

      // Once user is loaded → load classes
      this.loadClasses();
    }, err => {
      console.error("Load User Failed:", err);
      window.location.href = "/login";
    });
  }

  /* ============================================================
     LOAD CLASSES (USING .toPromise())
     ============================================================ */
  async loadClasses() {
    if (!this.user?.email) return;

    try {
      const res: any = await lastValueFrom(this.http.post(
        "https://orbitbackend-0i66.onrender.com/api/student/classes",
        { studentEmail: this.user.email },
        { withCredentials: true }
      ));

      if (!res || !res.payload) {
        this.myClasses = [];
        return;
      }

      // Store backend data into array for ngFor/@for
      this.myClasses = res.payload.map((cls: any) => ({
        classId: cls._id,
        className: cls.className,
        classCode: cls.classCode,
        facultyName: cls.facultyName,
        facultyEmail: cls.facultyEmail,
        facultyPhoto: cls.facultyPhoto,
        subject: cls.subject,
        description: cls.description,
        totalStudents: cls.students ? cls.students.length : 0,
        createdAt: cls.createdAt
      }));

      console.log("Classes Loaded:", this.myClasses);

      // Load attendance data
      this.fetchAttendanceData();

      // Load Announcements
      this.fetchAnnouncements();

    } catch (error) {
      console.error("Error loading classes:", error);
      this.myClasses = [];
    }
  }

  /* ============================================================
     FETCH ANNOUNCEMENTS
     ============================================================ */
  async fetchAnnouncements() {
    if (!this.user?.email) return;

    this.loadingAnnouncements = true;
    try {
      const response: any = await lastValueFrom(this.http.post(
        'https://orbitbackend-0i66.onrender.com/api/announcements/student',
        { studentEmail: this.user.email },
        { withCredentials: true }
      ));

      if (response && response.announcements) {
        this.announcements = response.announcements;
        console.log('Announcements Loaded:', this.announcements);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      this.loadingAnnouncements = false;
    }
  }

  /* ============================================================
     FETCH ATTENDANCE DATA
     ============================================================ */
  async fetchAttendanceData() {
    this.loadingAttendance = true;
    try {
      const response: any = await lastValueFrom(this.http.get('https://orbitbackend-0i66.onrender.com/api/sessions/attendance/student', { withCredentials: true }));
      if (response && response.success) {
        this.attendanceData = response;
        console.log('Attendance Data:', this.attendanceData);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      this.showToast('Failed to load attendance data', 'error');
    } finally {
      this.loadingAttendance = false;
    }
  }

  /* ============================================================
     TOGGLE CLASS ATTENDANCE DETAILS
     ============================================================ */
  toggleClassDetails(classId: string) {
    this.expandedClassId = this.expandedClassId === classId ? null : classId;
  }

  /* ============================================================
     FORMAT TIME (minutes to readable format)
     ============================================================ */
  formatTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  /* ============================================================
     FORMAT DATE
     ============================================================ */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /* ============================================================
     JOIN CLASS
     ============================================================ */
  joinClass() {
    if (!this.joinCode.trim()) {
      this.joinError = "Please enter class code";
      return;
    }

    const payload = {
      student: {
        studentName: this.user?.fullName,
        studentEmail: this.user?.email,
        studentPhoto: this.user?.photo
      },
      classCode: this.joinCode.trim().toUpperCase()
    };

    this.http.post<any>(
      "https://orbitbackend-0i66.onrender.com/api/student/join",
      payload,
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        this.joinSuccess = "Joined class successfully";
        this.joinError = "";
        this.joinCode = "";

        // Reload classes after joining
        this.loadClasses();
      },
      error: (err) => {
        this.joinError = err.error?.message || "Unable to join class";
        this.joinSuccess = "";
      }
    });
  }

  // animation for the subjecta





  /* ============================================================
     SIDEBAR SECTION SWITCH
     ============================================================ */
  select(section: string) {
    this.selectedSection = section;
    this.editMode = ''; // Reset edit mode when switching sections
    this.clearProfileMessages();

    if (section === 'announcements') {
      this.fetchAnnouncements();
    }

    if (section !== "joinclass") {
      this.clearForm();
    }
  }

  /* ============================================================
     RECORDINGS SIDEBAR METHODS
     ============================================================ */
  toggleRecordingsClass(classId: string) {
    if (this.expandedRecordingClassId === classId) {
      this.expandedRecordingClassId = null;
      this.currentClassRecordings = [];
    } else {
      this.expandedRecordingClassId = classId;
      this.loadClassRecordings(classId);
    }
  }

  async loadClassRecordings(classId: string) {
    this.loadingRecordings = true;
    this.currentClassRecordings = [];
    try {
      const res: any = await this.http.get(
        `https://orbitbackend-0i66.onrender.com/api/recordings/class/${classId}`,
        { withCredentials: true }
      ).toPromise();
      this.currentClassRecordings = res.recordings || [];
    } catch (e) {
      console.error('Failed to load recordings:', e);
      this.currentClassRecordings = [];
    } finally {
      this.loadingRecordings = false;
    }
  }

  playRecording(rec: any) {
    window.open(rec.fileUrl || `https://orbitbackend-0i66.onrender.com/api/recordings/file/${rec.filename}`, '_blank');
  }

  openTranslatePanel(rec: any) {
    const videoSrc = rec.fileUrl || `https://orbitbackend-0i66.onrender.com/api/recordings/file/${rec.filename}`;
    const playerUrl = `https://orbitbackend-0i66.onrender.com/video/recording_player.html?src=${encodeURIComponent(videoSrc)}&lang=te&title=${encodeURIComponent(rec.title || 'Recording')}`;
    window.open(playerUrl, '_blank');
  }

  /* ============================================================
     CLEAR JOIN FORM
     ============================================================ */
  clearForm() {
    this.joinCode = "";
    this.joinError = "";
    this.joinSuccess = "";
  }

  /* ============================================================
     PROFILE SECTION METHODS
     ============================================================ */

  // Set edit mode for profile section
  setEditMode(mode: string): void {
    this.editMode = mode;
    this.clearProfileMessages();

    // Reset password fields when switching to password mode
    if (mode === 'password') {
      this.currentPass = '';
      this.newPass = '';
      this.confirmPass = '';
    }

    // Reset file selection when switching to photo mode
    if (mode === 'photo') {
      this.selectedFile = null;
    }
  }

  // Handle file selection for profile photo
  onFileSelect(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.match('image.*')) {
        this.errorMsg = 'Please select an image file (JPG, PNG, etc.)';
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMsg = 'File size must be less than 5MB';
        return;
      }

      this.selectedFile = file;
      this.successMsg = 'File selected: ' + file.name;
      this.errorMsg = '';

      // Preview the image
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photourl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // Update profile photo
  updatePhoto(): void {
    if (!this.selectedFile) {
      this.errorMsg = 'Please select a file first';
      return;
    }

    this.submitting = true;
    this.errorMsg = '';
    this.successMsg = '';

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('photo', this.selectedFile);
    formData.append('studentEmail', this.user?.email || '');

    this.http.post<any>(
      "https://orbitbackend-0i66.onrender.com/api/student/update-photo",
      formData,
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        this.successMsg = 'Profile photo updated successfully!';
        this.submitting = false;
        this.selectedFile = null;

        // Update user photo in local state
        if (res.user && res.user.photo) {
          this.photourl = res.user.photo;
          if (this.user) {
            this.user.photo = res.user.photo;
          }
        }

        // Reset edit mode after success
        setTimeout(() => {
          this.setEditMode('');
        }, 2000);
      },
      error: (err) => {
        this.errorMsg = err.error?.message || 'Failed to update photo. Please try again.';
        this.submitting = false;
      }
    });
  }

  // Update password
  updatePassword(): void {
    // Clear previous messages
    this.clearProfileMessages();

    // Validation
    if (!this.currentPass || !this.newPass || !this.confirmPass) {
      this.errorMsg = 'Please fill in all password fields';
      return;
    }

    if (this.newPass.length < 8) {
      this.errorMsg = 'New password must be at least 8 characters long';
      return;
    }

    if (this.newPass !== this.confirmPass) {
      this.errorMsg = 'New passwords do not match';
      return;
    }

    this.submitting = true;

    const payload = {
      studentEmail: this.user?.email,
      currentPassword: this.currentPass,
      newPassword: this.newPass
    };

    this.http.post<any>(
      "https://orbitbackend-0i66.onrender.com/api/student/change-password",
      payload,
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        this.successMsg = 'Password updated successfully!';
        this.submitting = false;

        // Clear fields
        this.currentPass = '';
        this.newPass = '';
        this.confirmPass = '';

        // Reset edit mode after success
        setTimeout(() => {
          this.setEditMode('');
        }, 2000);
      },
      error: (err) => {
        this.errorMsg = err.error?.message || 'Failed to update password. Please try again.';
        this.submitting = false;
      }
    });
  }

  // Clear profile messages
  clearProfileMessages(): void {
    this.successMsg = '';
    this.errorMsg = '';
  }

  /* ============================================================
     OPEN CLASS MODAL (STUDENT)
     ============================================================ */
  async openClass(classCode: string) {
    try {
      const res: any = await this.http
        .post(
          `https://orbitbackend-0i66.onrender.com/api/openclass/${classCode}`,
          {},
          { withCredentials: true }
        )
        .toPromise();

      const room = res.room;

      this.showToast(`Opening ${room.className}...`, 'success');

      // Create overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position:fixed; inset:0;
        background:rgba(0,0,0,0.55);
        backdrop-filter:blur(6px);
        display:flex; justify-content:center; align-items:center;
        z-index:99999; animation:fadeIn .28s ease;
        font-family:'Inter','Segoe UI',sans-serif;
      `;

      // Create card
      const card = document.createElement('div');
      card.style.cssText = `
        width:90%; max-width:850px; height:85vh;
        background:white; border-radius:20px;
        box-shadow:0 24px 60px rgba(0,0,0,0.25), 0 10px 20px rgba(0,0,0,0.15);
        display:flex; flex-direction:column; overflow:hidden;
        animation:slideUp .35s cubic-bezier(0.16, 1, 0.3, 1);
        position:relative;
      `;

      // Header
      const header = document.createElement('div');
      header.style.cssText = `
        padding:24px 32px; background:white;
        border-bottom:1px solid #E4E7EB;
        display:flex; justify-content:space-between; align-items:flex-start;
      `;

      header.innerHTML = `
        <div>
          <div style="font-size:13px; font-weight:600; text-transform:uppercase; tracking:1px; color:#888; margin-bottom:4px;">
            ${room.classCode} • ${room.subject}
          </div>
          <h2 style="font-size:26px; font-weight:700; color:#111; margin:0; letter-spacing:-0.5px;">
            ${room.className}
          </h2>
          <div style="margin-top:6px; display:flex; gap:12px; align-items:center;">
             <span style="font-size:13px; color:#555; background:#f4f4f5; padding:4px 10px; border-radius:12px;">
               <i class="fa-solid fa-chalkboard-user"></i> ${room.facultyName}
             </span>
             <span style="font-size:13px; color:#555; background:#f4f4f5; padding:4px 10px; border-radius:12px;">
               <i class="fa-solid fa-users"></i> ${room.students?.length || 0} Students
             </span>
          </div>
        </div>
      `;

      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      closeBtn.style.cssText = `
        width:36px; height:36px; border-radius:50%; border:none;
        background:#F5F7FB; color:#555; font-size:16px; cursor:pointer;
        transition:all .2s;
      `;
      closeBtn.onclick = () => overlay.remove();
      header.appendChild(closeBtn);

      // Tabs Bar
      const tabsBar = document.createElement('div');
      tabsBar.style.cssText = `
        display:flex; gap:24px; padding:0 32px; background:white;
        border-bottom:1px solid #E4E7EB;
      `;

      const createTab = (text: string) => {
        const tab = document.createElement('div');
        tab.textContent = text;
        tab.style.cssText = `
          padding:16px 4px; font-size:14px; font-weight:600; color:#555;
          cursor:pointer; border-bottom:2px solid transparent; transition:all .2s;
        `;
        return tab;
      };

      const tabAnnouncements = createTab('Announcements');
      const tabMaterials = createTab('Materials');
      const tabLive = createTab('Live Class');
      const tabRecordings = createTab('Recordings');

      const setTabActive = (tab: HTMLElement, active: boolean) => {
        tab.style.color = active ? '#0045AA' : '#555';
        tab.style.borderBottomColor = active ? '#0045AA' : 'transparent';
      };

      tabsBar.appendChild(tabLive);
      tabsBar.appendChild(tabAnnouncements);
      tabsBar.appendChild(tabMaterials);
      tabsBar.appendChild(tabRecordings);

      // Content Area
      const content = document.createElement('div');
      content.style.cssText = `
        flex:1; padding:24px 32px; overflow-y:auto; background:#F8FAFC;
        position:relative;
      `;

      // Render Functions
      const renderAnnouncements = async () => {
        content.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">Loading announcements...</p>';
        try {
          const res: any = await this.http.get(`https://orbitbackend-0i66.onrender.com/api/announcements/class/${room._id}`, { withCredentials: true }).toPromise();
          const list = res.announcements || [];

          if (!list.length) {
            content.innerHTML = '<div style="text-align:center; padding:40px; color:#888;"><i class="fa-solid fa-bullhorn" style="font-size:32px; margin-bottom:10px;"></i><p>No announcements yet.</p></div>';
            return;
          }

          content.innerHTML = '';
          list.forEach((a: any) => {
            const card = document.createElement('div');
            card.style.cssText = `background:white; padding:16px; margin-bottom:12px; border-radius:12px; border:1px solid #E4E7EB; box-shadow:0 1px 3px rgba(0,0,0,0.05);`;
            card.innerHTML = `
               <div style="font-weight:600; color:#222; margin-bottom:4px; font-size:15px;">${a.title}</div>
               <div style="color:#555; font-size:14px; line-height:1.5;">${a.message}</div>
               <div style="margin-top:8px; font-size:11px; color:#999;">${new Date(a.createdAt).toLocaleString()}</div>
             `;
            content.appendChild(card);
          });
        } catch {
          content.innerHTML = '<p style="color:red; text-align:center;">Failed to load announcements.</p>';
        }
      };

      const renderMaterials = async () => {
        content.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">Loading materials...</p>';
        try {
          const res: any = await this.http.get(`https://orbitbackend-0i66.onrender.com/api/material/${room._id}`, { withCredentials: true }).toPromise();
          const list = res.materials || [];

          if (!list.length) {
            content.innerHTML = '<div style="text-align:center; padding:40px; color:#888;"><i class="fa-solid fa-folder-open" style="font-size:32px; margin-bottom:10px;"></i><p>No study materials yet.</p></div>';
            return;
          }
          content.innerHTML = '';
          list.forEach((m: any) => {
            const fileUrl = m.fileUrl ? 'https://orbitbackend-0i66.onrender.com' + m.fileUrl : m.externalLink;
            const card = document.createElement('div');
            card.style.cssText = `background:white; padding:16px; margin-bottom:12px; border-radius:12px; border:1px solid #E4E7EB; display:flex; justify-content:space-between; align-items:center;`;
            card.innerHTML = `
               <div>
                  <div style="font-weight:600; color:#222; font-size:14px;"><i class="fa-solid fa-file-lines" style="color:#0045AA; margin-right:8px;"></i>${m.title}</div>
                  <div style="font-size:11px; color:#777; margin-left:24px;">${this.getFileType(m.type)} • ${this.formatFileSize(m.size)}</div>
               </div>
               <a href="${fileUrl}" target="_blank" style="padding:6px 14px; background:#F0F7FF; color:#0045AA; text-decoration:none; border-radius:6px; font-size:13px; font-weight:600;">Download</a>
             `;
            content.appendChild(card);
          });
        } catch {
          content.innerHTML = '<p style="color:red; text-align:center;">Failed to load materials.</p>';
        }
      };

      const renderLiveTab = async () => {
        content.innerHTML = `
           <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;">
             <i class="fa-solid fa-spinner fa-spin" style="font-size:32px; color:#0045AA;"></i>
             <p style="margin-top:16px; color:#666;">Checking class status...</p>
           </div>
         `;

        try {
          const sessionRes: any = await this.http.get(
            `https://orbitbackend-0i66.onrender.com/api/sessions/active/${room._id}`,
            { withCredentials: true }
          ).toPromise();

          content.innerHTML = '';
          const container = document.createElement('div');
          container.style.cssText = `text-align:center; padding:24px; max-width:500px; margin:0 auto;`;

          if (sessionRes.active) {
            container.innerHTML = `
               <div style="width:80px; height:80px; background:#e0f2fe; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 24px;">
                 <i class="fa-solid fa-video" style="font-size:32px; color:#0045AA; animation:pulse 2s infinite;"></i>
               </div>
               <h2 style="margin-bottom:8px; color:#111;">Live Class in Progress</h2>
               <p style="color:#666; margin-bottom:32px; line-height:1.5;">
                 The faculty has started a live session. Join now to participate.
               </p>
               <button id="joinBtn" class="btn-ripple" style="
                 background:#0045AA; color:white; border:none; padding:14px 32px; border-radius:50px;
                 font-size:16px; font-weight:600; cursor:pointer; box-shadow:0 10px 25px rgba(0,69,170,0.3);
                 display:inline-flex; align-items:center; gap:10px; transition:transform 0.2s;
               ">
                 <i class="fa-solid fa-person-chalkboard"></i> Join Class Now
               </button>
             `;
          } else {
            container.innerHTML = `
               <div style="width:80px; height:80px; background:#f4f4f5; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 24px;">
                 <i class="fa-solid fa-video-slash" style="font-size:32px; color:#999;"></i>
               </div>
               <h2 style="margin-bottom:8px; color:#444;">No Active Class</h2>
               <p style="color:#666; width:80%; margin:0 auto;">
                 There is no live session currently active for this class. <br>Check back later or view announcements.
               </p>
             `;
          }
          content.appendChild(container);

          const joinBtn = document.getElementById('joinBtn');
          if (joinBtn) {
            joinBtn.onclick = () => {
              const url = `https://orbitbackend-0i66.onrender.com/video/room.html?session=${sessionRes.sessionId}&role=student&email=${this.user?.email}&name=${encodeURIComponent(this.user?.fullName || '')}&deviceId=${localStorage.getItem('deviceId') || ''}`;
              window.open(url, '_blank');
            };
          }

        } catch (e) {
          content.innerHTML = '<p style="color:red; text-align:center;">Failed to check session status.</p>';
        }
      };

      // [NEW] RENDER RECORDINGS TAB (STUDENT - with translation)
      const renderRecordingsTab = async () => {
        content.innerHTML = '';
        const container = document.createElement('div');
        container.style.cssText = `max-width: 860px; margin: 0 auto; display:flex; flex-direction:column; gap:24px;`;

        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h3 style="margin:0; color:#0045AA; font-size:20px; font-weight:700;">Class Recordings</h3>
              <p style="margin:4px 0 0; color:#64748b; font-size:13px;">Watch recorded lectures with real-time subtitles & translation</p>
            </div>
          </div>
        `;

        const listArea = document.createElement('div');
        listArea.style.cssText = `display:grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap:16px;`;
        listArea.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#94a3b8;"><i class="fa-solid fa-spinner fa-spin" style="font-size:24px;"></i><p style="margin-top:12px;">Loading recordings...</p></div>`;
        container.appendChild(listArea);
        content.appendChild(container);

        try {
          const res: any = await this.http.get(`https://orbitbackend-0i66.onrender.com/api/recordings/class/${room._id}`, { withCredentials: true }).toPromise();
          const recordings = res.recordings || [];

          if (!recordings.length) {
            listArea.innerHTML = `
              <div style="grid-column:1/-1; text-align:center; padding:60px 20px;">
                <div style="width:80px; height:80px; background:#f1f5f9; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px;">
                  <i class="fa-solid fa-video-slash" style="font-size:32px; color:#94a3b8;"></i>
                </div>
                <p style="color:#475569; font-size:16px; font-weight:600; margin:0;">No recordings yet</p>
                <p style="color:#94a3b8; font-size:13px; margin:8px 0 0;">Recordings will appear here after faculty records a live class</p>
              </div>`;
            return;
          }

          listArea.innerHTML = '';
          recordings.forEach((rec: any) => {
            const card = document.createElement('div');
            const date = new Date(rec.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const time = new Date(rec.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const mins = Math.floor((rec.duration || 0) / 60);
            const secs = (rec.duration || 0) % 60;
            const size = ((rec.fileSize || 0) / (1024 * 1024)).toFixed(1);

            card.style.cssText = `
              background:white; border:1px solid #e2e8f0; border-radius:16px;
              overflow:hidden; transition:all 0.25s ease; cursor:default;
            `;
            card.onmouseover = () => { card.style.boxShadow = '0 8px 25px rgba(0,69,170,0.1)'; card.style.transform = 'translateY(-2px)'; };
            card.onmouseout = () => { card.style.boxShadow = 'none'; card.style.transform = 'translateY(0)'; };

            card.innerHTML = `
              <div style="background:linear-gradient(135deg, #0045AA 0%, #0066FF 100%); padding:20px; display:flex; align-items:center; gap:14px; cursor:pointer;" class="card-play-area">
                <div style="width:50px; height:50px; background:rgba(255,255,255,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; backdrop-filter:blur(10px);">
                  <i class="fa-solid fa-play" style="color:white; font-size:18px; margin-left:2px;"></i>
                </div>
                <div style="flex:1; min-width:0;">
                  <div style="font-weight:700; color:white; font-size:15px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${rec.title || 'Class Recording'}</div>
                  <div style="color:rgba(255,255,255,0.75); font-size:12px; margin-top:3px;">
                    <i class="fa-regular fa-clock"></i> ${mins}m ${secs}s &nbsp;·&nbsp; ${size}MB
                  </div>
                </div>
              </div>
              <div style="padding:16px 20px;">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
                  <div style="display:flex; align-items:center; gap:8px; color:#64748b; font-size:12px;">
                    <i class="fa-regular fa-calendar"></i> ${date} at ${time}
                  </div>
                  <div style="display:flex; align-items:center; gap:6px; font-size:11px; color:#0045AA; font-weight:600; background:#e0f2fe; padding:3px 10px; border-radius:20px;">
                    <i class="fa-solid fa-closed-captioning"></i> Subtitles
                  </div>
                </div>
                <div style="display:flex; gap:8px;">
                  <select class="lang-picker" style="flex:1; padding:8px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:13px; color:#334155; background:white; cursor:pointer; font-family:inherit;">
                    <option value="en">🇬🇧 English</option>
                    <option value="te">🇮🇳 Telugu</option>
                    <option value="hi">🇮🇳 Hindi</option>
                    <option value="ta">🇮🇳 Tamil</option>
                    <option value="ml">🇮🇳 Malayalam</option>
                  </select>
                  <button class="watch-btn" style="padding:8px 20px; border-radius:8px; border:none; background:linear-gradient(135deg, #0045AA, #0066FF); color:white; cursor:pointer; font-weight:600; font-size:13px; transition:all 0.2s; display:flex; align-items:center; gap:6px; white-space:nowrap;">
                    <i class="fa-solid fa-language"></i> Watch with Subtitles
                  </button>
                </div>
              </div>
            `;

            const openPlayer = (lang: string) => {
              const videoSrc = rec.fileUrl || 'https://orbitbackend-0i66.onrender.com/api/recordings/file/' + rec.filename;
              const playerUrl = 'https://orbitbackend-0i66.onrender.com/video/recording_player.html?src=' + encodeURIComponent(videoSrc)
                + '&lang=' + lang
                + '&title=' + encodeURIComponent(rec.title || 'Class Recording')
                + '&faculty=' + encodeURIComponent(rec.facultyName || 'Faculty')
                + '&date=' + encodeURIComponent(date)
                + '&duration=' + (rec.duration || 0);
              window.open(playerUrl, '_blank');
            };

            // Click thumbnail area to play with default language
            card.querySelector('.card-play-area')!.addEventListener('click', () => {
              openPlayer('en');
            });

            // Watch with subtitles button
            card.querySelector('.watch-btn')!.addEventListener('click', () => {
              const selectedLang = (card.querySelector('.lang-picker') as HTMLSelectElement).value;
              openPlayer(selectedLang);
            });

            listArea.appendChild(card);
          });
        } catch (e) {
          console.error('Error loading recordings:', e);
          listArea.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#ef4444;"><i class="fa-solid fa-triangle-exclamation" style="font-size:24px; margin-bottom:8px; display:block;"></i>Failed to load recordings</div>`;
        }
      };

      // Click Handlers
      const setAllTabsInactive = () => {
        [tabAnnouncements, tabMaterials, tabLive, tabRecordings].forEach(t => setTabActive(t, false));
      };

      tabAnnouncements.onclick = () => {
        setAllTabsInactive();
        setTabActive(tabAnnouncements, true);
        renderAnnouncements();
      };

      tabMaterials.onclick = () => {
        setAllTabsInactive();
        setTabActive(tabMaterials, true);
        renderMaterials();
      };

      tabLive.onclick = () => {
        setAllTabsInactive();
        setTabActive(tabLive, true);
        renderLiveTab();
      };

      tabRecordings.onclick = () => {
        setAllTabsInactive();
        setTabActive(tabRecordings, true);
        renderRecordingsTab();
      };

      // Default Tab
      setTabActive(tabLive, true);
      renderLiveTab();

      card.appendChild(header);
      card.appendChild(tabsBar);
      card.appendChild(content);
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); }

    } catch (e) {
      console.error(e);
      this.showToast('Failed to open class details', 'error');
    }
  }

  // Helper Methods
  showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed; bottom:24px; right:24px; padding:12px 24px;
      background:${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
      color:white; border-radius:12px; font-weight:600; font-size:14px;
      box-shadow:0 10px 30px rgba(0,0,0,0.15); z-index:999999;
      transform:translateY(100px); opacity:0; transition:all .3s cubic-bezier(0.16, 1, 0.3, 1);
      display:flex; align-items:center; gap:10px;
    `;
    toast.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });

    setTimeout(() => {
      toast.style.transform = 'translateY(20px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  formatFileSize(bytes: any): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getFileType(type: string): string {
    if (type?.includes('pdf')) return 'PDF Document';
    if (type?.includes('image')) return 'Image File';
    if (type?.includes('video')) return 'Video File';
    return 'File';
  }

  enterClass(cls: LoadedClass) {
    this.openClass(cls.classCode);
  }

  /* ============================================================
     LOGOUT
     ============================================================ */
  logout() {
    // Call logout API
    this.http.post<any>(
      "https://orbitbackend-0i66.onrender.com/auth/logout",
      {},
      { withCredentials: true }
    ).subscribe({
      next: () => {
        // Clear cookies and redirect
        document.cookie = "orbit_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        window.location.href = "/login";
      },
      error: () => {
        // Still redirect even if API call fails
        document.cookie = "orbit_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        window.location.href = "/login";
      }
    });
  }

  /* ============================================================
     HELPER METHODS
     ============================================================ */

  // Get total classes count
  get totalClasses(): number {
    return this.myClasses.length;
  }

  // Get active classes (you can define your own logic)
  get activeClasses(): number {
    return this.myClasses.filter(cls => {
      // Example: Class is active if created within last 30 days
      if (!cls.createdAt) return true;
      const createdAt = new Date(cls.createdAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdAt > thirtyDaysAgo;
    }).length;
  }

  // Get total students (sum across all classes)
  get totalStudents(): number {
    return this.myClasses.reduce((sum, cls) => sum + (cls.totalStudents || 0), 0);
  }

  /* ============================================================
     COMPILER METHODS
     ============================================================ */

  getLineNumbers(): number[] {
    const lines = (this.compilerCode || '').split('\n').length;
    return Array.from({ length: Math.max(lines, 20) }, (_, i) => i + 1);
  }

  updateLineNumbers() {
    // Auto-updates via getLineNumbers()
  }

  syncScroll(event: any) {
    const lineNumbers = document.querySelector('.line-numbers') as HTMLElement;
    if (lineNumbers) {
      lineNumbers.scrollTop = event.target.scrollTop;
    }
  }

  onCompilerLanguageChange() {
    if (this.compilerTemplates[this.compilerLanguage]) {
      this.compilerCode = this.compilerTemplates[this.compilerLanguage];
    }
    this.clearOutput();
  }

  async runCode() {
    if (!this.compilerCode.trim()) {
      alert('Please write some code first!');
      return;
    }

    this.isExecutingCode = true;
    this.clearOutput();

    try {
      const res: any = await this.http.post('https://orbitbackend-0i66.onrender.com/api/compiler/execute', {
        language: this.compilerLanguage,
        code: this.compilerCode,
        input: this.compilerInput // Send user input
      }).toPromise();

      this.compilerExecutionTime = res.executionTime || null;

      if (res.success) {
        this.compilerOutput = res.output || 'Code executed successfully (no output)';
        this.compilerError = '';
        this.compilerHasError = false;
      } else {
        this.compilerError = res.error || 'Unknown error occurred';
        this.compilerOutput = '';
        this.compilerHasError = true;
        // Generate AI suggestion for errors
        await this.generateAiSuggestion(this.compilerError);
      }
    } catch (error: any) {
      this.compilerError = error.error?.error || error.message || 'Failed to execute code';
      this.compilerOutput = '';
      this.compilerHasError = true;
      this.compilerExecutionTime = null;
    } finally {
      this.isExecutingCode = false;
    }
  }

  // Handle Tab key for proper indentation
  handleTabKey(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      event.preventDefault();
      const textarea = event.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // Insert tab (4 spaces)
      const tab = '    ';
      this.compilerCode = this.compilerCode.substring(0, start) + tab + this.compilerCode.substring(end);

      // Move cursor after the tab
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + tab.length;
      }, 0);

      // Update highlighting after tab
      this.updateHighlight();
    }
  }

  // Get syntax-highlighted code
  getHighlightedCode(): string {
    if (!this.compilerCode) return '';

    // Escape HTML to prevent XSS
    const escaped = this.compilerCode
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Use Prism.js for highlighting if available
    if (typeof (window as any).Prism !== 'undefined') {
      try {
        const Prism = (window as any).Prism;
        const grammar = Prism.languages[this.compilerLanguage];
        if (grammar) {
          return Prism.highlight(escaped, grammar, this.compilerLanguage);
        }
      } catch (e) {
        console.error('Prism highlighting error:', e);
      }
    }

    return escaped;
  }

  // Update syntax highlighting
  updateHighlight() {
    // Trigger change detection to update highlighted code
    setTimeout(() => {
      const codeElement = document.querySelector('.code-highlight code');
      if (codeElement) {
        codeElement.innerHTML = this.getHighlightedCode();
      }
    }, 0);
  }

  // Get AI optimization suggestions for successful code
  async getAiOptimization() {
    if (!this.compilerCode.trim()) return;

    this.isGeneratingAi = true;
    this.compilerAiSuggestion = '';

    try {
      const prompt = `Analyze this ${this.compilerLanguage} code and provide suggestions for optimization, best practices, or alternative approaches. Be concise and clear. Do not use markdown formatting like asterisks or bold text.

Code:
\`\`\`${this.compilerLanguage}
${this.compilerCode}
\`\`\`

Provide:
1. Code quality assessment
2. Optimization suggestions
3. Alternative approaches if any
4. Best practices recommendations

Keep it conversational and easy to read.`;

      const res: any = await this.http.post('https://orbitbackend-0i66.onrender.com/api/ai/generate', {
        prompt: prompt
      }).toPromise();

      this.compilerAiSuggestion = res.response || 'Unable to generate suggestions at this time.';
    } catch (error) {
      console.error('AI generation error:', error);
      this.compilerAiSuggestion = 'Failed to generate AI suggestions. Please try again.';
    } finally {
      this.isGeneratingAi = false;
    }
  }

  // Generate AI suggestion for errors
  async generateAiSuggestion(error: string) {
    this.isGeneratingAi = true;

    try {
      const prompt = `A ${this.compilerLanguage} code execution resulted in this error:

Error: ${error}

Code:
\`\`\`${this.compilerLanguage}
${this.compilerCode}
\`\`\`

Explain what caused this error and how to fix it. Be clear and concise. Do not use markdown formatting like asterisks or bold text. Keep it conversational.`;

      const res: any = await this.http.post('https://orbitbackend-0i66.onrender.com/api/ai/generate', {
        prompt: prompt
      }).toPromise();

      this.compilerAiSuggestion = res.response || this.getFallbackErrorSuggestion(error);
    } catch (err) {
      console.error('AI generation error:', err);
      this.compilerAiSuggestion = this.getFallbackErrorSuggestion(error);
    } finally {
      this.isGeneratingAi = false;
    }
  }

  // Fallback error suggestions
  getFallbackErrorSuggestion(error: string): string {
    if (error.includes('SyntaxError')) {
      return 'Syntax Error detected. Check for missing parentheses, brackets, or semicolons in your code.';
    } else if (error.includes('NameError') || error.includes('undefined')) {
      return 'Variable not defined. Make sure you have declared all variables before using them.';
    } else if (error.includes('IndentationError')) {
      return 'Indentation Error. Python requires consistent indentation. Use 4 spaces for each level.';
    } else if (error.includes('TypeError')) {
      return 'Type Error. Check if you are using the correct data types in your operations.';
    } else if (error.includes('timeout')) {
      return 'Execution timeout. Your code might have an infinite loop or is taking too long to execute.';
    } else if (error.includes('Compilation Error')) {
      return 'Compilation failed. Check your syntax and make sure all statements are correct for ' + this.compilerLanguage + '.';
    }
    return 'An error occurred while executing your code. Review the error message above and check your syntax.';
  }

  // Format AI suggestion - remove asterisks and format nicely
  formatAiSuggestion(text: string): string {
    if (!text) return '';

    // Remove all markdown formatting
    let formatted = text
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold **text**
      .replace(/\*(.+?)\*/g, '$1')     // Remove italic *text*
      .replace(/`(.+?)`/g, '$1')       // Remove code `text`
      .replace(/#{1,6}\s/g, '')        // Remove headers
      .trim();

    // Convert numbered lists to HTML
    formatted = formatted.replace(/^(\d+)\.\s(.+)$/gm, '<div class="ai-list-item"><span class="ai-number">$1.</span> $2</div>');

    // Convert bullet points to HTML
    formatted = formatted.replace(/^[-•]\s(.+)$/gm, '<div class="ai-list-item"><span class="ai-bullet">•</span> $1</div>');

    // Convert line breaks to paragraphs
    formatted = formatted.split('\n\n').map(para => {
      if (para.includes('ai-list-item')) return para;
      return `<p>${para.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return formatted;
  }

  clearCode() {
    this.compilerCode = '';
    this.clearOutput();
  }

  clearOutput() {
    this.compilerOutput = '';
    this.compilerError = '';
    this.compilerHasError = false;
    this.compilerAiSuggestion = '';
    this.compilerExecutionTime = null;
  }

  downloadCode() {
    const ext = this.getFileExtension();
    const blob = new Blob([this.compilerCode], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${ext}`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  getFileExtension(): string {
    const extensions: { [key: string]: string } = {
      python: 'py',
      java: 'java',
      c: 'c',
      cpp: 'cpp'
    };
    return extensions[this.compilerLanguage] || 'txt';
  }

  getCompilerPlaceholder(): string {
    return `Write your ${this.compilerLanguage} code here...`;
  }

  getLanguageIcon(): string {
    const lang = this.compilerLanguages.find(l => l.id === this.compilerLanguage);
    return lang ? lang.icon : '';
  }

  // Filter classes by search
  filterClasses(searchTerm: string): LoadedClass[] {
    if (!searchTerm) return this.myClasses;

    return this.myClasses.filter(cls =>
      cls.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.facultyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.classCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Returns a random gradient class for the card header
  getHeaderStyle(index: number): string {
    const gradients = ['bg-gradient-1', 'bg-gradient-2', 'bg-gradient-3', 'bg-gradient-4', 'bg-gradient-5'];
    // Use modulo to ensure stability (same class always gets same color based on index)
    return gradients[index % gradients.length];
  }

  // Helper to format faculty name with title
  getFacultyNameWithTitle(name: string): string {
    // Basic heuristics for demo (User requested Mr/Ms)
    // In a real app, this should be in the DB
    const lowerName = name.toLowerCase();

    // Explicit overrides
    if (lowerName.includes('satish')) return `Mr. ${name}`;
    if (lowerName.includes('suresh')) return `Mr. ${name}`;
    if (lowerName.includes('kavya')) return `Ms. ${name}`;
    if (lowerName.includes('priya')) return `Ms. ${name}`;

    // Simple heuristic: ends in 'a' is often female in Indian names (not always true)
    // ends in 'i' often female
    if (lowerName.endsWith('a') || lowerName.endsWith('i')) return `Ms. ${name}`;

    return `Mr. ${name}`; // Default to Mr. as per request context
  }

  /* ============================================================
     LEARNING HUB LOGIC
     ============================================================ */
  activeHubTab: 'videos' | 'docs' | 'news' = 'videos';
  searchHubQuery: string = '';
  hubLoading: boolean = false;

  // Curated Educational Content (TED, Khan Academy)
  // POOL OF EDUCATIONAL VIDEOS (Rotates every 2 days)
  // Source: 21K School - Best Educational YouTube Channels
  // POOL OF EDUCATIONAL VIDEOS (Rotates every 2 days)
  allHubVideos: HubVideo[] = [
    // PHYSICS
    {
      id: 'ted_hotel', title: 'The Infinite Hotel Paradox', channel: 'TED-Ed',
      thumbnail: 'https://img.youtube.com/vi/Uj3_Quf1sAA/mqdefault.jpg', url: 'https://www.youtube.com/embed/Uj3_Quf1sAA', category: 'physics'
    },
    {
      id: 'minute_gravity', title: 'Why is Gravity Weak?', channel: 'MinutePhysics',
      thumbnail: 'https://img.youtube.com/vi/p_o4aY7xkXg/mqdefault.jpg', url: 'https://www.youtube.com/embed/p_o4aY7xkXg', category: 'physics'
    },
    {
      id: 'veritasium_slinky', title: 'The Slinky Drop Prediction', channel: 'Veritasium',
      thumbnail: 'https://img.youtube.com/vi/eCMmmEEyOO0/mqdefault.jpg', url: 'https://www.youtube.com/embed/eCMmmEEyOO0', category: 'physics'
    },

    // CHEMISTRY
    {
      id: 'periodic_gold', title: 'Gold - Periodic Table of Videos', channel: 'Periodic Videos',
      thumbnail: 'https://img.youtube.com/vi/GNFsq93A1tE/mqdefault.jpg', url: 'https://www.youtube.com/embed/GNFsq93A1tE', category: 'chemistry'
    },
    {
      id: 'fuse_acids', title: 'Acids, Bases and Salts', channel: 'FuseSchool',
      thumbnail: 'https://img.youtube.com/vi/mnbS56HQbaU/mqdefault.jpg', url: 'https://www.youtube.com/embed/mnbS56HQbaU', category: 'chemistry'
    },

    // MATH
    {
      id: 'khan_calc', title: 'Calculus: Derivatives intro', channel: 'Khan Academy',
      thumbnail: 'https://img.youtube.com/vi/WUvTyaaNkzM/mqdefault.jpg', url: 'https://www.youtube.com/embed/WUvTyaaNkzM', category: 'math'
    },
    {
      id: 'math_ologer', title: 'The Mandelbrot Set', channel: 'Mathologer',
      thumbnail: 'https://img.youtube.com/vi/FFftmWSzgmk/mqdefault.jpg', url: 'https://www.youtube.com/embed/FFftmWSzgmk', category: 'math'
    },

    // CODING / PROGRAMMING
    {
      id: 'ted_coding', title: 'How to think like a programmer', channel: 'TED-Ed',
      thumbnail: 'https://img.youtube.com/vi/azcrPFhaY9k/mqdefault.jpg', url: 'https://www.youtube.com/embed/azcrPFhaY9k', category: 'coding'
    },
    {
      id: 'crash_course', title: 'Computer Science: Early Computing', channel: 'CrashCourse',
      thumbnail: 'https://img.youtube.com/vi/O5nskjZ_GoI/mqdefault.jpg', url: 'https://www.youtube.com/embed/O5nskjZ_GoI', category: 'coding'
    },
    {
      id: 'fireship_js', title: 'JavaScript in 100 Seconds', channel: 'Fireship',
      thumbnail: 'https://img.youtube.com/vi/DHjqpvDnNGE/mqdefault.jpg', url: 'https://www.youtube.com/embed/DHjqpvDnNGE', category: 'coding'
    },
    {
      id: 'traversy_python', title: 'Python Crash Course for Beginners', channel: 'Traversy Media',
      thumbnail: 'https://img.youtube.com/vi/JJmcL1N2KQs/mqdefault.jpg', url: 'https://www.youtube.com/embed/JJmcL1N2KQs', category: 'coding'
    },

    // SCIENCE / GENERAL
    {
      id: 'natgeo_solar', title: 'Solar System 101', channel: 'Nat Geo Kids',
      thumbnail: 'https://img.youtube.com/vi/libKVRa01L8/mqdefault.jpg', url: 'https://www.youtube.com/embed/libKVRa01L8', category: 'science'
    },
    {
      id: 'asap_sleep', title: 'What If You Stopped Sleeping?', channel: 'AsapSCIENCE',
      thumbnail: 'https://img.youtube.com/vi/nNHsA4WIFvc/mqdefault.jpg', url: 'https://www.youtube.com/embed/nNHsA4WIFvc', category: 'science'
    },
    {
      id: 'kurz_blackhole', title: 'The Largest Black Hole', channel: 'Kurzgesagt',
      thumbnail: 'https://img.youtube.com/vi/0jHsq36_NTU/mqdefault.jpg', url: 'https://www.youtube.com/embed/0jHsq36_NTU', category: 'science'
    },
    {
      id: 'scishow_teeth', title: 'Why Do We Brush Our Teeth?', channel: 'SciShow Kids',
      thumbnail: 'https://img.youtube.com/vi/aOebfGGcjXw/mqdefault.jpg', url: 'https://www.youtube.com/embed/aOebfGGcjXw', category: 'science'
    }
  ];

  // Active videos to display (subset of pool)
  hubVideos: HubVideo[] = [];

  rotateContent() {
    // Rotation Logic: Updates every 2 days
    const twoDaysInMs = 1000 * 60 * 60 * 24 * 2;
    const epochDays = Math.floor(Date.now() / twoDaysInMs);

    // Select 4 videos based on the current 2-day window
    const startIndex = (epochDays * 4) % this.allHubVideos.length;

    // Handle wrapping around the array
    let selected = this.allHubVideos.slice(startIndex, startIndex + 4);
    if (selected.length < 4) {
      selected = selected.concat(this.allHubVideos.slice(0, 4 - selected.length));
    }

    this.hubVideos = selected;
  }

  hubBooks: HubBook[] = [];
  hubNews: HubArticle[] = [];
  selectedVideo: SafeResourceUrl | null = null;
  isVideoModalOpen: boolean = false;
  isDocumentMode: boolean = false; // New flag for styling modal for reading
  isReaderMode: boolean = false; // New flag for internal content reading
  readerContent: SafeHtml = ''; // Content for reader mode
  iframeTitle: string = ''; // To show title in modal

  async searchHub() {
    if (this.activeHubTab === 'docs') {
      this.hubLoading = true;
      const query = this.searchHubQuery.trim() || 'computer science';
      try {
        const url = `https://orbitbackend-0i66.onrender.com/api/books/search?q=${encodeURIComponent(query)}`;
        const response: any = await lastValueFrom(this.http.get(url));
        if (response && response.success) {
          this.hubBooks = response.books;
        }
      } catch (error) {
        console.error('Error fetching books:', error);
        this.hubBooks = [];
      } finally {
        this.hubLoading = false;
      }
    } else if (this.activeHubTab === 'news') {
      this.getEducationNews();
    }
  }

  async getEducationNews(topic?: string) {
    this.hubLoading = true;
    try {
      let url = 'https://orbitbackend-0i66.onrender.com/api/news';
      if (topic) {
        url += `?topics=${topic}`;
      }

      const response: any = await lastValueFrom(this.http.get(url));
      if (response && response.success) {
        this.hubNews = response.articles;
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      this.hubNews = [];
    } finally {
      this.hubLoading = false;
    }
  }

  filterNews(topic: string) {
    this.getEducationNews(topic);
  }

  playVideo(video: HubVideo) {
    this.iframeTitle = video.title;
    this.isDocumentMode = false;
    this.selectedVideo = this.sanitizer.bypassSecurityTrustResourceUrl(video.url + '?autoplay=1');
    this.isVideoModalOpen = true;
  }

  selectedArticle: HubArticle | null = null;

  readNews(news: HubArticle) {
    this.iframeTitle = news.title;
    this.isDocumentMode = true;
    this.selectedArticle = news;

    if (news.content) {
      // Use internal reader mode to avoid iframe blocking
      this.isReaderMode = true;
      this.readerContent = this.sanitizer.bypassSecurityTrustHtml(news.content);
      // Still set selectedVideo to link for "Open in New Tab" button
      this.selectedVideo = this.sanitizer.bypassSecurityTrustResourceUrl(news.link);
    } else {
      // Fallback to iframe (likely to fail if X-Frame-Options set)
      this.isReaderMode = false;
      this.selectedVideo = this.sanitizer.bypassSecurityTrustResourceUrl(news.link);
    }
    this.isVideoModalOpen = true;
  }

  readBook(book: HubBook) {
    this.iframeTitle = book.title;
    this.isDocumentMode = true;

    if (book.type === 'gutenberg' && book.full_text_url) {
      this.isReaderMode = false;
      this.selectedVideo = this.sanitizer.bypassSecurityTrustResourceUrl(book.full_text_url);
    } else if (book.type === 'googlebooks' && book.embed_id) {
      this.isReaderMode = false;
      // Google Books Embedded Viewer
      const embedUrl = `https://books.google.com/books?id=${book.embed_id}&lpg=PP1&pg=PP1&output=embed`;
      this.selectedVideo = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
    } else if (book.type === 'openlibrary' && book.ia && book.ia.length > 0) {
      this.isReaderMode = false;
      const embedUrl = `https://archive.org/embed/${book.ia[0]}`;
      this.selectedVideo = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
    } else if (book.key) {
      window.open(`https://openlibrary.org${book.key}`, '_blank');
      return;
    }
    this.isVideoModalOpen = true;
  }

  closeVideo() {
    this.selectedVideo = null;
    this.selectedArticle = null;
    this.isVideoModalOpen = false;
    this.isDocumentMode = false;
    this.isReaderMode = false;
    this.readerContent = '';
    this.iframeTitle = '';
  }

  // Trigger search on tab change if needed
  // Trigger search on tab change if needed
  setHubTab(tab: 'videos' | 'docs' | 'news') {
    this.activeHubTab = tab;
    if (tab === 'docs' && this.hubBooks.length === 0) {
      this.searchHub();
    } else if (tab === 'news' && this.hubNews.length === 0) {
      this.getEducationNews();
    }
  }

}