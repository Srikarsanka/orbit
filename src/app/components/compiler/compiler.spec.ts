import { TestBed } from '@angular/core/testing';
import { Compiler } from './compiler';

describe('Compiler', () => {
      beforeEach(async () => {
            await TestBed.configureTestingModule({
                  imports: [Compiler]
            }).compileComponents();
      });

      it('should create the compiler component', () => {
            const fixture = TestBed.createComponent(Compiler);
            const component = fixture.componentInstance;
            expect(component).toBeTruthy();
      });
});
