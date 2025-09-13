import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Movimientocaja } from './movimientocaja';

describe('Movimientocaja', () => {
  let component: Movimientocaja;
  let fixture: ComponentFixture<Movimientocaja>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Movimientocaja]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Movimientocaja);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
