import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Studentdashboard } from './studentdashboard';

describe('Studentdashboard', () => {
  let component: Studentdashboard;
  let fixture: ComponentFixture<Studentdashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Studentdashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Studentdashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
