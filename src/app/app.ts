import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';   // ✅ import RouterModule
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 

import { routes } from './app.routes';   // ✅ Import your routes array

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    FormsModule
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('orbit');
}
