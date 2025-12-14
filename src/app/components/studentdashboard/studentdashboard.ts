import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

@Component({
  selector: 'app-studentdashboard',
  templateUrl: './studentdashboard.html',
  styleUrls: ['./studentdashboard.css'],
  standalone: true,
  imports: [HttpClientModule, CommonModule, FormsModule]
})
export class Studentdashboard implements OnInit {

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
     UI STATE
     ============================================================ */
  selectedSection: string = "dashboard";

  joinCode: string = "";
  joinSuccess: string = "";
  joinError: string = "";

  constructor(private http: HttpClient) {}

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
    this.http.get<any>(
      "http://localhost:5000/auth/redirect",
      { withCredentials: true }
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
    });
  }

  /* ============================================================
     LOAD CLASSES (USING .toPromise())
     ============================================================ */
  async loadClasses() {
    if (!this.user?.email) return;

    try {
      const res: any = await this.http.post(
        "http://localhost:5000/api/student/classes",
        { studentEmail: this.user.email },
        { withCredentials: true }
      ).toPromise(); // 👈 OLD STYLE (as requested)

      /*
        Backend response:
        {
          message: "Classes Found",
          payload: [ {...}, {...} ]
        }
      */

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

    } catch (error) {
      console.error("Error loading classes:", error);
      this.myClasses = [];
    }
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
      classCode: this.joinCode
    };

    this.http.post<any>(
      "http://localhost:5000/api/student/join",
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
      error: () => {
        this.joinError = "Unable to join class";
      }
    });
  }

  /* ============================================================
     SIDEBAR SECTION SWITCH
     ============================================================ */
  select(section: string) {
    this.selectedSection = section;
    if (section !== "joinclass") {
      this.clearForm();
    }
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
     ENTER CLASS (FUTURE ROUTING)
     ============================================================ */
  enterClass(cls: LoadedClass) {
    console.log("Entering class:", cls);
    alert(`Entering ${cls.className}`);
  }

  /* ============================================================
     LOGOUT
     ============================================================ */
  logout() {
    document.cookie =
      "orbit_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.href = "/login";
  }
}
