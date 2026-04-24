import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

// ═════════════════════════════════════════════════════════════════════════
// INTERFACES - Deliverable Versions
// ═════════════════════════════════════════════════════════════════════════

export interface DeliverableVersion {
  id: number;
  deliverableId: number;
  versionNumber: number;
  fileUrl: string;
  fileSizeKb: number | null;
  changeSummary: string | null;
  submittedById: number;
  submittedByName: string | null;
  submittedAt: string;
  virusScanStatus: 'pending' | 'clean' | 'infected' | 'unverified';
}

export interface CreateDeliverableVersionRequest {
  deliverableId: number;
  fileUrl: string;
  fileSizeKb?: number;
  changeSummary?: string;
  // Forwarded from /api/files/upload so the version row stores the antivirus verdict.
  virusScanStatus?: 'clean' | 'unverified' | 'infected' | 'pending';
  virusName?: string | null;
}

export interface FileUploadResponse {
  fileUrl: string;
  fileName?: string;
  originalName: string;
  fileType: string;
  fileSizeKb: number;
  scanStatus?: 'clean' | 'unverified';
  virusName?: string | null;
  status?: string;
}

export interface DeliverableWithVersions {
  deliverableId: number;
  taskId: number;
  taskTitle: string | null;
  taskStatus: string | null;
  taskDueDate: string | null;
  projectId: string;
  employeeId: number;
  employeeName: string;
  title: string;
  description: string;
  currentVersion: number;
  overallStatus: string;
  fileUrl: string | null;
  fileType: string | null;
  fileSizeKb: number | null;
  submittedAt: string;
  updatedAt: string | null;
  versions: DeliverableVersion[];
}

export interface TaskDeliverableGroup {
  taskId: number;
  taskTitle: string;
  taskStatus: string;
  assignedToName: string | null;
  deliverables: DeliverableWithVersions[];
}

export interface MilestoneDeliverableGroup {
  milestoneId: number | null;
  milestoneName: string;
  milestoneDescription: string | null;
  milestoneStatus: string | null;
  dueDate: string | null;
  completionPct: number | null;
  tasks: TaskDeliverableGroup[];
}

// ═════════════════════════════════════════════════════════════════════════
// INTERFACES - Deliverable
// ═════════════════════════════════════════════════════════════════════════

/**
 * ✅ Interface Deliverable - FIXED
 * Pas de doublons, tous les champs avec les MÊMES modificateurs
 */
export interface Deliverable {
  // Deliverable info
  id: number;
  title: string;
  description: string;
  currentVersion: number;
  status: string;
  poDecisionField: string | null;  // ✅ SANS ? - OBLIGATOIRE
  
  // File info
  fileUrl: string | null;
  fileType: string | null;
  fileSizeKb: number | null;
  
  // Timestamps
  submittedAt: string;
  updatedAt: string | null;
  
  // Task info - ✅ Inclut taskTitle
  taskId: number;
  taskTitle: string | null;
  taskStatus: string | null;
  
  // Project info - ✅ Inclut projectName
  projectId: string;
  projectName: string | null;
  
  // Employee info
  submittedById: number | null;
  submittedByName: string | null;
  submittedByEmail: string | null;
}

export interface EmployeeStats {
  totalDeliverables: number;
  rejectedByManager: number;
  rejectedByPo: number;
  acceptedDeliverables: number;
  averageScore: number | null;
}

export interface DeliverableCreateDto {
  taskId: number;
  projectId: string;
  submittedById: number;
  title: string;
  description: string;
  fileUrl?: string;
  fileType?: string;
  fileSizeKb?: number;
  status?: string;
}

