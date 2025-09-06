import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Caja } from './caja';

describe('Caja', () => {
  let component: Caja;
  let fixture: ComponentFixture<Caja>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Caja]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Caja);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
