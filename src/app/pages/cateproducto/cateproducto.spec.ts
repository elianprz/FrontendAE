import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Cateproducto } from './cateproducto';

describe('Cateproducto', () => {
  let component: Cateproducto;
  let fixture: ComponentFixture<Cateproducto>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cateproducto]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Cateproducto);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
