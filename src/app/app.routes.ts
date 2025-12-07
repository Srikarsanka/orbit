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

export const routes: Routes = [
  { path: '', component: Landing },
  
  { path: 'signup', component: Signup, data: { hideLayout: true } },
  { path: 'login', component: LoginComponent, data: { hideLayout: true } },

  { path: 'about', component: Aboutus },
  { path: 'contact', component: Contactus },

  {path:'forgetpassword',component:Forgetpassword},

  {
    path: 'teacherdashboard',
    component: Faculty,
    canActivate: [AuthGuard]   // 🔥 Protected route
  },
   {
    path: 'studentdashboard',
    component: Studentdashboard,
    canActivate: [AuthGuard]   // 🔥 Protected route
  },


  { path: 'services', component: Ourservices },

  { path: '**', component: Error, data: { hideLayout: true } }
];
