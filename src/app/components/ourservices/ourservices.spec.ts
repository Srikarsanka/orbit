import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Ourservices } from './ourservices';

describe('Ourservices', () => {
  let component: Ourservices;
  let fixture: ComponentFixture<Ourservices>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ourservices]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Ourservices);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
