import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HeatmapDay, WarRoomSnapshot } from './war-room.models';

@Injectable({ providedIn: 'root' })
export class WarRoomService {
  private readonly http = inject(HttpClient);
  private readonly base = 'http://localhost:8084/api/workspaces';

  getSnapshot(workspaceId: string): Observable<WarRoomSnapshot> {
    return this.http.get<WarRoomSnapshot>(`${this.base}/${workspaceId}/pulse/snapshot`);
  }

  getHeatmap(workspaceId: string, weeks = 12): Observable<HeatmapDay[]> {
    return this.http.get<HeatmapDay[]>(`${this.base}/${workspaceId}/pulse/heatmap`, {
      params: { weeks }
    });
  }

  openStream(workspaceId: string): EventSource {
    return new EventSource(`${this.base}/${workspaceId}/pulse/stream`);
  }
}