export interface DeliverableResponseDto extends DeliverableCreateDto {
  id?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ═════════════════════════════════════════════════════════════════════════
// SERVICE
// ═════════════════════════════════════════════════════════════════════════

@Injectable({
  providedIn: 'root'
})
export class DeliverableService {
  private apiUrl = 'http://localhost:8084/api/deliverables';
  private versionApiUrl = 'http://localhost:8084/api/deliverable-versions';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  /**
   * Récupère l'ID de l'utilisateur connecté
   */
  private getUserId(): number {
    const user = this.authService.currentUser?.();
    if (!user?.id) {
      console.error('User not authenticated');
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // VERSIONS - CREATE NEW VERSION
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/deliverable-versions/{deliverableId}
   * Crée une nouvelle version pour un livrable existant
   */
  createVersion(
    deliverableId: number,
    submittedById: number,
    request: CreateDeliverableVersionRequest
  ): Observable<DeliverableVersion> {
    return this.http.post<DeliverableVersion>(
      `${this.versionApiUrl}/${deliverableId}?submittedById=${submittedById}`,
      request
    );
  }

  /**
   * GET /api/deliverable-versions/deliverable/{deliverableId}
   * Récupère un livrable avec toutes ses versions
   */
  getDeliverableWithVersions(deliverableId: number): Observable<DeliverableWithVersions> {
    return this.http.get<DeliverableWithVersions>(
      `${this.versionApiUrl}/deliverable/${deliverableId}`
    );
  }

  /**
   * GET /api/deliverable-versions/deliverable/{deliverableId}/latest
   * Récupère la dernière version d'un livrable
   */
  getLatestVersion(deliverableId: number): Observable<DeliverableVersion> {
    return this.http.get<DeliverableVersion>(
      `${this.versionApiUrl}/deliverable/${deliverableId}/latest`
    );
  }

  /**
   * GET /api/deliverable-versions/{versionId}
   * Récupère une version spécifique
   */
  getVersion(versionId: number): Observable<DeliverableVersion> {
    return this.http.get<DeliverableVersion>(`${this.versionApiUrl}/${versionId}`);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // CREATE
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/deliverables
   * Crée un nouveau livrable
   */
  createDeliverable(data: DeliverableCreateDto): Observable<DeliverableResponseDto> {
    return this.http.post<DeliverableResponseDto>(this.apiUrl, data);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // READ - GENERAL
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/deliverables
   * Récupère tous les livrables
   */
  getAll(): Observable<DeliverableResponseDto[]> {
    return this.http.get<DeliverableResponseDto[]>(this.apiUrl);
  }

  /**
   * GET /api/deliverables/{id}
   * Récupère un livrable par ID
   */
  getById(id: number): Observable<DeliverableResponseDto> {
    return this.http.get<DeliverableResponseDto>(`${this.apiUrl}/${id}`);
  }

  /**
   * GET /api/deliverables/task/{taskId}
   * Récupère les livrables d'une tâche
   */
  getByTaskId(taskId: number): Observable<DeliverableResponseDto[]> {
    return this.http.get<DeliverableResponseDto[]>(`${this.apiUrl}/task/${taskId}`);
  }

  /**
   * GET /api/deliverables/project/{projectId}
   * Récupère les livrables d'un projet
   */
  getByProjectId(projectId: string): Observable<DeliverableResponseDto[]> {
    return this.http.get<DeliverableResponseDto[]>(`${this.apiUrl}/project/${projectId}`);
  }

  /**
   * GET /api/deliverables/project/{projectId}/manager-view
   * Vue manager : livrables groupés par milestone > tâche, avec toutes les versions
   */
  getManagerView(projectId: string): Observable<MilestoneDeliverableGroup[]> {
    return this.http.get<MilestoneDeliverableGroup[]>(`${this.apiUrl}/project/${projectId}/manager-view`);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // READ - EMPLOYEE VIEW
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/deliverables/user/{userId}
   * Récupère tous les livrables de l'employé connecté
   * ✅ Inclut projectName et taskTitle
   */
  getMyDeliverables(): Observable<Deliverable[]> {
    try {
      const userId = this.getUserId();
      return this.http.get<Deliverable[]>(`${this.apiUrl}/user/${userId}`);
    } catch (error) {
      console.error('Error getting user ID:', error);
      return throwError(() => new Error('User not authenticated'));
    }
  }

  /**
   * GET /api/deliverables/user/{userId}
   * Récupère les livrables filtrés par statut (côté client)
   * ✅ Inclut projectName et taskTitle
   */
  getMyStats(): Observable<EmployeeStats> {
    try {
      const userId = this.getUserId();
      return this.http.get<EmployeeStats>(`${this.apiUrl}/stats/me?userId=${userId}`);
    } catch (error) {
      return throwError(() => new Error('User not authenticated'));
    }
  }

  getMyDeliverablesByStatus(status: string): Observable<Deliverable[]> {
    try {
      const userId = this.getUserId();
      return this.http.get<Deliverable[]>(`${this.apiUrl}/user/${userId}`);
    } catch (error) {
      console.error('Error getting user ID:', error);
      return throwError(() => new Error('User not authenticated'));
    }
  }

  /**
   * GET /api/deliverables/{id}
   * Récupère les détails d'un livrable spécifique
   * ✅ Inclut projectName et taskTitle
   */
  getDeliverable(id: number): Observable<Deliverable> {
    return this.http.get<Deliverable>(`${this.apiUrl}/${id}`);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // UPDATE
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * PUT /api/deliverables/{id}
   * Met à jour un livrable
   */
  updateDeliverable(id: number, data: DeliverableCreateDto): Observable<DeliverableResponseDto> {
    return this.http.put<DeliverableResponseDto>(`${this.apiUrl}/${id}`, data);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // DELETE
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * DELETE /api/deliverables/{id}
   * Supprime un livrable
   */
  deleteDeliverable(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // HELPERS - STATUS MAPPING
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/files/upload
   * Upload un fichier et retourne l'URL de téléchargement
   */
  uploadFile(file: File): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<FileUploadResponse>(
      'http://localhost:8084/api/files/upload',
      formData
    );
  }

  /**
   * Retourne la couleur du statut pour l'affichage
   */
  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'draft': '#95a5a6',
      'submitted': '#3498db',
      'under_review': '#f39c12',
      'manager_viewed': '#8b5cf6',
      'revision_required': '#e74c3c',
      'accepted_by_manager': '#27ae60',
      'po_review': '#2980b9',
      'validated': '#16a085',
      'rejected_final': '#c0392b'
    };
    return colors[status] ?? '#95a5a6';
  }

  /**
   * Retourne le label lisible du statut
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'draft': 'Brouillon',
      'submitted': 'Soumis',
      'under_review': 'En révision',
      'manager_viewed': 'Vu par le manager',
      'revision_required': 'Révision requise',
      'accepted_by_manager': 'Accepté par Manager',
      'po_review': 'Révision PO',
      'validated': 'Validé',
      'rejected_final': 'Rejeté'
    };
    return labels[status] ?? status;
  }

  /**
   * Formate la taille du fichier (KB → KB/MB)
   */
  formatFileSize(sizeKb: number | null): string {
    if (!sizeKb) return 'N/A';
    return sizeKb < 1024 ? `${sizeKb} KB` : `${(sizeKb / 1024).toFixed(2)} MB`;
  }

  /**
   * Construit l'URL de téléchargement complète à partir d'un chemin relatif fileUrl
   * ex: "/api/files/deliverables/uuid.pdf" → "http://localhost:8084/api/files/deliverables/uuid.pdf"
   */
  getDownloadUrl(fileUrl: string | null | undefined): string | null {
    if (!fileUrl) return null;
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl;
    return `http://localhost:8084${fileUrl}`;
  }

  /**
   * Formate la date en français
   */
  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }
}