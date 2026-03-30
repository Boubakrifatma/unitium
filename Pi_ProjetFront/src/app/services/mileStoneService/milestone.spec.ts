import { TestBed } from '@angular/core/testing';

import { Milestone } from './milestone';

describe('Milestone', () => {
  let service: Milestone;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Milestone);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
