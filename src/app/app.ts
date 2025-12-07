import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterModule, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, FormsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('orbit');
  protected readonly showLayout = signal(true);
  
  private routerSubscription?: Subscription;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Set initial state
    this.updateLayoutVisibility();
    
    // Subscribe to route changes
    this.routerSubscription = this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd)
      )
      .subscribe(() => {
        this.updateLayoutVisibility();
      });
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  private updateLayoutVisibility(): void {
    let route = this.activatedRoute;
    
    // Traverse to the deepest child route
    while (route.firstChild) {
      route = route.firstChild;
    }
    
    // Check if the current route has hideLayout data
    const shouldHideLayout = route.snapshot.data['hideLayout'];
    this.showLayout.set(!shouldHideLayout);
  }
}