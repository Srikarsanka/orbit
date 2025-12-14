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
} from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TruncatePipe } from '../../../truncatepipe';

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
    this.http
      .get('http://localhost:5000/auth/redirect', { withCredentials: true })
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
          'http://localhost:5000/api/classes/myclass',
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
        const res: any = await this.http.get(`http://localhost:5000/api/material/${cls._id}`, { withCredentials: true }).toPromise();
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
        const res: any = await this.http.get(`http://localhost:5000/api/material/${cls._id}`, { withCredentials: true }).toPromise();
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
        .post('http://localhost:5000/api/class/create', payload, {
          withCredentials: true,
        })
        .toPromise();

      this.successMessage = res?.message || 'Class created successfully  🎉';
      this.showToast(this.successMessage,'success');
      this.createdClass = res?.class || null;
      this.form.reset();
      await this.loadclass();
    } catch (err: any) {
      console.error('Create class error:', err);
      this.errorMessage = err?.error?.message || 'Failed to create class';
      this.showToast(this.errorMessage,'error');
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
  async openclass(classCode: string) {
    try {
      const res: any = await this.http
        .post(
          `http://localhost:5000/api/openclass/${classCode}`,
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
        background:rgba(0,0,0,0.55);
        backdrop-filter:blur(6px);
        display:flex; justify-content:center; align-items:center;
        z-index:99999; animation:fadeIn .28s ease;
        font-family:'Inter','Segoe UI',sans-serif;
      `;

      // Add animation styles
      const animStyle = document.createElement('style');
      animStyle.innerHTML = `
        @keyframes fadeIn { from{opacity:0;} to{opacity:1;} }
        @keyframes scaleUp { from{transform:scale(.9); opacity:0;} to{transform:scale(1); opacity:1;} }
        @keyframes slideFade { from{opacity:0; transform:translateY(8px);} to{opacity:1; transform:translateY(0);} }
        .tab-content-transition { animation: slideFade .22s ease; }
        .btn-ripple {
          position: relative;
          overflow: hidden;
        }
        .btn-ripple span.ripple-circle {
          position:absolute;
          border-radius:50%;
          transform:scale(0);
          animation:ripple .4s linear;
          background:rgba(255,255,255,0.6);
        }
        @keyframes ripple {
          to {transform:scale(4); opacity:0;}
        }
      `;
      document.head.appendChild(animStyle);

      // Create card container
      const card = document.createElement('div');
      card.style.cssText = `
        width:780px; max-height:86vh;
        background:rgba(255,255,255,0.96);
        border-radius:20px;
        box-shadow:0 20px 55px rgba(0,0,0,0.35);
        border:1px solid rgba(255,255,255,0.8);
        display:flex; flex-direction:column;
        overflow:hidden; animation:scaleUp .25s ease;
      `;

      // Header section
      const header = document.createElement('div');
      header.style.cssText = `
        padding:22px 28px;
        background:linear-gradient(135deg,#0045AA,#007BFF);
        color:white;
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
      `;

      // Header left content
      const headerLeft = document.createElement('div');
      headerLeft.innerHTML = `
        <div style="font-size:12px;opacity:.85;letter-spacing:.08em;text-transform:uppercase;">
          Class Overview
        </div>
        <h2 style="margin:4px 0 0;font-size:22px;font-weight:700;">${room.className}</h2>
        <p style="margin:4px 0 0;font-size:14px;opacity:.92;">${room.subject}</p>
        <p style="margin:2px 0 0;font-size:13px;opacity:.85;">Faculty: ${room.facultyName}</p>
        <div style="margin-top:10px;display:flex;gap:16px;font-size:12px;">
          <div>
            <div style="opacity:.75;">Students</div>
            <div style="font-size:16px;font-weight:600;">${students.length}</div>
          </div>
          <div>
            <div style="opacity:.75;">Class Code</div>
            <div style="font-size:16px;font-weight:600;">${room.classCode}</div>
          </div>
        </div>
      `;

      // Header right content with action buttons
      const headerRight = document.createElement('div');
      headerRight.style.cssText = `
        display:flex; flex-direction:column; gap:8px; align-items:flex-end;
      `;

      // Helper function to create icon buttons
      const makeIconButton = (
        tooltip: string,
        iconClass: string,
        bg: string,
        color: string
      ) => {
        const btn = document.createElement('button');
        btn.classList.add('btn-ripple');
        btn.title = tooltip;
        btn.style.cssText = `
          border:none; cursor:pointer;
          width:34px; height:34px;
          border-radius:10px;
          display:flex; align-items:center; justify-content:center;
          background:${bg}; color:${color};
          font-size:15px;
          box-shadow:0 4px 10px rgba(0,0,0,0.18);
          transition:transform .16s ease, box-shadow .16s ease;
        `;
        btn.innerHTML = `<i class="${iconClass}"></i>`;

        btn.onmouseover = () => {
          btn.style.transform = 'translateY(-1px) scale(1.03)';
          btn.style.boxShadow = '0 6px 14px rgba(0,0,0,0.22)';
        };
        btn.onmouseout = () => {
          btn.style.transform = 'translateY(0) scale(1)';
          btn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.18)';
        };

        // Ripple effect
        btn.addEventListener('click', (e: MouseEvent) => {
          const rect = btn.getBoundingClientRect();
          const circle = document.createElement('span');
          const diameter = Math.max(rect.width, rect.height);
          const radius = diameter / 2;
          circle.style.width = circle.style.height = `${diameter}px`;
          circle.style.left = `${e.clientX - rect.left - radius}px`;
          circle.style.top = `${e.clientY - rect.top - radius}px`;
          circle.classList.add('ripple-circle');
          const old = btn.getElementsByClassName('ripple-circle')[0];
          if (old) old.remove();
          btn.appendChild(circle);
        });

        return btn;
      };

      // Create action buttons
      const changeBtn = makeIconButton(
        'Change class',
        'fa-solid fa-arrow-right-arrow-left',
        'rgba(255,255,255,0.9)',
        '#0045AA'
      );
      changeBtn.onclick = () => overlay.remove();

      const copyCodeBtn = makeIconButton(
        'Copy class code',
        'fa-solid fa-copy',
        'rgba(255,255,255,0.9)',
        '#0045AA'
      );
      copyCodeBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(room.classCode);
          this.showToast('Class code copied to clipboard','success');
        } catch {
          this.showToast(`Class code: ${room.classCode}`,'success');
        }
      };

      const shareBtn = makeIconButton(
        'Copy join link',
        'fa-solid fa-link',
        'rgba(255,255,255,0.9)',
        '#0045AA'
      );
      shareBtn.onclick = async () => {
        const joinUrl = `${window.location.origin}/join/${room.classCode}`;
        try {
          await navigator.clipboard.writeText(joinUrl);
          this.showToast('Join link copied to clipboard','success');
        } catch {
          this.showToast(`Join link: ${joinUrl}`,'error');
        }
      };

      const qrBtn = makeIconButton(
        'Show QR to join',
        'fa-solid fa-qrcode',
        'rgba(255,255,255,0.9)',
        '#0045AA'
      );
      qrBtn.onclick = () => {
        const joinUrl = `${window.location.origin}/join/${room.classCode}`;
        const qrOverlay = document.createElement('div');
        qrOverlay.style.cssText = `
          position:fixed; inset:0; display:flex; justify-content:center; align-items:center;
          background:rgba(0,0,0,0.6); z-index:100000;
        `;
        const qrCard = document.createElement('div');
        qrCard.style.cssText = `
          background:white; padding:20px 24px; border-radius:14px;
          text-align:center; box-shadow:0 12px 32px rgba(0,0,0,0.3);
        `;
        qrCard.innerHTML = `
          <h3 style="margin:0 0 10px;font-size:18px;">Join Class</h3>
          <p style="margin:0 0 12px;font-size:13px;color:#555;">Scan this QR to join:</p>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(
            joinUrl
          )}" alt="QR Code">
          <p style="margin:12px 0 0;font-size:12px;color:#777;">${joinUrl}</p>
        `;
        const closeQr = document.createElement('button');
        closeQr.textContent = 'Close';
        closeQr.style.cssText = `
          margin-top:12px; padding:6px 14px; border-radius:6px;
          border:none; background:#0045AA; color:white; cursor:pointer;
          font-size:13px;
        `;
        closeQr.onclick = () => qrOverlay.remove();
        qrCard.appendChild(closeQr);
        qrOverlay.appendChild(qrCard);
        qrOverlay.onclick = (e) => e.target === qrOverlay && qrOverlay.remove();
        document.body.appendChild(qrOverlay);
      };

      const deleteBtn = makeIconButton(
        'Delete class',
        'fa-solid fa-trash',
        '#E63946',
        '#fff'
      );
     deleteBtn.onclick = () => {
  if (!confirm('Are you sure you want to delete this class?')) return;

  this.http.delete(`http://localhost:5000/api/deleteclass/${room._id}`, {
    withCredentials: true,
  }).subscribe({
    next: () => {
      this.showToast('Class deleted','success');
      overlay.remove();
      this.loadclass()
    },
    error: (err) => {
      console.error(err);
      this.showToast('Failed to delete class','success');
    }
  });
};


      const topActions = document.createElement('div');
      topActions.style.cssText = `display:flex; gap:8px;`;
      topActions.appendChild(changeBtn);
      topActions.appendChild(copyCodeBtn);
      topActions.appendChild(shareBtn);
      topActions.appendChild(qrBtn);
      topActions.appendChild(deleteBtn);

      const editBtn = document.createElement('button');
      editBtn.classList.add('btn-ripple');
      editBtn.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Edit Class`;
      editBtn.style.cssText = `
        margin-top:6px;
        padding:6px 12px; border-radius:999px;
        border:none; cursor:pointer;
        background:rgba(255,255,255,0.16);
        color:white; font-size:12px;
        display:flex; align-items:center; gap:6px;
      `;
      editBtn.onclick = () => {
        const name = prompt('Update class name:', room.className);
        const desc = prompt('Update subject name:', room.description);
        if (!name || !desc) return;

        this.http
          .put(
            `http://localhost:5000/api/change/updateclassname/${room._id}`,
            { className: name, subject: desc },
            { withCredentials: true }
          )
          .toPromise()
          .then(() => {
            this.showToast('Class updated','success');
            headerLeft.querySelector('h2')!.textContent = name;
            const ps = headerLeft.getElementsByTagName('p');
            if (ps.length > 0) {
              ps[0].textContent = desc;
            }
          })
          .catch((e) => this.showToast(JSON.stringify(e),'error'));
      };

      headerRight.appendChild(topActions);
      headerRight.appendChild(editBtn);

      header.appendChild(headerLeft);
      header.appendChild(headerRight);

      // Tabs section
      const tabsBar = document.createElement('div');
      tabsBar.style.cssText = `
        display:flex; align-items:center;
        gap:24px; padding:14px 24px;
        background:#F5F7FB;
        border-bottom:1px solid #E4E7EB;
        font-size:14px; font-weight:600; color:#555;
      `;

      const tabStudents = document.createElement('div');
      const tabAnnouncements = document.createElement('div');
      const tabMaterials = document.createElement('div');
      tabStudents.textContent = 'Students';
      tabAnnouncements.textContent = 'Announcements';
      tabMaterials.textContent = 'Materials';

      const setTabActive = (tab: HTMLElement, active: boolean) => {
        tab.style.cursor = 'pointer';
        tab.style.paddingBottom = '5px';
        tab.style.borderBottom = active
          ? '3px solid #0045AA'
          : '3px solid transparent';
        tab.style.color = active ? '#0045AA' : '#555';
      };

      setTabActive(tabStudents, true);
      setTabActive(tabAnnouncements, false);
      setTabActive(tabMaterials, false);

      tabsBar.appendChild(tabStudents);
      tabsBar.appendChild(tabAnnouncements);
      tabsBar.appendChild(tabMaterials);

      // Content area
      const content = document.createElement('div');
      content.style.cssText = `
        padding:18px 24px 20px;
        background:#F9FAFC;
        flex:1; overflow:auto;
      `;

      // Students tab rendering
      const renderStudentsTab = () => {
        content.innerHTML = '';
        content.classList.add('tab-content-transition');

        const topRow = document.createElement('div');
        topRow.style.cssText = `
          display:flex; justify-content:space-between;
          align-items:center; margin-bottom:14px; gap:10px; flex-wrap:wrap;
        `;

        const counts = document.createElement('div');
        counts.innerHTML = `
          <div style="font-size:13px;color:#555;">
            Total students: <strong>${students.length}</strong>
          </div>
        `;

        const controls = document.createElement('div');
        controls.style.cssText = `display:flex; gap:10px; flex-wrap:wrap;`;

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search by name or email...';
        searchInput.style.cssText = `
          padding:8px 10px; border-radius:8px;
          border:1px solid #D0D7E2; font-size:13px;
          min-width:180px;
        `;

        const sortSelect = document.createElement('select');
        sortSelect.style.cssText = `
          padding:8px 10px; border-radius:8px;
          border:1px solid #D0D7E2; font-size:13px;
        `;
        sortSelect.innerHTML = `
          <option value="nameAsc">Name A–Z</option>
          <option value="nameDesc">Name Z–A</option>
          <option value="emailAsc">Email A–Z</option>
          <option value="emailDesc">Email Z–A</option>
        `;

        controls.appendChild(searchInput);
        controls.appendChild(sortSelect);
        topRow.appendChild(counts);
        topRow.appendChild(controls);
        content.appendChild(topRow);

        const listWrap = document.createElement('div');
        listWrap.style.cssText = `
          background:white; border-radius:12px;
          border:1px solid #E4E7EB; padding:6px 0;
        `;
        content.appendChild(listWrap);

        const renderList = () => {
          listWrap.innerHTML = '';
          const term = searchInput.value.toLowerCase().trim();
          let filtered = [...students];

          if (term) {
            filtered = filtered.filter(
              (s: any) =>
                (s.studentName || '').toLowerCase().includes(term) ||
                (s.studentEmail || '').toLowerCase().includes(term)
            );
          }

          const sortBy = sortSelect.value;
          filtered.sort((a: any, b: any) => {
            const nameA = (a.studentName || '').toLowerCase();
            const nameB = (b.studentName || '').toLowerCase();
            const emailA = (a.studentEmail || '').toLowerCase();
            const emailB = (b.studentEmail || '').toLowerCase();

            switch (sortBy) {
              case 'nameAsc':
                return nameA.localeCompare(nameB);
              case 'nameDesc':
                return nameB.localeCompare(nameA);
              case 'emailAsc':
                return emailA.localeCompare(emailB);
              case 'emailDesc':
                return emailB.localeCompare(emailA);
              default:
                return 0;
            }
          });

          if (!filtered.length) {
            listWrap.innerHTML = `
              <div style="padding:18px; text-align:center; color:#777; font-size:13px;">
                No students match your search.
              </div>
            `;
            return;
          }

          filtered.forEach((s: any) => {
            const row = document.createElement('div');
            row.style.cssText = `
              display:flex; align-items:center; gap:12px;
              padding:10px 16px; border-bottom:1px solid #F1F1F5;
            `;

            const avatar = document.createElement('div');
            avatar.style.cssText = `
              width:36px; height:36px; border-radius:50%;
              background:#0045AA; color:white;
              display:flex; align-items:center; justify-content:center;
              font-size:14px; font-weight:600;
            `;
            const initials = (s.studentName || '?')
              .split(' ')
              .map((w: string) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();
            avatar.textContent = initials || 'S';

            const info = document.createElement('div');
            info.innerHTML = `
              <div style="font-size:14px;font-weight:600;color:#222;">${s.studentName}</div>
              <div style="font-size:12px;color:#666;">${s.studentEmail}</div>
            `;

            row.appendChild(avatar);
            row.appendChild(info);
            listWrap.appendChild(row);
          });
        };

        searchInput.oninput = renderList;
        sortSelect.onchange = renderList;
        renderList();
      };

      // Announcements tab rendering
      const renderAnnouncementsTab = () => {
        content.innerHTML = '';
        content.classList.add('tab-content-transition');

        const createBox = document.createElement('div');
        createBox.style.cssText = `
          background:white; border-radius:12px;
          border:1px solid #E4E7EB;
          padding:12px 14px 14px;
          margin-bottom:12px;
        `;
        createBox.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center; margin-bottom:8px;">
            <div style="font-size:14px;font-weight:600;color:#222;">
              <i class="fa-solid fa-bullhorn"></i> Create Announcement
            </div>
            <div style="font-size:11px;color:#888;">Visible to all students of this class</div>
          </div>
        `;

        const titleInput = document.createElement('input');
        titleInput.placeholder = 'Title';
        titleInput.style.cssText = `
          width:100%; margin-bottom:6px;
          padding:8px 10px; border-radius:8px;
          border:1px solid #D0D7E2; font-size:13px;
        `;

        const msgInput = document.createElement('textarea');
        msgInput.placeholder = 'Write announcement message...';
        msgInput.rows = 3;
        msgInput.style.cssText = `
          width:100%; margin-bottom:6px;
          padding:8px 10px; border-radius:8px;
          border:1px solid #D0D7E2; font-size:13px;
          resize:vertical;
        `;

        const attachInput = document.createElement('input');
        attachInput.placeholder =
          'Attachment URL (optional – PDF, image, etc.)';
        attachInput.style.cssText = `
          width:100%; margin-bottom:8px;
          padding:6px 10px; border-radius:8px;
          border:1px solid #D0D7E2; font-size:12px;
        `;

        const createBtn = document.createElement('button');
        createBtn.textContent = 'Post Announcement';
        createBtn.classList.add('btn-ripple');
        createBtn.style.cssText = `
          padding:8px 14px; border-radius:8px;
          border:none; background:#0045AA; color:white;
          font-size:13px; font-weight:600; cursor:pointer;
        `;

        createBtn.onclick = async () => {
          const title = titleInput.value.trim();
          const message = msgInput.value.trim();
          const attachmentUrl = attachInput.value.trim();

          if (!title || !message) {
            this.showToast('Title and message are required','error');
            return;
          }

          try {
            await this.http
              .post(
                'http://localhost:5000/api/announcements',
                {
                  classId: room._id,
                  title,
                  message,
                  attachmentUrl: attachmentUrl || undefined,
                },
                { withCredentials: true }
              )
              .toPromise();

            titleInput.value = '';
            msgInput.value = '';
            attachInput.value = '';
            this.showToast('Announcement posted Successfully 📢','success');
            this.loadAnnouncementsForPopup(room._id);
          } catch (err) {
            console.error('Create announcement error:', err);
            this.showToast('Failed to create announcement','error');
          }
        };

        createBox.appendChild(titleInput);
        createBox.appendChild(msgInput);
        createBox.appendChild(attachInput);
        createBox.appendChild(createBtn);

        content.appendChild(createBox);

        const listBox = document.createElement('div');
        listBox.id = 'popupAnnouncements';
        listBox.style.cssText = `
          background:white; border-radius:12px;
          border:1px solid #E4E7EB;
          padding:12px 14px;
          font-size:14px;
        `;
        listBox.innerHTML = 'Loading announcements...';
        content.appendChild(listBox);

        this.loadAnnouncementsForPopup(room._id);
      };

      // Materials tab rendering
      const renderMaterialsTab = () => {
        content.innerHTML = '';
        content.classList.add('tab-content-transition');

        const listBox = document.createElement('div');
        listBox.id = 'popupMaterials';
        listBox.style.cssText = `
          background:white; border-radius:12px;
          border:1px solid #E4E7EB;
          padding:12px 14px;
          font-size:14px;
        `;
        listBox.innerHTML = 'Loading materials...';
        content.appendChild(listBox);

        this.loadMaterialsForPopup(room._id);
      };

      card.appendChild(header);
      card.appendChild(tabsBar);
      card.appendChild(content);

      // Footer section
      const footer = document.createElement('div');
      footer.style.cssText = `
        padding:14px 24px;
        border-top:1px solid #E4E7EB;
        background:#F5F7FB;
        display:flex; justify-content:flex-end; gap:10px;
      `;

      const makeFooterBtn = (html: string, bg: string) => {
        const btn = document.createElement('button');
        btn.classList.add('btn-ripple');
        btn.innerHTML = html;
        btn.style.cssText = `
          padding:10px 18px; border-radius:10px;
          border:none; color:white; background:${bg};
          cursor:pointer; font-size:14px; font-weight:600;
          display:flex; align-items:center; gap:8px;
          box-shadow:0 4px 12px rgba(0,0,0,0.18);
          transition:transform .16s ease, box-shadow .16s ease;
        `;
        btn.onmouseover = () => {
          btn.style.transform = 'translateY(-1px) scale(1.03)';
          btn.style.boxShadow = '0 6px 15px rgba(0,0,0,0.22)';
        };
        btn.onmouseout = () => {
          btn.style.transform = 'translateY(0) scale(1)';
          btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.18)';
        };
        return btn;
      };

      const startBtn = makeFooterBtn(
        '<i class="fa-solid fa-video"></i> Start Class',
        '#0045AA'
      );
      startBtn.onclick = () => {
        this.showToast('Live class feature coming soon!','info');
      };

      const scheduleBtn = makeFooterBtn(
        '<i class="fa-solid fa-calendar-check"></i> Schedule Class',
        '#FFA500'
      );
      scheduleBtn.onclick = () => {
        this.showToast('Scheduling feature coming soon!','info');
      };

      footer.appendChild(startBtn);
      footer.appendChild(scheduleBtn);
      card.appendChild(footer);

      overlay.appendChild(card);
      document.body.appendChild(overlay);

      renderStudentsTab(); // default tab content

      tabStudents.onclick = () => {
        setTabActive(tabStudents, true);
        setTabActive(tabAnnouncements, false);
        renderStudentsTab();
      };
      tabAnnouncements.onclick = () => {
        setTabActive(tabStudents, false);
        setTabActive(tabAnnouncements, false);
        setTabActive(tabMaterials, true);
        renderAnnouncementsTab();
      };

      tabMaterials.onclick = () => {
        setTabActive(tabStudents, false);
        setTabActive(tabAnnouncements, false);
        setTabActive(tabMaterials, true);
        renderMaterialsTab();
      };

      overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
      };

      const escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          overlay.remove();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
    } catch (err) {
      console.error('Error opening class', err);
    }
  }

  // ============================================================
  // ANNOUNCEMENTS POPUP LOADER (USED IN OPENCLASS)
  // ============================================================
  async loadAnnouncementsForPopup(classId: string) {
    try {
      const res: any = await this.http
        .get(`http://localhost:5000/api/announcements/class/${classId}`, {
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
                    ${
                      isLatest
                        ? '<span style="margin-left:6px;font-size:11px;color:#fff;background:#0045AA;padding:2px 6px;border-radius:999px;">NEW</span>'
                        : ''
                    }
                  </div>
                  <div style="margin-top:3px; font-size:13px; color:#555; line-height:1.45;">
                    ${a.message || ''}
                  </div>
                  ${
                    attachment
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
        .get(`http://localhost:5000/api/material/${classId}`, {
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
          const fileUrl = m.fileUrl ? 'http://localhost:5000' + m.fileUrl : m.externalLink;

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
          'http://localhost:5000/api/announcements/send',
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
          'http://localhost:5000/api/announcements/recent',
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
          'http://localhost:5000/api/faculty/updateprofilepic',
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
          'http://localhost:5000/api/updatepassword',
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
      this.showToast('Please select a class','error');
      return;
    }

    if (!title) {
      this.showToast('Enter material title','error');
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

      this.http.post('http://localhost:5000/api/material/upload', formData, {
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
          this.showToast(`Failed to upload ${uploadFile.name}: ${err.error?.message || 'Unknown error'}`,'error');
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

    this.showToast('Materials uploaded successfully 🧾!','success');
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

    this.http.get(`http://localhost:5000/api/material/${classId}`, {
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
      window.open('http://localhost:5000' + material.fileUrl, '_blank');
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
      shareUrl = 'http://localhost:5000' + material.fileUrl;
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

    this.http.delete(`http://localhost:5000/api/material/delete/${material._id}`, {
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


  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

}
