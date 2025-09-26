import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Detallecompras } from './detallecompras';

describe('Detallecompras', () => {
  let component: Detallecompras;
  let fixture: ComponentFixture<Detallecompras>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Detallecompras]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Detallecompras);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
