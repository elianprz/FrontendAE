import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Soporte } from './soporte';

describe('Soporte', () => {
  let component: Soporte;
  let fixture: ComponentFixture<Soporte>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Soporte]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Soporte);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
