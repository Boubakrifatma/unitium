import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface StudentDeliverableCreate {
  studentId: number;
  tutorId: number;
  title: string;
  description: string;
  fileUrl: string;
  fileType: string;
  fileSizeKb: number;
  virusScanStatus?: string;
  virusName?: string | null;
  projectId?: string | null;
  projectName?: string | null;
}

export interface StudentDeliverable {
  id: number;
  versionNumber: number;
  parentId: number | null;
  projectId: string | null;
  projectName: string | null;
  title: string;
  description: string;
  fileUrl: string | null;
  fileType: string | null;
  fileSizeKb: number | null;
  studentId: number | null;
  studentName: string | null;
  studentEmail: string | null;
  tutorId: number | null;
  tutorName: string | null;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED';
  tutorDecision: 'ACCEPTED' | 'REJECTED' | null;
  score: number | null;
  tutorFeedback: string | null;
  reportPath: string | null;
  virusScanStatus: string | null;
  virusName: string | null;
  evaluatedById: number | null;
  evaluatedByName: string | null;
  evaluatedAt: string | null;
  submittedAt: string;
  updatedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class StudentDeliverableService {

  private readonly base = 'http://localhost:8084/api/student-deliverables';

  constructor(private http: HttpClient) {}

  submit(dto: StudentDeliverableCreate): Observable<StudentDeliverable> {
    return this.http.post<StudentDeliverable>(this.base, dto);
  }

  getById(id: number): Observable<StudentDeliverable> {
    return this.http.get<StudentDeliverable>(`${this.base}/${id}`);
  }

  getByStudent(studentId: number): Observable<StudentDeliverable[]> {
    return this.http.get<StudentDeliverable[]>(`${this.base}/student/${studentId}`);
  }

  getByTutor(tutorId: number): Observable<StudentDeliverable[]> {
    return this.http.get<StudentDeliverable[]>(`${this.base}/tutor/${tutorId}`);
  }

  getPendingForTutor(tutorId: number): Observable<StudentDeliverable[]> {
    return this.http.get<StudentDeliverable[]>(`${this.base}/tutor/${tutorId}/pending`);
  }

  markUnderReview(id: number): Observable<StudentDeliverable> {
    return this.http.patch<StudentDeliverable>(`${this.base}/${id}/under-review`, {});
  }

  addVersion(parentId: number, dto: Omit<StudentDeliverableCreate, 'studentId' | 'tutorId' | 'title'>): Observable<StudentDeliverable> {
    return this.http.post<StudentDeliverable>(`${this.base}/${parentId}/versions`, dto);
  }

  getVersions(parentId: number): Observable<StudentDeliverable[]> {
    return this.http.get<StudentDeliverable[]>(`${this.base}/${parentId}/versions`);
  }
}
