import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeLayout } from './employee-layout';

describe('EmployeeLayout', () => {
  let component: EmployeeLayout;
  let fixture: ComponentFixture<EmployeeLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeLayout]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeeLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
