import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  HttpClient,
  HttpClientModule,
  HttpEventType,
  HttpHeaders,
} from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TruncatePipe } from '../../../truncatepipe';

declare var Chart: any;

// ============================================================
// INTERFACES
// ============================================================



// ====================== TOAST MODEL ======================
interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}



interface UserPayload {
  fullName: string;
  email: string;
  role: string;
  photo: string;
}

interface Announcement {
  id: string;
  classId: string;
  className?: string;
  title: string;
  message: string;
  sendEmail: boolean;
  createdAt: Date;
}

// Fixed: Create a proper interface for upload files with progress
interface UploadFile {
  file: File;
  progress: number;
  name: string;
  size: number;
  type: string;
}
interface Material {
  _id: string;
  title: string;
  type: string;
  size: number;
  fileUrl?: string;
  externalLink?: string;
  createdAt: string;
  classId: string;
  assignedClasses: string[];
  date: string;
}
@Component({
  selector: 'app-faculty',
  templateUrl: './faculty.html',
  styleUrls: ['./faculty.css'],
  imports: [
    ReactiveFormsModule,
    HttpClientModule,
    CommonModule,
    FormsModule,
    TruncatePipe,
  ],
  standalone: true,
})
export class Faculty implements OnInit {
  // ====================== TOAST STATE ======================
  toasts: Toast[] = [];
  private toastId = 0;


  // ============================================================
  // USER & CLASS DATA PROPERTIES
  // ============================================================
  user: UserPayload | null = null;
  myClasses: any[] = [];
  recentClasses: any[] = [];
  totalclasses = 0;


  name: string | undefined;
  role: string | undefined;
  photourl: string | undefined;

  classesCount = 0;
  studentsCount = 0;
  announcementsCount = 0;
  materialsCount = 0;
  totalMaterialsCount = 0;

  // ============================================================
  // ANALYTICS PROPERTIES
  // ============================================================
  totalSessions = 0;
  totalHours = 0;
  avgAttendance = 0;
  allSessions: any[] = [];
  filteredSessions: any[] = [];
  selectedAnalyticsClass = '';

  // Class-level analytics
  classAnalytics: any[] = [];
  expandedClassId: string | null = null;
  selectedStudentDetails: any = null;
  loadingClassAnalytics = false;

  // ============================================================
  // CLASS CREATION PROPERTIES
  // ============================================================
  form!: FormGroup;
  submitting = false;
  successMessage = '';
  errorMessage = '';
  createdClass: any = null;

  // ============================================================
  // ANNOUNCEMENTS PROPERTIES
  // ============================================================
  announcementForm!: FormGroup;
  sending = false;
  announcementSuccessMessage = '';
  announcementErrorMessage = '';
  recentAnnouncements: Announcement[] = [];

  // ============================================================
  // PROFILE EDIT PROPERTIES
  // ============================================================
  editMode: '' | 'photo' | 'password' = '';
  selectedFile: File | null = null;

  successMsg = '';
  errorMsg = '';

  currentPass = '';
  newPass = '';
  confirmPass = '';

