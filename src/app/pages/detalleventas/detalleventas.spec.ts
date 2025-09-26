import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Detalleventas } from './detalleventas';

describe('Detalleventas', () => {
  let component: Detalleventas;
  let fixture: ComponentFixture<Detalleventas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Detalleventas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Detalleventas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
