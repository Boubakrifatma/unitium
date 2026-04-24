import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HeatmapDay, WarRoomSnapshot } from './war-room.models';

@Injectable({ providedIn: 'root' })
export class WarRoomService {
  private readonly http = inject(HttpClient);
  private readonly base = 'http://localhost:8084/api/workspaces';

  getSnapshot(workspaceId: string, at?: string): Observable<WarRoomSnapshot> {
    let params = new HttpParams();
    if (at) params = params.set('at', at);
    return this.http.get<WarRoomSnapshot>(`${this.base}/${workspaceId}/pulse/snapshot`, { params });
  }

  getHeatmap(workspaceId: string, weeks = 12, at?: string): Observable<HeatmapDay[]> {
    let params = new HttpParams().set('weeks', String(weeks));
    if (at) params = params.set('at', at);
    return this.http.get<HeatmapDay[]>(`${this.base}/${workspaceId}/pulse/heatmap`, { params });
  }

  openStream(workspaceId: string): EventSource {
    return new EventSource(`${this.base}/${workspaceId}/pulse/stream`);
  }
}
