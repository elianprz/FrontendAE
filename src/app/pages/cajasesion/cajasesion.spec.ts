import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Cajasesion } from './cajasesion';

describe('Cajasesion', () => {
  let component: Cajasesion;
  let fixture: ComponentFixture<Cajasesion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cajasesion]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Cajasesion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
