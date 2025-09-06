import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Roleandusers } from './roleandusers';

describe('Roleandusers', () => {
  let component: Roleandusers;
  let fixture: ComponentFixture<Roleandusers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Roleandusers]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Roleandusers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
