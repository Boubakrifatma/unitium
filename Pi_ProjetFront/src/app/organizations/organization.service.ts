import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface OrganizationDTO {
  id: string;
  name: string;
  slug: string;
  orgType: string;
  ownerId: number;
  stripeCustomerId: string | null;
  billingEmail: string | null;
  vatNumber: string | null;
  billingCountry: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMemberDTO {
  id: string;
  organizationId: string;
  userId: number;
  userFullName: string | null;
  userEmail: string | null;
  role: string;         // org-level: OWNER | ADMIN | MEMBER
  platformRole: string | null; // user's real role: MANAGER | TUTOR | EMPLOYEE | etc.
  joinedAt: string;
}

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private http = inject(HttpClient);
  private base = 'http://localhost:8084/api/organizations';

  // Organizations
  getAll(): Observable<OrganizationDTO[]> { return this.http.get<OrganizationDTO[]>(this.base); }
  getById(id: string): Observable<OrganizationDTO> { return this.http.get<OrganizationDTO>(`${this.base}/${id}`); }
  getMyOrganization(): Observable<OrganizationDTO> { return this.http.get<OrganizationDTO>(`${this.base}/my`); }
  create(body: any): Observable<OrganizationDTO> { return this.http.post<OrganizationDTO>(this.base, body); }
  update(id: string, body: any): Observable<OrganizationDTO> { return this.http.put<OrganizationDTO>(`${this.base}/${id}`, body); }
  delete(id: string): Observable<any> { return this.http.delete(`${this.base}/${id}`); }

  // Members
  getMembers(orgId: string): Observable<OrgMemberDTO[]> { return this.http.get<OrgMemberDTO[]>(`${this.base}/${orgId}/members`); }
  addMember(orgId: string, body: { userId: number; role: string }): Observable<OrgMemberDTO> { return this.http.post<OrgMemberDTO>(`${this.base}/${orgId}/members`, body); }
  changeRole(orgId: string, memberId: string, role: string): Observable<OrgMemberDTO> { return this.http.patch<OrgMemberDTO>(`${this.base}/${orgId}/members/${memberId}/role`, { role }); }
  removeMember(orgId: string, memberId: string): Observable<any> { return this.http.delete(`${this.base}/${orgId}/members/${memberId}`); }
}
