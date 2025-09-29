import { Routes } from '@angular/router';
import { Landing } from './components/landing/landing';
import {Signup} from './components/signup/signup';
import{Login} from './components/login/login';
import{Aboutus}from'./components/aboutus/aboutus';
import{Contactus}from'./components/contactus/contactus';
import{Ourservices}from'./components/ourservices/ourservices';
// OR, if the export is named differently (e.g., 'SignupComponent'):
// import { SignupComponent } from './components/signup/signup';

export const routes: Routes = [
      { path: '', component:Landing},
      {path:'signup',component: Signup},
      {path:'login',component:Login},
      {path:'about',component:Aboutus},
      {path:'contact',component:Contactus},
      {path:'services',component:Ourservices}
];
