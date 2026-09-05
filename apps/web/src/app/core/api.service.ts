import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API, DailyPoint, MazeItem, RunItem } from '../shared/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  mazes(): Observable<MazeItem[]> {
    return this.http.get<MazeItem[]>(`${API}/mazes`);
  }

  maze(slug: string): Observable<MazeItem> {
    return this.http.get<MazeItem>(`${API}/mazes/${slug}`);
  }

  checkout(mazeId: string, teamSize: number): Observable<RunItem> {
    return this.http.post<RunItem>(`${API}/runs/checkout`, { mazeId, teamSize });
  }

  mine(): Observable<RunItem[]> {
    return this.http.get<RunItem[]>(`${API}/runs/mine`);
  }

  byCode(code: string): Observable<RunItem> {
    return this.http.get<RunItem>(`${API}/runs/by-code/${code}`);
  }

  cancel(code: string): Observable<RunItem> {
    return this.http.post<RunItem>(`${API}/runs/${code}/cancel`, {});
  }

  leaderboard(mazeId?: string): Observable<RunItem[]> {
    const q = mazeId ? `?mazeId=${encodeURIComponent(mazeId)}` : '';
    return this.http.get<RunItem[]>(`${API}/leaderboard${q}`);
  }

  scan(codeOrUrl: string): Observable<RunItem> {
    return this.http.post<RunItem>(`${API}/staff/scan`, { codeOrUrl });
  }

  start(code: string): Observable<RunItem> {
    return this.http.post<RunItem>(`${API}/staff/start`, { code });
  }

  stamp(code: string, checkpointId: string): Observable<RunItem> {
    return this.http.post<RunItem>(`${API}/runs/${code}/checkpoints`, { checkpointId });
  }

  finish(code: string): Observable<RunItem> {
    return this.http.post<RunItem>(`${API}/runs/${code}/finish`, {});
  }

  daily(): Observable<DailyPoint[]> {
    return this.http.get<DailyPoint[]>(`${API}/stats/daily`);
  }

  loyalty(): Observable<{ points: number }> {
    return this.http.get<{ points: number }>(`${API}/loyalty/me`);
  }

  createMaze(body: Partial<MazeItem> & { slug: string; name: string; photoUrl: string; parSec: number; durationMin: number; maxTeams: number }) {
    return this.http.post<MazeItem>(`${API}/admin/mazes`, body);
  }
}
