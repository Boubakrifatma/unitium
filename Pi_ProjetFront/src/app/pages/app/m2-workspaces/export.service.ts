import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ExportService {
  private readonly http = inject(HttpClient);

  exportWorkspacePdf(workspaceId: string, periodDays = 30): Observable<Blob> {
    return this.http.get(`http://localhost:8084/api/workspaces/${workspaceId}/export/pdf`, {
      params: { periodDays },
      responseType: 'blob'
    });
  }
}
