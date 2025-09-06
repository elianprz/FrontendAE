import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Cateproveedor } from './cateproveedor';

describe('Cateproveedor', () => {
  let component: Cateproveedor;
  let fixture: ComponentFixture<Cateproveedor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cateproveedor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Cateproveedor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
