import { Routes } from '@angular/router';
import { Landing } from './components/landing/landing';
import { Signup } from './components/signup/signup';
import { LoginComponent } from './components/login/login';
import { Aboutus } from './components/aboutus/aboutus';
import { Contactus } from './components/contactus/contactus';
import { Faculty } from './components/faculty/faculty';
import { Ourservices } from './components/ourservices/ourservices';
import { Error } from './components/error/error';
import { Studentdashboard } from './components/studentdashboard/studentdashboard';
import { Forgetpassword } from './components/forgetpassword/forgetpassword';
import { AuthGuard } from './guards/auth-guard';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', component: Landing },
  
  { path: 'signup', component: Signup, data: { hideLayout: true } },
  { path: 'login', component: LoginComponent, data: { hideLayout: true } },

  { path: 'about', component: Aboutus },
  { path: 'contact', component: Contactus },

  {path:'forgetpassword',component:Forgetpassword, data: { hideLayout: true }},

  {
    path: 'teacherdashboard',
    component: Faculty,
    canActivate: [AuthGuard,RoleGuard] ,
    data: { role: 'faculty' }  // 🔥 Protected route
  },
   {
    path: 'studentdashboard',
    component: Studentdashboard,
    canActivate: [AuthGuard, RoleGuard, ],
    data: { role: 'student' }  // 🔥 Protected route
  },


  { path: 'services', component: Ourservices },

  { path: '**', component: Error, data: { hideLayout: true } }
];