  // ============================================================
  // UI SECTIONS PROPERTIES
  // ============================================================
  selectedSection: string = 'dashboard';
  materials: Material[] = [];
  filteredMaterials: Material[] = [];
  selectedFiles: UploadFile[] = [];
  uploading = false;
  uploadProgress = 0;
  currentMaterialClassId: string | null = null;

  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('materialTitle') materialTitle!: ElementRef;
  @ViewChild('classSelect') classSelect!: ElementRef;

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.initializeForms();
  }

  // ============================================================
  // FORM INITIALIZATION METHODS
  // ============================================================
  initializeForms() {
    // Class creation form
    this.form = this.fb.group({
      className: ['', [Validators.required, Validators.minLength(3)]],
      subject: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
    });

    // Announcement form
    this.announcementForm = this.fb.group({
      selectedClass: ['', Validators.required],
      title: ['', [Validators.required, Validators.minLength(5)]],
      message: ['', [Validators.required, Validators.minLength(10)]],
      sendEmail: [false],
    });

    // Debug: announcement form status
    this.announcementForm.statusChanges.subscribe((status) => {
      console.log('Announcement Form status:', status);
    });
  }

  // ============================================================
  // LIFECYCLE METHODS
  // ============================================================
  ngOnInit() {
    this.loadUser();
    this.requestNotificationPermission();
  }


  // ========================================================
  // TOAST METHODS
  // ========================================================
  showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = ++this.toastId;
    this.toasts.push({ id, message, type });

    setTimeout(() => this.removeToast(id), 3000);
  }

  removeToast(id: number) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }






  // ============================================================
  // USER & BASE DATA LOAD METHODS
  // ============================================================
  loadUser() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('orbit_user') : null;
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    this.http
      .get('https://orbitbackend-0i66.onrender.com/auth/redirect', {
        withCredentials: true,
        headers: headers  // 🔥 FIX: Send token in Authorization header (matches student dashboard)
      })
      .subscribe((res: any) => {
        if (!res.user) {
          window.location.href = '/login';
          return;
        }

        this.user = res.user;
        this.name = res.user.fullName;
        this.role = res.user.role;
        this.photourl = res.user.photo;

        this.loadclass();
        this.loadRecentAnnouncements();
      });
  }

  /**
   * Load classes for the current faculty user
   */
  async loadclass() {
    if (!this.user?.email) return;

    try {
      const res: any = await this.http
        .post(
          'https://orbitbackend-0i66.onrender.com/api/classes/myclass',
          { facultyEmail: this.user.email },
          { withCredentials: true }
        )
        .toPromise();

      this.myClasses = res.classes || [];
      this.totalclasses = this.myClasses.length;
      this.classesCount = this.myClasses.length;
      this.studentsCount = this.myClasses.reduce(
        (total, cls) => total + (cls.studentsCount || 0),
        0
      );
      this.recentClasses = this.myClasses.slice(0, 3);

      console.log('My classes structure:', this.myClasses);

      // Load total materials count
      await this.loadTotalMaterialsCount();
    } catch (e) {
      console.error('Error loading classes', e);
    }
  }

  async loadTotalMaterialsCount() {
    if (!this.myClasses.length) {
      this.totalMaterialsCount = 0;
      return;
    }

    let total = 0;
    for (const cls of this.myClasses) {
      try {
        const res: any = await this.http.get(`https://orbitbackend-0i66.onrender.com/api/material/${cls._id}`, { withCredentials: true }).toPromise();
        const list = res.materials || [];
        total += list.length;
      } catch (e) {
        console.error('Error loading materials for class', cls._id, e);
      }
    }
    this.totalMaterialsCount = total;
  }

  async loadAllMaterials() {
    if (!this.myClasses.length) {
      this.materials = [];
      this.filteredMaterials = [];
      this.materialsCount = 0;
      return;
    }

    let allMaterials: any[] = [];
    for (const cls of this.myClasses) {
      try {
        const res: any = await this.http.get(`https://orbitbackend-0i66.onrender.com/api/material/${cls._id}`, { withCredentials: true }).toPromise();
        const list = res.materials || [];
        const mappedList = list.map((m: any) => ({
          ...m,
          size: m.size || 0,
          date: m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '',
          assignedClasses: [this.getClassName(m.classId) || 'Selected Class'],
        }));
        allMaterials = allMaterials.concat(mappedList);
      } catch (e) {
        console.error('Error loading materials for class', cls._id, e);
      }
    }
    this.materials = allMaterials;
    this.filteredMaterials = [...this.materials];
    this.materialsCount = this.materials.length;
  }

  // ============================================================
  // CLASS CREATION METHODS
  // ============================================================
  async createClass() {
    this.submitting = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.createdClass = null;

    if (this.form.invalid) {
      this.errorMessage = 'Please fill required fields.';
      this.submitting = false;
      return;
    }

    // Check for profile photo
    if (!this.user?.photo) {
      this.errorMessage = 'Profile photo is required. Please update your profile.';
      this.showToast(this.errorMessage, 'error');
      this.submitting = false;
      return;
    }

    const payload = {
      className: this.form.value.className,
      subject: this.form.value.subject,
      description: this.form.value.description,
      facultyEmail: this.user?.email,
      facultyName: this.user?.fullName,
      facultyPhoto: this.user?.photo,
    };

    try {
      const res: any = await this.http
        .post('https://orbitbackend-0i66.onrender.com/api/class/create', payload, {
          withCredentials: true,
        })
        .toPromise();

      this.successMessage = res?.message || 'Class created successfully  🎉';
      this.showToast(this.successMessage, 'success');
      this.createdClass = res?.class || null;
      this.form.reset();
      await this.loadclass();
    } catch (err: any) {
      console.error('Create class error:', err);
      this.errorMessage = err?.error?.message || 'Failed to create class';
      this.showToast(this.errorMessage, 'error');
    } finally {
      this.submitting = false;
    }
  }

  // ============================================================
  // CLASS MANAGEMENT METHODS
  // ============================================================
  /**
   * Opens a class in a modal popup with detailed information
   */
  /**
   * Opens a class in a modal popup with detailed information - REDESIGNED UI
   */
  /**
   * Opens a class in a modal popup with detailed information - REDESIGNED UI + SCHEDULE SYSTEM
   */
  async openclass(classCode: string) {
    try {
      const res: any = await this.http
        .post(
          `https://orbitbackend-0i66.onrender.com/api/openclass/${classCode}`,
          {},
          { withCredentials: true }
        )
        .toPromise();

      const room = res.room;
      const students = room.students || [];

      // Create overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position:fixed; inset:0;
        background:rgba(0, 10, 69, 0.4); /* Dark blue tint */
        backdrop-filter:blur(8px);
        display:flex; justify-content:center; align-items:center;
        z-index:99999; animation:fadeIn .3s ease;
        font-family:'Inter', sans-serif;
      `;

      // Add animation styles
      const animStyle = document.createElement('style');
      animStyle.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes fadeIn { from{opacity:0;} to{opacity:1;} }
        @keyframes scaleUp { from{transform:scale(.95); opacity:0;} to{transform:scale(1); opacity:1;} }
        @keyframes slideIn { from{opacity:0; transform:translateY(10px);} to{opacity:1; transform:translateY(0);} }
        .tab-content-transition { animation: slideIn .3s ease-out; }
        
        /* Scrollbar styling */
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e0e6ed; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

        .btn-hover-effect { transition: all 0.2s ease; }
        .btn-hover-effect:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 10, 69, 0.15); }
        .btn-hover-effect:active { transform: translateY(0); }
        
        .nav-tab {
          position: relative;
          color: #64748b;
          transition: all 0.2s;
        }
        .nav-tab:hover { color: #000a45; background: rgba(0, 10, 69, 0.03); }
        .nav-tab.active { color: #000a45; font-weight: 600; background: rgba(0, 10, 69, 0.06); }
      `;
      document.head.appendChild(animStyle);

      // Create card container
      const card = document.createElement('div');
      card.style.cssText = `
        width:900px; max-width:95vw; height:85vh;
        background:#ffffff;
        border-radius:16px;
        box-shadow:0 25px 60px rgba(0, 10, 69, 0.2);
        display:flex; flex-direction:column;
        overflow:hidden; animation:scaleUp .3s cubic-bezier(0.16, 1, 0.3, 1);
        border: 1px solid rgba(0, 10, 69, 0.05);
      `;

      // ================= HEADER SECTION =================
      const header = document.createElement('div');
      header.style.cssText = `
        padding: 24px 32px;
        background: #ffffff;
        border-bottom: 1px solid rgba(0, 10, 69, 0.08);
        display: flex; justify-content: space-between; align-items: flex-start;
      `;

      // Header Left
      const headerLeft = document.createElement('div');
      headerLeft.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
          <h2 style="margin:0; font-size:24px; font-weight:700; color:#000a45; letter-spacing:-0.5px;">${room.className}</h2>
          <span style="background:rgba(0, 10, 69, 0.08); color:#000a45; padding:4px 10px; border-radius:6px; font-size:12px; font-weight:600;">${room.classCode}</span>
        </div>
        <p style="margin:0; font-size:14px; color:#64748b; font-weight:500;">${room.subject}</p>
        <div style="display:flex; gap:20px; margin-top:16px;">
           <div style="display:flex; align-items:center; gap:6px; font-size:13px; color:#475569;">
              <i class="fa-solid fa-users" style="color:#000a45;"></i>
              <span style="font-weight:600; color:#000a45;">${students.length}</span> Students
           </div>
           <div style="display:flex; align-items:center; gap:6px; font-size:13px; color:#475569;">
              <i class="fa-solid fa-chalkboard-user" style="color:#000a45;"></i>
              Faculty: <span style="font-weight:600; color:#000a45;">${room.facultyName}</span>
           </div>
        </div>
      `;

      // Header Right (Actions)
      const headerRight = document.createElement('div');
      headerRight.style.cssText = `display:flex; gap:10px; align-items:center;`;

      // Action Button Helper
      const createActionBtn = (icon: string, title: string, onClick: () => void, isDestructive = false) => {
        const btn = document.createElement('button');
        btn.innerHTML = `<i class="${icon}"></i>`;
        btn.title = title;
        btn.className = 'btn-hover-effect';
        btn.style.cssText = `
          width: 36px; height: 36px;
          border-radius: 10px;
          border: 1px solid ${isDestructive ? '#fee2e2' : '#e2e8f0'};
          background: ${isDestructive ? '#fef2f2' : '#ffffff'};
          color: ${isDestructive ? '#ef4444' : '#000a45'};
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px;
        `;
        btn.onclick = onClick;
        return btn;
      };

      // Close Button (Top Right)
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      closeBtn.style.cssText = `
        position: absolute; top: 20px; right: 20px;
        background: transparent; border: none;
        color: #94a3b8; font-size: 20px; cursor: pointer;
        transition: color 0.2s;
        z-index: 10;
      `;
      closeBtn.onmouseover = () => closeBtn.style.color = '#000a45';
      closeBtn.onmouseout = () => closeBtn.style.color = '#94a3b8';
      closeBtn.onclick = () => overlay.remove();

      card.style.position = 'relative';
      card.appendChild(closeBtn);

      const actionsContainer = document.createElement('div');
      actionsContainer.style.cssText = `display:flex; gap:8px; margin-top: 4px;`;

      // [NEW] Schedule Button
      const scheduleBtn = createActionBtn('fa-regular fa-calendar-plus', 'Schedule New Class', () => {
        // Switch to Scheduled tab and trigger modal
        switchTab('scheduled');
        // We'll create a trigger accessible from here or just rely on the tab rendering a "Create" button 
        // But for UX, let's auto-open the modal. We need to access the create logic.
        // A simple way is to define `openScheduleModal` variable in higher scope.
        if (this.openScheduleModalFn) this.openScheduleModalFn();
      });

      const copyCodeBtn = createActionBtn('fa-regular fa-copy', 'Copy Class Code', async () => {
        try {
          await navigator.clipboard.writeText(room.classCode);
          this.showToast('Class code copied!', 'success');
        } catch {
          this.showToast(room.classCode, 'info');
        }
      });

      const qrBtn = createActionBtn('fa-solid fa-qrcode', 'Show QR Code', () => {
        const joinUrl = `${window.location.origin}/join/${room.classCode}`;
        const qrOverlay = document.createElement('div');
        qrOverlay.style.cssText = `
          position:fixed; inset:0; display:flex; justify-content:center; align-items:center;
          background:rgba(0,10,69,0.7); z-index:100002; backdrop-filter:blur(4px);
        `;
        const qrCard = document.createElement('div');
        qrCard.style.cssText = `
          background:white; padding:32px; border-radius:20px;
          text-align:center; box-shadow:0 20px 50px rgba(0,0,0,0.3);
          font-family: 'Inter', sans-serif;
        `;
        qrCard.innerHTML = `
          <h3 style="margin:0 0 16px;font-size:20px;color:#000a45;">Join Class</h3>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}" 
               style="border-radius:12px; margin-bottom:16px;">
          <p style="margin:0;font-size:13px;color:#64748b;">Scan to join instantly</p>
        `;
        qrOverlay.onclick = () => qrOverlay.remove();
        document.body.appendChild(qrOverlay);
      });

      const editBtn = createActionBtn('fa-solid fa-pencil', 'Edit Class Details', () => {
        const name = prompt('Update class name:', room.className);
        const desc = prompt('Update subject name:', room.subject);
        if (!name || !desc) return;

        this.http.put(`https://orbitbackend-0i66.onrender.com/api/change/updateclassname/${room._id}`,
          { className: name, subject: desc }, { withCredentials: true })
          .subscribe({
            next: () => {
              this.showToast('Class updated', 'success');
              headerLeft.querySelector('h2')!.textContent = name;
              headerLeft.querySelector('p')!.textContent = desc;
            },
            error: () => this.showToast('Update failed', 'error')
          });
      });

      const deleteBtn = createActionBtn('fa-regular fa-trash-can', 'Delete Class', () => {
        if (!confirm('Are you sure you want to delete this class? This cannot be undone.')) return;
        this.http.delete(`https://orbitbackend-0i66.onrender.com/api/deleteclass/${room._id}`, { withCredentials: true })
          .subscribe({
            next: () => {
              this.showToast('Class deleted', 'success');
              overlay.remove();
              this.loadclass();
            },
            error: () => this.showToast('Failed to delete class', 'error')
          });
      }, true);

      actionsContainer.appendChild(scheduleBtn); // Add Schedule Button
      actionsContainer.appendChild(copyCodeBtn);
      actionsContainer.appendChild(qrBtn);
      actionsContainer.appendChild(editBtn);
      actionsContainer.appendChild(deleteBtn);

      headerRight.appendChild(actionsContainer);

      header.appendChild(headerLeft);
      header.appendChild(headerRight);


      // ================= TABS SECTION =================
      const tabsBar = document.createElement('div');
      tabsBar.style.cssText = `
        padding: 0 32px;
        background: #ffffff;
        border-bottom: 1px solid rgba(0, 10, 69, 0.08);
        display: flex; gap: 32px;
      `;

      const createNavTab = (text: string, isActive = false) => {
        const tab = document.createElement('div');
        tab.className = `nav-tab ${isActive ? 'active' : ''}`;
        tab.textContent = text;
        tab.style.cssText = `
            padding: 16px 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            border-bottom: 2px solid ${isActive ? '#000a45' : 'transparent'};
          `;
        return tab;
      };

      const tabStudents = createNavTab('Students', true);
      const tabScheduled = createNavTab('Scheduled Classes'); // [NEW]
      const tabAnnouncements = createNavTab('Announcements');
      const tabMaterials = createNavTab('Materials');
      const tabLive = createNavTab('Live Class');

      tabsBar.appendChild(tabStudents);
      tabsBar.appendChild(tabScheduled);
      tabsBar.appendChild(tabAnnouncements);
      tabsBar.appendChild(tabMaterials);
      tabsBar.appendChild(tabLive);

      // ================= CONTENT SECTION =================
      const content = document.createElement('div');
      content.className = 'custom-scroll';
      content.style.cssText = `
        flex: 1;
        padding: 32px;
        background: #f8fafc;
        overflow-y: auto;
      `;

      // --- RENDERERS ---

      const renderStudentsTab = () => {
        content.innerHTML = '';
        const controlsRow = document.createElement('div');
        controlsRow.style.cssText = `display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;`;

        const searchInput = document.createElement('input');
        searchInput.placeholder = 'Search students...';
        searchInput.style.cssText = `
            padding: 10px 16px; border-radius: 8px; border: 1px solid #e2e8f0;
            outline: none; font-size: 14px; width: 280px;
        `;
        controlsRow.appendChild(searchInput);
        content.appendChild(controlsRow);

        const grid = document.createElement('div');
        grid.style.cssText = `display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:16px;`;

        const renderList = () => {
          grid.innerHTML = '';
          const term = searchInput.value.toLowerCase().trim();
          const filtered = students.filter((s: any) =>
            (s.studentName || '').toLowerCase().includes(term) || (s.studentEmail || '').toLowerCase().includes(term)
          );

          if (!filtered.length) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#94a3b8; padding:40px;">No students found.</div>`;
            return;
          }

          filtered.forEach((s: any) => {
            const card = document.createElement('div');
            card.style.cssText = `
                    background: white; border: 1px solid #f1f5f9; border-radius: 12px;
                    padding: 16px; display: flex; align-items: center; gap: 16px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
                `;

            const initials = (s.studentName || '?').substring(0, 2).toUpperCase();
            card.innerHTML = `
                    <div style="
                        width: 42px; height: 42px; border-radius: 50%; background: #e0e7ff; 
                        color: #000a45; display: flex; align-items: center; justify-content: center;
                        font-weight: 700; font-size: 14px; flex-shrink: 0;
                    ">
                        ${initials}
                    </div>
                    <div style="overflow:hidden;">
                        <div style="font-weight: 600; color: #1e293b; font-size:15px; truncate;">${s.studentName}</div>
                        <div style="color: #64748b; font-size: 13px; truncate;">${s.studentEmail}</div>
                    </div>
                `;
            grid.appendChild(card);
          });
        };

        searchInput.oninput = renderList;
        renderList();
        content.appendChild(grid);
      };

      // [NEW] RENDER SCHEDULED TAB
      const renderScheduledTab = () => {
        content.innerHTML = '';

        const container = document.createElement('div');
        container.style.cssText = `max-width: 800px; margin: 0 auto; display:flex; flex-direction:column; gap:24px;`;

        // Header with "Create Schedule" button
        const topRow = document.createElement('div');
        topRow.style.cssText = `display:flex; justify-content:space-between; align-items:center;`;
        topRow.innerHTML = `
            <div>
               <h3 style="margin:0; color:#000a45; font-size:18px;">Upcoming Classes</h3>
               <p style="margin:4px 0 0; color:#64748b; font-size:13px;">Manage your future sessions</p>
            </div>
         `;

        const scheduleBtn = document.createElement('button');
        scheduleBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Schedule Class';
        scheduleBtn.className = 'btn-hover-effect';
        scheduleBtn.style.cssText = `
            background: #000a45; color: white; border: none; padding: 10px 20px;
            border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer;
         `;

        const openModal = () => {
          // Modal Logic
          const modal = document.createElement('div');
          modal.style.cssText = `
                position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:100005;
                display:flex; justify-content:center; align-items:center; backdrop-filter:blur(2px);
            `;

          const mCard = document.createElement('div');
          mCard.style.cssText = `
                background:white; width:400px; padding:32px; border-radius:16px;
                box-shadow:0 20px 60px rgba(0,0,0,0.2); animation: scaleUp 0.2s ease;
            `;

          mCard.innerHTML = `
                <h3 style="margin:0 0 24px; color:#000a45; font-size:20px;">Schedule Class</h3>
                <div style="display:flex; flex-direction:column; gap:16px;">
                    <div>
                        <label style="display:block; margin-bottom:8px; font-size:13px; font-weight:600; color:#475569;">Date & Time</label>
                        <input type="datetime-local" id="scheduleTime" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;">
                    </div>
                    <div>
                         <label style="display:block; margin-bottom:8px; font-size:13px; font-weight:600; color:#475569;">Duration (Minutes)</label>
                         <input type="number" id="scheduleDuration" value="60" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;">
                    </div>
                </div>
                <div style="display:flex; gap:12px; margin-top:32px;">
                    <button id="cancelSchedule" style="flex:1; padding:10px; border:1px solid #e2e8f0; background:white; color:#64748b; border-radius:8px; cursor:pointer;">Cancel</button>
                    <button id="confirmSchedule" style="flex:1; padding:10px; border:none; background:#000a45; color:white; border-radius:8px; cursor:pointer; font-weight:600;">Confirm</button>
                </div>
            `;

          modal.appendChild(mCard);
          document.body.appendChild(modal);

          // Set min date to now
          const now = new Date();
          now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
          const input = mCard.querySelector('#scheduleTime') as HTMLInputElement;
          input.min = now.toISOString().slice(0, 16);

          mCard.querySelector('#cancelSchedule')!.addEventListener('click', () => modal.remove());
          mCard.querySelector('#confirmSchedule')!.addEventListener('click', async () => {
            const time = input.value;
            const duration = (mCard.querySelector('#scheduleDuration') as HTMLInputElement).value;

            if (!time) { alert('Please select a time'); return; }

            try {
              const btn = mCard.querySelector('#confirmSchedule') as HTMLButtonElement;
              btn.textContent = 'Scheduling...';
              btn.disabled = true;

              await this.http.post('https://orbitbackend-0i66.onrender.com/api/schedule/schedule', {
                classId: room._id,
                scheduledTime: time,
                duration: Number(duration)
              }, { withCredentials: true }).toPromise();

              this.showToast('Class scheduled successfully!', 'success');
              modal.remove();
              this.loadScheduledClasses(room._id, listArea); // Refresh list
            } catch (e) {
              alert('Failed to schedule class. Please try again.');
              modal.remove();
            }
          });
        };

        // Export function to class scope so header button can use it
        this.openScheduleModalFn = openModal;
        scheduleBtn.onclick = openModal;

        topRow.appendChild(scheduleBtn);
        container.appendChild(topRow);

        // List Area
        const listArea = document.createElement('div');
        listArea.id = 'scheduledClassesList';
        listArea.style.cssText = `display:flex; flex-direction:column; gap:12px;`;
        listArea.innerHTML = `<div style="text-align:center; padding:40px; color:#94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>`;

        container.appendChild(listArea);
        content.appendChild(container);

        // Load Data
        this.loadScheduledClasses(room._id, listArea);
      };

      const renderAnnouncementsTab = () => {
        content.innerHTML = '';
        const container = document.createElement('div');
        container.style.cssText = `max-width: 700px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;`;

        // Create Post Card
        const createCard = document.createElement('div');
        createCard.style.cssText = `
            background: white; border-radius: 16px; padding: 24px;
            box-shadow: 0 4px 20px rgba(0, 10, 69, 0.04); border: 1px solid rgba(0, 10, 69, 0.04);
         `;
        createCard.innerHTML = `<h3 style="margin:0 0 16px; font-size:16px; color:#000a45; font-weight:600;">Create Announcement</h3>`;

        const titleInput = document.createElement('input');
        titleInput.placeholder = 'Announcement Title';
        titleInput.style.cssText = `
             display:block; width:100%; padding: 12px; margin-bottom: 12px;
             border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; outline:none;
         `;

        const msgInput = document.createElement('textarea');
        msgInput.placeholder = 'What do you want to announce?';
        msgInput.rows = 3;
        msgInput.style.cssText = `
             display:block; width:100%; padding: 12px; margin-bottom: 12px;
             border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; outline:none; resize: vertical; font-family:inherit;
         `;

        const attachInput = document.createElement('input');
        attachInput.placeholder = 'Attachment URL (optional)';
        attachInput.style.cssText = titleInput.style.cssText;
        attachInput.style.marginBottom = '16px';

        const postBtn = document.createElement('button');
        postBtn.textContent = 'Post Announcement';
        postBtn.className = 'btn-hover-effect';
        postBtn.style.cssText = `
            background: #000a45; color: white; border: none; padding: 10px 24px;
            border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer;
            width: 100%;
         `;

        postBtn.onclick = async () => {
          const t = titleInput.value.trim();
          const m = msgInput.value.trim();
          if (!t || !m) { this.showToast('Please enter title and message', 'error'); return; }

          try {
            postBtn.disabled = true;
            postBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Posting...';
            await this.http.post('https://orbitbackend-0i66.onrender.com/api/announcements', {
              classId: room._id, title: t, message: m, attachmentUrl: attachInput.value.trim() || undefined
            }, { withCredentials: true }).toPromise();

            this.showToast('Posted successfully', 'success');
            titleInput.value = ''; msgInput.value = ''; attachInput.value = '';
            this.loadAnnouncementsForPopup(room._id);
          } catch (e) {
            this.showToast('Failed to post', 'error');
          } finally {
            postBtn.disabled = false;
            postBtn.textContent = 'Post Announcement';
          }
        };

        createCard.appendChild(titleInput);
        createCard.appendChild(msgInput);
        createCard.appendChild(attachInput);
        createCard.appendChild(postBtn);
        container.appendChild(createCard);

        // List Area
        const listContainer = document.createElement('div');
        listContainer.id = 'popupAnnouncements';
        listContainer.style.cssText = `display:flex; flex-direction:column; gap:16px;`;
        listContainer.innerHTML = `<div style="text-align:center; padding:20px; color:#94a3b8;">Loading feed...</div>`;

        container.appendChild(listContainer);
        content.appendChild(container);

        this.loadAnnouncementsForPopup(room._id);
      };

      const renderMaterialsTab = () => {
        content.innerHTML = '';
        const container = document.createElement('div');
        container.style.cssText = `max-width: 800px; margin: 0 auto;`;

        const listContainer = document.createElement('div');
        listContainer.id = 'popupMaterials';
        listContainer.style.cssText = `display:flex; flex-direction:column; gap:12px;`;
        listContainer.innerHTML = `<div style="text-align:center; padding:20px; color:#94a3b8;">Loading materials...</div>`;

        container.appendChild(listContainer);
        content.appendChild(container);

        this.loadMaterialsForPopup(room._id);
      };

      const renderLiveTab = () => {
        content.innerHTML = '';
        const container = document.createElement('div');
        container.style.cssText = `
            height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;
            text-align: center; max-width: 480px; margin: 0 auto;
         `;

        container.innerHTML = `
            <div style="
                width: 80px; height: 80px; background: #eff6ff; border-radius: 50%; 
                display: flex; align-items: center; justify-content: center; margin-bottom: 24px;
            ">
                <i class="fa-solid fa-video" style="font-size: 32px; color: #000a45;"></i>
            </div>
            <h3 style="margin: 0 0 12px; font-size: 20px; color: #000a45;">Start Live Session</h3>
            <p style="margin: 0 0 32px; color: #64748b; line-height: 1.6;">
                Launch an interactive video classroom with whiteboard, polls, and screen sharing. 
                Notify students automatically.
            </p>
         `;

        const startBtn = document.createElement('button');
        startBtn.innerHTML = '<i class="fa-solid fa-play"></i> Start Now';
        startBtn.className = 'btn-hover-effect';
        startBtn.style.cssText = `
            padding: 14px 40px; border-radius: 50px; border: none;
            background: #000a45; color: white; font-size: 16px; font-weight: 600;
            cursor: pointer; box-shadow: 0 10px 20px rgba(0, 10, 69, 0.2);
         `;

        startBtn.onclick = async () => {
          try {
            startBtn.classList.add('disabled');
            startBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Initializing...';

            const res: any = await this.http.post(
              'https://orbitbackend-0i66.onrender.com/api/sessions/create',
              {
                classId: room._id,
                classCode: room.classCode,
                facultyEmail: this.user?.email,
                facultyName: this.user?.fullName,
                sessionTitle: 'Live Class - ' + room.subject,
                duration: 60
              }, { withCredentials: true }
            ).toPromise();

            if (res.sessionId) {
              const url = `https://orbitbackend-0i66.onrender.com/video/room.html?session=${res.sessionId}&role=faculty&email=${this.user?.email}&name=${encodeURIComponent(this.user?.fullName || '')}&deviceId=${localStorage.getItem('deviceId') || ''}`;
              window.open(url, '_blank');
              this.showToast('Live session started', 'success');
            }
            startBtn.innerHTML = '<i class="fa-solid fa-play"></i> Start Now';
          } catch (e) {
            this.showToast('Failed to start session', 'error');
            startBtn.innerHTML = 'Retry';
          }
        };

        container.appendChild(startBtn);
        content.appendChild(container);
      };

      // Tab Switching Logic
      const switchTab = (tabName: string) => {
        [tabStudents, tabScheduled, tabAnnouncements, tabMaterials, tabLive].forEach(t => {
          t.classList.remove('active');
          t.style.borderBottomColor = 'transparent';
          t.style.fontWeight = '500';
        });

        if (tabName === 'students') {
          tabStudents.classList.add('active');
          tabStudents.style.borderBottomColor = '#000a45';
          tabStudents.style.fontWeight = '600';
          renderStudentsTab();
        } else if (tabName === 'scheduled') {
          tabScheduled.classList.add('active');
          tabScheduled.style.borderBottomColor = '#000a45';
          tabScheduled.style.fontWeight = '600';
          renderScheduledTab();
        } else if (tabName === 'announcements') {
          tabAnnouncements.classList.add('active');
          tabAnnouncements.style.borderBottomColor = '#000a45';
          tabAnnouncements.style.fontWeight = '600';
          renderAnnouncementsTab();
        } else if (tabName === 'materials') {
          tabMaterials.classList.add('active');
          tabMaterials.style.borderBottomColor = '#000a45';
          tabMaterials.style.fontWeight = '600';
          renderMaterialsTab();
        } else if (tabName === 'live') {
          tabLive.classList.add('active');
          tabLive.style.borderBottomColor = '#000a45';
          tabLive.style.fontWeight = '600';
          renderLiveTab();
        }
      };

      tabStudents.onclick = () => switchTab('students');
      tabScheduled.onclick = () => switchTab('scheduled');
      tabAnnouncements.onclick = () => switchTab('announcements');
      tabMaterials.onclick = () => switchTab('materials');
      tabLive.onclick = () => switchTab('live');

      // Initial Render
      card.appendChild(header);
      card.appendChild(tabsBar);
      card.appendChild(content);
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      switchTab('students');

      // Escape Key Close
      const escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          overlay.remove();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);

    } catch (err) {
      console.error('Error opening class', err);
      this.showToast('Could not open class details', 'error');
    }
  }

  // [NEW HELPER] Load Scheduled Classes
  openScheduleModalFn: Function | null = null;

  async loadScheduledClasses(classId: string, container: HTMLElement) {
    try {
      const res: any = await this.http.get(`https://orbitbackend-0i66.onrender.com/api/schedule/class/${classId}`).toPromise();
      container.innerHTML = '';

      if (!res || res.length === 0) {
        container.innerHTML = `
                <div style="text-align:center; padding:40px; background:white; border-radius:12px; border:1px solid #f1f5f9;">
                    <i class="fa-regular fa-calendar" style="color:#94a3b8; font-size:32px; margin-bottom:12px;"></i>
                    <p style="color:#64748b; margin:0;">No classes scheduled yet.</p>
                </div>
              `;
        return;
      }

      res.forEach((session: any) => {
        const div = document.createElement('div');
        div.style.cssText = `
                background: white; border: 1px solid #e2e8f0; border-radius: 12px;
                padding: 16px 24px; display: flex; justify-content: space-between; align-items: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.02);
              `;

        const date = new Date(session.scheduledTime);
        const dateStr = date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
        const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

        // Status Badge
        let statusColor = '#3b82f6'; // Scheduled (Blue)
        let statusText = 'Scheduled';
        if (session.status === 'live') { statusColor = '#10b981'; statusText = 'Live'; } // Green
        else if (session.status === 'cancelled') { statusColor = '#ef4444'; statusText = 'Cancelled'; } // Red
        else if (session.status === 'completed') { statusColor = '#94a3b8'; statusText = 'Completed'; } // Gray

        div.innerHTML = `
                <div style="display:flex; gap:16px; align-items:center;">
                    <div style="
                        width: 50px; height: 50px; background: #f1f5f9; border-radius: 10px;
                        display: flex; flex-direction: column; align-items: center; justify-content: center;
                        color: #000a45;
                    ">
                        <span style="font-weight:700; font-size:18px; line-height:1;">${date.getDate()}</span>
                        <span style="font-size:10px; text-transform:uppercase;">${date.toLocaleString(undefined, { month: 'short' })}</span>
                    </div>
                    <div>
                        <h4 style="margin:0 0 4px; color:#0f172a; font-size:16px;">${session.className}</h4>
                        <div style="color:#64748b; font-size:13px; display:flex; gap:12px;">
                            <span><i class="fa-regular fa-clock"></i> ${timeStr} (${session.duration} min)</span>
                            <span style="color:${statusColor}; font-weight:600; text-transform:capitalize;">${statusText}</span>
                        </div>
                    </div>
                </div>
                <div>
                     ${session.status === 'scheduled' ? `
                        <button class="cancel-btn text-red-500 hover:bg-red-50 p-2 rounded" title="Cancel Class" style="cursor:pointer; border:none; background:transparent; font-size:14px; color:#ef4444;">
                            <i class="fa-solid fa-ban"></i> Cancel
                        </button>
                     ` : ''}
                </div>
              `;

        if (session.status === 'scheduled') {
          div.querySelector('.cancel-btn')?.addEventListener('click', async () => {
            if (!confirm('Cancel this class? Students will be notified.')) return;
            await this.http.put(`https://orbitbackend-0i66.onrender.com/api/schedule/cancel/${session._id}`, {}).toPromise();
            this.showToast('Class cancelled', 'info');
            this.loadScheduledClasses(classId, container);
          });
        }

        container.appendChild(div);
      });
    } catch (e) {
      container.innerHTML = `<div style="color:red; text-align:center;">Failed to load schedules</div>`;
    }
  }

  // ============================================================
  // ANNOUNCEMENTS POPUP LOADER (USED IN OPENCLASS)
  // ============================================================
  async loadAnnouncementsForPopup(classId: string) {
    try {
      const res: any = await this.http
        .get(`https://orbitbackend-0i66.onrender.com/api/announcements/class/${classId}`, {
          withCredentials: true,
        })
        .toPromise();

      const list = res.announcements || [];
      const box = document.getElementById('popupAnnouncements');
      if (!box) return;

      if (!list.length) {
        box.innerHTML = `
          <div style="text-align:center; padding:18px; color:#777; font-size:13px;">
            No announcements yet for this class.
          </div>
        `;
        return;
      }

      box.innerHTML = list
        .map((a: any, index: number) => {
          const date = a.createdAt
            ? new Date(a.createdAt).toLocaleString()
            : '';
          const isLatest = index === 0;
          const attachment = a.attachmentUrl || a.attachment || '';

          return `
            <div style="
              padding:${index > 0 ? '14px 0 0 0' : '4px 0 0 0'};
              ${index > 0 ? 'border-top:1px solid #E4E7EB;' : ''}
            ">
              <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
                <div>
                  <div style="font-size:14px; font-weight:600; color:#222;">
                    ${a.title || 'Untitled'}
                    ${isLatest
              ? '<span style="margin-left:6px;font-size:11px;color:#fff;background:#0045AA;padding:2px 6px;border-radius:999px;">NEW</span>'
              : ''
            }
                  </div>
                  <div style="margin-top:3px; font-size:13px; color:#555; line-height:1.45;">
                    ${a.message || ''}
                  </div>
                  ${attachment
              ? `
                    <div style="margin-top:6px;">
                      <a href="${attachment}" target="_blank" style="
                        font-size:12px; color:#0045AA; text-decoration:none;
                        display:inline-flex; align-items:center; gap:4px;
                      ">
                        <i class="fa-solid fa-paperclip"></i> View attachment
                      </a>
                    </div>
                  `
              : ''
            }
                </div>
                <div style="font-size:11px; color:#888; white-space:nowrap;">
                  ${date}
                </div>
              </div>
            </div>
          `;
        })
        .join('');
    } catch (err) {
      console.error('Popup announcement error:', err);
      const box = document.getElementById('popupAnnouncements');
      if (box) {
        box.innerHTML =
          '<p style="color:red; font-size:13px;">Failed to load announcements</p>';
      }
    }
  }

  async loadMaterialsForPopup(classId: string) {
    try {
      const res: any = await this.http
        .get(`https://orbitbackend-0i66.onrender.com/api/material/${classId}`, {
          withCredentials: true,
        })
        .toPromise();

      const list = res.materials || [];
      const box = document.getElementById('popupMaterials');
      if (!box) return;

      if (!list.length) {
        box.innerHTML = `
          <div style="text-align:center; padding:18px; color:#777; font-size:13px;">
            No materials uploaded for this class yet.
          </div>
        `;
        return;
      }

      box.innerHTML = list
        .map((m: any, index: number) => {
          const date = m.createdAt
            ? new Date(m.createdAt).toLocaleDateString()
            : '';
          const fileUrl = m.fileUrl ? 'https://orbitbackend-0i66.onrender.com' + m.fileUrl : m.externalLink;

          return `
            <div style="
              padding:${index > 0 ? '14px 0 0 0' : '4px 0 0 0'};
              ${index > 0 ? 'border-top:1px solid #E4E7EB;' : ''}
            ">
              <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
                <div>
                  <div style="font-size:14px; font-weight:600; color:#222;">
                    ${m.title || 'Untitled'}
                  </div>
                  <div style="margin-top:3px; font-size:13px; color:#555; line-height:1.45;">
                    Type: ${this.getFileType(m.type || '')} | Size: ${this.formatFileSize(m.size || 0)}
                  </div>
                  ${fileUrl ? `
                    <div style="margin-top:6px;">
                      <a href="${fileUrl}" target="_blank" style="
                        font-size:12px; color:#0045AA; text-decoration:none;
                        display:inline-flex; align-items:center; gap:4px;
                      ">
                        <i class="fa-solid fa-download"></i> Download/View
                      </a>
                    </div>
                  ` : ''}
                </div>
                <div style="font-size:11px; color:#888; white-space:nowrap;">
                  ${date}
                </div>
              </div>
            </div>
          `;
        })
        .join('');
    } catch (err) {
      console.error('Popup materials error:', err);
      const box = document.getElementById('popupMaterials');
      if (box) {
        box.innerHTML =
          '<p style="color:red; font-size:13px;">Failed to load materials</p>';
      }
    }
  }

  // ============================================================
  // ANNOUNCEMENTS (MAIN SECTION) METHODS
  // ============================================================
  async sendAnnouncement() {
    console.log('Form Status:', this.announcementForm.status);
    console.log('Form Errors:', this.announcementForm.errors);
    console.log('Form Values:', this.announcementForm.value);

    if (this.announcementForm.invalid) {
      this.announcementErrorMessage =
        'Please fill all required fields correctly.';
      this.announcementForm.markAllAsTouched();
      return;
    }

    this.sending = true;
    this.announcementErrorMessage = '';
    this.announcementSuccessMessage = '';

    const formData = this.announcementForm.value;

    try {
      const selectedClass = this.myClasses.find(
        (c) => c._id === formData.selectedClass
      );

      if (!selectedClass) {
        this.announcementErrorMessage = 'Selected class not found';
        this.sending = false;
        return;
      }

      const announcementData = {
        classId: formData.selectedClass,
        className: selectedClass.className,
        title: formData.title,
        message: formData.message,
        sendEmail: formData.sendEmail,
        facultyEmail: this.user?.email,
        facultyName: this.user?.fullName,
      };

      console.log('Sending announcement:', announcementData);

      const res: any = await this.http
        .post(
          'https://orbitbackend-0i66.onrender.com/api/announcements/send',
          announcementData,
          { withCredentials: true }
        )
        .toPromise();

      this.announcementSuccessMessage =
        res?.message || 'Announcement sent successfully!';

      const newAnnouncement: Announcement = {
        id: res.announcement?._id || Date.now().toString(),
        classId: formData.selectedClass,
        title: formData.title,
        className: selectedClass.className,
        message: formData.message,
        sendEmail: formData.sendEmail,
        createdAt: new Date(),
      };

      this.recentAnnouncements.unshift(newAnnouncement);
      this.announcementsCount = this.recentAnnouncements.length;
      this.clearAnnouncementForm();

      setTimeout(() => {
        this.announcementSuccessMessage = '';
      }, 5000);
    } catch (err: any) {
      console.error('Error sending announcement:', err);
      this.announcementErrorMessage =
        err?.error?.message || 'Failed to send announcement';
    } finally {
      this.sending = false;
    }
  }

  clearAnnouncementForm() {
    this.announcementForm.reset({
      selectedClass: '',
      title: '',
      message: '',
      sendEmail: false,
    });
  }

  async loadRecentAnnouncements() {
    if (!this.user?.email) return;

    try {
      const res: any = await this.http
        .post(
          'https://orbitbackend-0i66.onrender.com/api/announcements/recent',
          { facultyEmail: this.user.email },
          { withCredentials: true }
        )
        .toPromise();

      const all = res.announcements || [];
      this.announcementsCount = all.length;
      this.recentAnnouncements = all.slice(0, 3);
    } catch (err) {
      console.error('Error loading announcements:', err);
      this.recentAnnouncements = [];
      this.announcementsCount = 0;
    }
  }

  getClassName(classId: string): string {
    const classItem = this.myClasses.find((c) => c._id === classId);
    return classItem
      ? `${classItem.className} - ${classItem.subject}`
      : 'Unknown Class';
  }

  getClassIds(): string[] {
    return this.myClasses ? this.myClasses.map((c) => c._id) : [];
  }

  viewAnnouncement(announcement: Announcement) {
    this.showToast(`Title: ${announcement.title}\n\nMessage: ${announcement.message}`);
  }

  resendAnnouncement(announcement: Announcement) {
    this.announcementForm.patchValue({
      selectedClass: announcement.classId,
      title: announcement.title,
      message: announcement.message,
      sendEmail: announcement.sendEmail,
    });

    setTimeout(() => {
      document
        .querySelector('.create-announcement-card')
        ?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  // ============================================================
  // SECTION SWITCHING METHODS
  // ============================================================
  selectone(section: string) {
    this.selectedSection = section;

    if (section === 'anouncements') {
      this.loadRecentAnnouncements();
    }

    // When user opens Material tab, auto-load all materials
    if (section === 'material') {
      this.loadAllMaterials();
    }

    // When user opens Analytics tab, load analytics data
    if (section === 'analytics') {
      // Use setTimeout to ensure DOM is updated (canvas elements exist)
      setTimeout(() => {
        this.loadAllSessionsAnalytics();
        this.loadClassAnalytics(); // Load class-level analytics
      }, 0);
    }
  }

  // ============================================================
  // NOTIFICATION HELPERS
  // ============================================================
  async copyCodeModern(classCode: string) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(classCode);
      } else {
        const input = document.createElement('input');
        input.value = classCode;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      this.showToast('Class code copied to clipboard', 'success');
    } catch (err) {
      this.showToast('Failed to copy', 'error');
    }
  }

  showNotification(message: string, type: 'success' | 'error' = 'success') {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Orbit Classroom', { body: message });
    }
  }

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  // ============================================================
  // PROFILE EDIT (PHOTO + PASSWORD) METHODS
  // ============================================================
  setEditMode(mode: '' | 'photo' | 'password') {
    this.editMode = mode;
    this.successMsg = '';
    this.errorMsg = '';
  }

  async updatePhoto() {
    if (!this.selectedFile) {
      this.errorMsg = 'Please choose an image';
      return;
    }

    const form = new FormData();
    form.append('email', this.user?.email!);
    form.append('photo', this.selectedFile);

    try {
      const res: any = await this.http
        .post(
          'https://orbitbackend-0i66.onrender.com/api/faculty/updateprofilepic',
          form,
          { withCredentials: true }
        )
        .toPromise();

      if (res.success) {
        this.successMsg = 'Profile updated successfully!';
        this.photourl = res.photo;
      } else {
        this.errorMsg = res.message;
      }
    } catch {
      this.errorMsg = 'Server error';
    }
  }

  async updatePassword() {
    this.successMsg = '';
    this.errorMsg = '';

    if (!this.currentPass || !this.newPass || !this.confirmPass) {
      this.errorMsg = 'All fields required';
      return;
    }

    if (this.newPass !== this.confirmPass) {
      this.errorMsg = 'Passwords do not match';
      return;
    }

    if (this.currentPass === this.newPass) {
      this.errorMsg = 'New password cannot be same as old password';
      return;
    }

    try {
      const res: any = await this.http
        .post(
          'https://orbitbackend-0i66.onrender.com/api/updatepassword',
          {
            email: this.user?.email,
            currentPassword: this.currentPass,
            newPassword: this.newPass,
          },
          { withCredentials: true }
        )
        .toPromise();

      if (res.success) {
        this.successMsg = 'Password changed successfully';
        this.currentPass = this.newPass = this.confirmPass = '';
        this.editMode = '';
      } else {
        this.errorMsg = res.message;
      }
    } catch {
      this.errorMsg = 'Server error';
    }
  }

  clearForm(): void {
    this.clearAnnouncementForm();
  }

  /**
   * Clear file selection
   */
  clearSelection(): void {
    this.selectedFiles = [];
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // ============================================================
  // FILE SELECTION & DRAG & DROP
  // ============================================================

  onFileSelect(event: any): void {
    const files: FileList = event.target.files;
    this.handleFiles(files);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const uploadArea = event.currentTarget as HTMLElement;
    uploadArea.classList.add('drag-over');
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const uploadArea = event.currentTarget as HTMLElement;
    uploadArea.classList.remove('drag-over');
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const uploadArea = event.currentTarget as HTMLElement;
    uploadArea.classList.remove('drag-over');

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFiles(files);
    }
  }

  private handleFiles(files: FileList): void {
    if (files && files.length > 0) {
      this.selectedFiles = Array.from(files).map(file => ({
        file: file,
        progress: 0,
        name: file.name,
        size: file.size,
        type: this.getFileType(file.type)
      }));

      // Auto-fill material title if only one file
      if (this.selectedFiles.length === 1 && this.materialTitle) {
        const fileName = this.selectedFiles[0].name;
        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
        this.materialTitle.nativeElement.value = nameWithoutExt;
      }

      console.log('Selected files:', this.selectedFiles);
    }
  }

  // ============================================================
  // UPLOAD LOGIC
  // ============================================================

  uploadMaterials(): void {
    if (this.selectedFiles.length === 0) return;

    const classId = this.classSelect?.nativeElement?.value;
    const title = this.materialTitle?.nativeElement?.value?.trim();

    if (!classId) {
      this.showToast('Please select a class', 'error');
      return;
    }

    if (!title) {
      this.showToast('Enter material title', 'error');
      return;
    }

    this.uploading = true;
    this.uploadProgress = 0;

    // Upload each file
    this.selectedFiles.forEach((uploadFile: UploadFile, index) => {
      const formData = new FormData();
      formData.append('material', uploadFile.file);
      formData.append('classId', classId);
      formData.append('title', title);
      formData.append('uploadedBy', this.user?.email || '');

      this.http.post('https://orbitbackend-0i66.onrender.com/api/material/upload', formData, {
        observe: 'events',
        reportProgress: true,
        withCredentials: true,
      }).subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            const percent = Math.round((event.loaded / event.total) * 100);
            uploadFile.progress = percent;
            this.updateOverallUploadProgress();
          }

          if (event.type === HttpEventType.Response) {
            // Last file completed
            if (index === this.selectedFiles.length - 1) {
              this.handleUploadSuccess(classId);
            }
          }
        },
        error: (err) => {
          console.error('Upload error:', err);
          this.uploading = false;
          this.showToast(`Failed to upload ${uploadFile.name}: ${err.error?.message || 'Unknown error'}`, 'error');
        },
      });
    });
  }

  private handleUploadSuccess(classId: string): void {
    this.totalMaterialsCount += this.selectedFiles.length;
    this.loadAllMaterials();
    this.uploading = false;
    this.selectedFiles = [];
    this.uploadProgress = 0;

    // Reset form
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
    if (this.materialTitle?.nativeElement) {
      this.materialTitle.nativeElement.value = '';
    }

    this.showToast('Materials uploaded successfully 🧾!', 'success');
  }

  cancelUpload(): void {
    // In a real app, you might want to cancel the HTTP requests
    this.uploading = false;
    this.selectedFiles = [];
    this.uploadProgress = 0;
  }

  private updateOverallUploadProgress(): void {
    if (!this.selectedFiles.length) {
      this.uploadProgress = 0;
      return;
    }

    const totalProgress = this.selectedFiles.reduce(
      (sum: number, uploadFile: UploadFile) => sum + (uploadFile.progress || 0),
      0
    );
    this.uploadProgress = totalProgress / this.selectedFiles.length;
  }

  // ============================================================
  // MATERIALS MANAGEMENT
  // ============================================================

  loadMaterialsForClass(classId: string): void {
    this.currentMaterialClassId = classId;

    this.http.get(`https://orbitbackend-0i66.onrender.com/api/material/${classId}`, {
      withCredentials: true,
    }).subscribe({
      next: (res: any) => {
        const list = res.materials || [];
        this.materials = list.map((m: any) => ({
          ...m,
          size: m.size || 0,
          date: m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '',
          assignedClasses: [this.getClassName(m.classId) || 'Selected Class'],
        }));

        this.filteredMaterials = [...this.materials];
        this.materialsCount = this.materials.length;
      },
      error: (err) => {
        console.error('Error loading materials:', err);
        this.materials = [];
        this.filteredMaterials = [];
        this.materialsCount = 0;
      },
    });
  }

  onClassFilterChange(classId: string): void {
    if (!classId) {
      this.filteredMaterials = [...this.materials];
    } else {
      this.filteredMaterials = this.materials.filter(material =>
        material.assignedClasses.some(className =>
          className.includes(this.getClassName(classId) || '')
        )
      );
    }
  }

  onSearchMaterials(searchTerm: string): void {
    if (!searchTerm) {
      this.filteredMaterials = [...this.materials];
    } else {
      const term = searchTerm.toLowerCase();
      this.filteredMaterials = this.materials.filter(material =>
        material.title.toLowerCase().includes(term) ||
        material.type.toLowerCase().includes(term)
      );
    }
  }

  // ============================================================
  // MATERIAL ACTIONS
  // ============================================================

  downloadMaterial(material: Material): void {
    if (material.fileUrl) {
      window.open('https://orbitbackend-0i66.onrender.com' + material.fileUrl, '_blank');
    } else if (material.externalLink) {
      window.open(material.externalLink, '_blank');
    } else {
      this.showToast('No file or link found for this material');
    }
  }

  shareMaterial(material: Material): void {
    let shareUrl = '';

    if (material.externalLink) {
      shareUrl = material.externalLink;
    } else if (material.fileUrl) {
      shareUrl = 'https://orbitbackend-0i66.onrender.com' + material.fileUrl;
    } else {
      this.showToast('No sharable link available');
      return;
    }

    navigator.clipboard.writeText(shareUrl)
      .then(() => this.showToast('Shareable link copied to clipboard!'))
      .catch(() => this.showToast('Failed to copy link'));
  }

  deleteMaterial(material: Material): void {
    if (!confirm('Are you sure you want to delete this material?')) return;

    this.http.delete(`https://orbitbackend-0i66.onrender.com/api/material/delete/${material._id}`, {
      withCredentials: true
    }).subscribe({
      next: () => {
        this.totalMaterialsCount--;
        this.loadAllMaterials();
      },
      error: (err) => {
        console.error('Delete material error:', err);
        this.showToast('Failed to delete material');
      },
    });
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  getFileType(mimeType: string): string {
    const typeMap: { [key: string]: string } = {
      'application/pdf': 'PDF',
      'application/msword': 'DOC',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOC',
      'application/vnd.ms-powerpoint': 'PPT',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPT',
      'application/vnd.ms-excel': 'XLS',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLS',
      'image/jpeg': 'Image',
      'image/png': 'Image',
      'image/gif': 'Image',
      'application/zip': 'Archive',
      'application/x-rar-compressed': 'Archive',
      'text/plain': 'Text',
    };

    return typeMap[mimeType] || 'File';
  }

  getFileIcon(fileType: string): string {
    const iconMap: { [key: string]: string } = {
      'PDF': 'fa-solid fa-file-pdf text-red-500',
      'DOC': 'fa-solid fa-file-word text-blue-500',
      'PPT': 'fa-solid fa-file-powerpoint text-orange-500',
      'XLS': 'fa-solid fa-file-excel text-green-500',
      'Image': 'fa-solid fa-file-image text-purple-500',
      'Archive': 'fa-solid fa-file-archive text-yellow-500',
      'Text': 'fa-solid fa-file-lines text-gray-500',
      'File': 'fa-solid fa-file text-gray-400',
    };

    return iconMap[fileType] || 'fa-solid fa-file text-gray-400';
  }

  // ============================================================
  // ANALYTICS METHODS
  // ============================================================

  analyticsChartInstances: any[] = [];

  /**
   * Load all session analytics data
   */
  async loadAllSessionsAnalytics() {
    if (!this.user?.email) return;

    try {
      const res: any = await this.http
        .get(`https://orbitbackend-0i66.onrender.com/api/attendance/faculty-analytics/${this.user.email}`, { withCredentials: true })
        .toPromise();

      if (res && res.success && res.analytics) {
        const data = res.analytics;

        // Update Overview Stats
        this.totalSessions = data.totalSessions || 0;
        this.totalHours = data.totalHours || 0;
        this.avgAttendance = data.averageAttendance || 0;
        this.studentsCount = data.totalStudents || 0; // approximate total engagements

        // Process Timeline Data
        this.allSessions = (data.sessions || []).map((item: any) => ({
          sessionId: item._id,
          classCode: item.classCode,
          className: item.className,
          startTime: new Date(item.startTime),
          duration: item.duration || 60,
          totalStudents: item.totalStudents || 0,
          studentsPresent: item.studentsPresent || 0,
          attendanceRate: item.attendanceRate || 0,
          status: 'Completed'
        })).sort((a: any, b: any) => b.startTime.getTime() - a.startTime.getTime());

        // Trigger updates
        this.filterSessions();
      }
    } catch (e) {
      console.error('Error loading analytics', e);
      // Fallback to mock if API fails or returns empty
      if (this.allSessions.length === 0) {
        this.allSessions = this.generateMockSessionData();
        this.filterSessions();
      }
    }
  }

  /**
   * Initialize Charts with Data
   */
  initCharts(data: any) {
    console.log('📊 Initializing Charts with data:', data);

    if (typeof Chart === 'undefined') {
      console.error('❌ Chart.js library not loaded!');
      return;
    }

    // Destroy existing charts
    this.analyticsChartInstances.forEach(chart => chart.destroy());
    this.analyticsChartInstances = [];

    // 1. Donut Chart - Attendance Distribution
    const donutCanvas = document.getElementById('attendanceDonutChart') as HTMLCanvasElement;
    if (donutCanvas) {
      const donutCtx = donutCanvas.getContext('2d');
      if (donutCtx) {
        const donutChart = new Chart(donutCtx, {
          type: 'doughnut',
          data: {
            labels: ['Low (<50%)', 'Medium (50-80%)', 'High (>80%)'],
            datasets: [{
              data: data.attendanceDistribution,
              backgroundColor: [
                '#ef4444', // Red 
                '#f59e0b', // Amber 
                '#10b981'  // Emerald 
              ],
              borderWidth: 0,
              hoverOffset: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  usePointStyle: true,
                  padding: 20,
                  font: { family: "'Inter', sans-serif" }
                }
              }
            },
            cutout: '70%'
          }
        });
        this.analyticsChartInstances.push(donutChart);
      }
    }

    // 2. Area Chart (Mountain Graph) - Attendance Trends
    const areaCanvas = document.getElementById('attendanceAreaChart') as HTMLCanvasElement;
    if (areaCanvas) {
      const areaCtx = areaCanvas.getContext('2d');
      if (areaCtx) {
        // Prepare data for Chart.js
        const labels = data.timeline.map((t: any) => new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        const values = data.timeline.map((t: any) => t.attendance);

        const areaChart = new Chart(areaCtx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Attendance %',
              data: values,
              fill: true, // Area chart
              backgroundColor: 'rgba(59, 130, 246, 0.1)', // Light Blue Fill
              borderColor: '#3b82f6', // Blue Line
              borderWidth: 2,
              tension: 0.4, // Smooth curve (Mountain shape)
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#3b82f6',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#1e293b',
                padding: 12,
                titleFont: { family: "'Inter', sans-serif" },
                bodyFont: { family: "'Inter', sans-serif" },
                callbacks: {
                  label: (context: any) => `Attendance: ${context.raw}%`
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
                grid: {
                  color: '#f1f5f9',
                  drawBorder: false
                },
                ticks: {
                  font: { family: "'Inter', sans-serif" },
                  color: '#64748b'
                }
              },
              x: {
                grid: { display: false },
                ticks: {
                  font: { family: "'Inter', sans-serif" },
                  color: '#64748b',
                  maxRotation: 0,
                  autoSkip: true,
                  maxTicksLimit: 6
                }
              }
            }
          }
        });
        this.analyticsChartInstances.push(areaChart);
      }
    }

    // 3. Bar Chart - Student Participation (Total vs Present)
    const barCanvas = document.getElementById('studentBarChart') as HTMLCanvasElement;
    if (barCanvas) {
      const barCtx = barCanvas.getContext('2d');
      if (barCtx) {
        const labels = data.timeline.map((t: any) => new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        const totalData = data.timeline.map((t: any) => t.totalStudents || 0); // Fallback to 0
        const presentData = data.timeline.map((t: any) => t.presentStudents || 0); // Fallback to 0

        const barChart = new Chart(barCtx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Total Students',
                data: totalData,
                backgroundColor: '#e2e8f0', // Slate 200
                borderRadius: 4,
                barPercentage: 0.6,
                categoryPercentage: 0.8
              },
              {
                label: 'Present',
                data: presentData,
                backgroundColor: '#3b82f6', // Blue 500
                borderRadius: 4,
                barPercentage: 0.6,
                categoryPercentage: 0.8
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                align: 'end',
                labels: { usePointStyle: true, boxWidth: 8, font: { family: "'Inter', sans-serif" } }
              },
              tooltip: {
                backgroundColor: '#1e293b',
                padding: 12,
                titleFont: { family: "'Inter', sans-serif" },
                bodyFont: { family: "'Inter', sans-serif" },
                mode: 'index',
                intersect: false,
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: '#f1f5f9', drawBorder: false },
                ticks: { font: { family: "'Inter', sans-serif" }, color: '#64748b' },
                title: { display: true, text: 'Number of Students' }
              },
              x: {
                grid: { display: false },
                ticks: { font: { family: "'Inter', sans-serif" }, color: '#64748b' }
              }
            }
          }
        });
        this.analyticsChartInstances.push(barChart);
      }
    }
  }

  /**
   * Fallback for Mock Charts if API fails
   */
  initMockCharts() {
    // Generate mock timeline with student counts
    const mockTimeline = this.allSessions.length > 0
      ? this.allSessions.map(s => ({
        date: s.startTime,
        attendance: s.attendanceRate,
        totalStudents: s.totalStudents,
        presentStudents: s.studentsPresent
      })).reverse()
      : [
        { date: '2023-01-01', attendance: 65, totalStudents: 40, presentStudents: 26 },
        { date: '2023-01-05', attendance: 75, totalStudents: 42, presentStudents: 31 },
        { date: '2023-01-10', attendance: 85, totalStudents: 40, presentStudents: 34 },
        { date: '2023-01-15', attendance: 90, totalStudents: 45, presentStudents: 41 },
        { date: '2023-01-20', attendance: 80, totalStudents: 40, presentStudents: 32 }
      ];

    const mockData = {
      attendanceDistribution: [5, 12, 25],
      timeline: mockTimeline
    };
    this.initCharts(mockData);
  }

  /**
   * Calculate analytics statistics
   */
  calculateAnalytics() {
    if (!this.filteredSessions || this.filteredSessions.length === 0) {
      if (this.allSessions.length === 0) {
        this.totalSessions = 0;
        this.totalHours = 0;
        this.avgAttendance = 0;
        this.studentsCount = 0;
      }
      return;
    }

    // Re-calculate based on filtered sessions
    this.totalSessions = this.filteredSessions.length;

    // Calculate total hours
    const totalMinutes = this.filteredSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    this.totalHours = Math.round(totalMinutes / 60);

    // Calculate average attendance
    const totalAttendance = this.filteredSessions.reduce((sum, s) => sum + (s.attendanceRate || 0), 0);
    this.avgAttendance = Math.round(totalAttendance / this.totalSessions);

    // Calculate total students (sum of present students for simplicity in filtered view)
    this.studentsCount = this.filteredSessions.reduce((sum, s) => sum + (s.totalStudents || 0), 0);
  }

  /**
   * Filter sessions by selected class
   */
  filterSessions() {
    // 1. Filter List
    if (!this.selectedAnalyticsClass || this.selectedAnalyticsClass === '') {
      this.filteredSessions = [...this.allSessions];
    } else {
      this.filteredSessions = this.allSessions.filter(
        s => s.classCode === this.selectedAnalyticsClass
      );
    }

    // 2. Update Stats & Charts
    this.calculateAnalytics();
    this.updateCharts();
  }

  updateCharts() {
    // Calculate Attendance Distribution
    const attendanceDistribution = [0, 0, 0]; // Low, Med, High
    this.filteredSessions.forEach(s => {
      if (s.attendanceRate < 50) attendanceDistribution[0]++;
      else if (s.attendanceRate < 80) attendanceDistribution[1]++;
      else attendanceDistribution[2]++;
    });

    // Prepare Timeline Data (Oldest First)
    const timeline = [...this.filteredSessions]
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .map(s => ({
        date: s.startTime,
        attendance: s.attendanceRate,
        totalStudents: s.totalStudents || 0,
        presentStudents: s.studentsPresent || 0,
        className: s.className
      }));

    // Initialize Charts
    this.initCharts({
      attendanceDistribution,
      timeline
    });
  }

  /**
   * Generate mock session data for demonstration
   * TODO: Replace with actual API call to backend
   */
  generateMockSessionData(): any[] {
    const mockSessions: any[] = [];
    const now = new Date();

    // Generate mock sessions for each class
    this.myClasses.forEach((cls, classIndex) => {
      // Generate 3-5 sessions per class
      const sessionCount = 3 + Math.floor(Math.random() * 3);

      for (let i = 0; i < sessionCount; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const sessionDate = new Date(now);
        sessionDate.setDate(sessionDate.getDate() - daysAgo);

        const duration = 30 + Math.floor(Math.random() * 90); // 30-120 minutes
        const totalStudents = cls.studentsCount || 30 + Math.floor(Math.random() * 20); // Mock total if 0
        const studentsPresent = Math.floor(totalStudents * (0.6 + Math.random() * 0.4)); // 60-100% attendance
        const attendanceRate = totalStudents > 0 ? Math.round((studentsPresent / totalStudents) * 100) : 0;

        mockSessions.push({
          sessionId: `session-${classIndex}-${i}`,
          classCode: cls.classCode,
          className: cls.className,
          startTime: sessionDate,
          duration: duration,
          totalStudents: totalStudents,
          studentsPresent: studentsPresent,
          attendanceRate: attendanceRate,
          status: 'completed'
        });
      }
    });

    // Sort by date (newest first)
    return mockSessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  /**
   * Watch for changes in selected analytics class filter
   */
  ngOnChanges() {
    this.filterSessions();
  }


  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Session Details Modal
  selectedSessionDetails: any = null;

  async viewSessionDetails(session: any) {
    if (!session.sessionId) return;

    try {
      const res: any = await this.http.get(`https://orbitbackend-0i66.onrender.com/api/attendance/analytics/${session.sessionId}`, { withCredentials: true }).toPromise();

      if (res && res.success && res.analytics) {
        this.selectedSessionDetails = res.analytics;
        // Filter out faculty and sort by name
        if (this.selectedSessionDetails.participants) {
          this.selectedSessionDetails.participants = this.selectedSessionDetails.participants
            .filter((p: any) => p.role !== 'faculty') // Exclude faculty
            .sort((a: any, b: any) => {
              return (a.name || a.participantName || '').localeCompare(b.name || b.participantName || '');
            });
        }
      } else {
        console.error("Invalid analytics response");
      }

    } catch (e) {
      console.error('Error fetching session details', e);
    }
  }

  closeSessionDetails() {
    this.selectedSessionDetails = null;
  }

  formatDuration(seconds: number): string {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  // ============================================================
  // CLASS-LEVEL ANALYTICS METHODS
  // ============================================================
  async loadClassAnalytics() {
    if (!this.myClasses || this.myClasses.length === 0) return;

    this.loadingClassAnalytics = true;
    this.classAnalytics = [];

    try {
      for (const cls of this.myClasses) {
        const res: any = await this.http.get(
          `https://orbitbackend-0i66.onrender.com/api/attendance/class-analytics/${cls._id}`,
          { withCredentials: true }
        ).toPromise();

        if (res && res.success) {
          this.classAnalytics.push({
            classId: cls._id,
            ...res.classInfo,
            studentAttendance: res.studentAttendance
          });
        }
      }
    } catch (e) {
      console.error('Error loading class analytics', e);
    } finally {
      this.loadingClassAnalytics = false;
    }
  }

  toggleClassDetails(classId: string) {
    this.expandedClassId = this.expandedClassId === classId ? null : classId;
  }

  viewStudentSessionHistory(student: any) {
    this.selectedStudentDetails = student;
  }

  closeStudentDetails() {
    this.selectedStudentDetails = null;
  }

}
