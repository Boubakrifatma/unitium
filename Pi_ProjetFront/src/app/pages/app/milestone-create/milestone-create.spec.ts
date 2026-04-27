import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MilestoneCreate } from './milestone-create';

describe('MilestoneCreate', () => {
  let component: MilestoneCreate;
  let fixture: ComponentFixture<MilestoneCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MilestoneCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MilestoneCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
