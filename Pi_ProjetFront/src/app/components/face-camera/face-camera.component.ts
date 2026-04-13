import {
  Component, Output, EventEmitter, OnDestroy, signal, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FaceService } from '../../auth/face.service';

type State = 'idle' | 'loading' | 'ready' | 'scanning' | 'success' | 'error' | 'no-face';

@Component({
  selector: 'app-face-camera',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="face-camera-wrap">

      <!-- Camera viewport -->
      <div class="camera-frame" [class.pulse]="state() === 'scanning'">
        <video #videoEl autoplay muted playsinline class="camera-video"
               [class.hidden]="state() === 'idle' || state() === 'loading'"></video>

        <!-- Overlay icon by state -->
        <div class="camera-overlay" *ngIf="state() !== 'ready' && state() !== 'scanning'">
          <mat-spinner *ngIf="state() === 'loading'" diameter="48"></mat-spinner>
          <mat-icon *ngIf="state() === 'idle'" class="overlay-icon idle">face</mat-icon>
          <mat-icon *ngIf="state() === 'success'" class="overlay-icon success">check_circle</mat-icon>
          <mat-icon *ngIf="state() === 'error'" class="overlay-icon error">error_outline</mat-icon>
          <mat-icon *ngIf="state() === 'no-face'" class="overlay-icon warn">sentiment_dissatisfied</mat-icon>
        </div>

        <!-- Face guide ring (visible when ready/scanning) -->
        <div class="face-ring" *ngIf="state() === 'ready' || state() === 'scanning'"></div>
      </div>

      <!-- Status message -->
      <p class="status-msg">
        <span *ngIf="state() === 'idle'">Click "Start" to activate camera</span>
        <span *ngIf="state() === 'loading'">Loading face models…</span>
        <span *ngIf="state() === 'ready'">Position your face inside the ring, then click Scan</span>
        <span *ngIf="state() === 'scanning'">Scanning… hold still</span>
        <span *ngIf="state() === 'success'" class="text-success">Face detected!</span>
        <span *ngIf="state() === 'error'" class="text-danger">{{ errorMsg }}</span>
        <span *ngIf="state() === 'no-face'" class="text-warn">No face detected — try again</span>
      </p>

      <!-- Actions -->
      <div class="face-actions">
        <button matButton (click)="start()" *ngIf="state() === 'idle' || state() === 'error' || state() === 'no-face'">
          <mat-icon>videocam</mat-icon> Start Camera
        </button>
        <button matButton color="primary" (click)="scan()" *ngIf="state() === 'ready'">
          <mat-icon>face_retouching_natural</mat-icon> Scan Face
        </button>
        <button matButton (click)="stop()" *ngIf="state() === 'ready' || state() === 'scanning'">
          <mat-icon>stop</mat-icon> Cancel
        </button>
      </div>
    </div>
  `,
  styles: [`
    .face-camera-wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; }

    .camera-frame {
      position: relative; width: 220px; height: 220px;
      border-radius: 50%; overflow: hidden;
      background: #1e1e2e;
      border: 3px solid #6366f1;
      display: flex; align-items: center; justify-content: center;
    }
    .camera-frame.pulse { animation: pulse 1.2s infinite; }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.6); }
      50%       { box-shadow: 0 0 0 12px rgba(99,102,241,0); }
    }

    .camera-video { width: 100%; height: 100%; object-fit: cover; }
    .camera-video.hidden { display: none; }

    .camera-overlay {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: rgba(15,15,30,0.7);
    }
    .overlay-icon { font-size: 52px !important; width: 52px !important; height: 52px !important; }
    .overlay-icon.idle    { color: #6366f1; }
    .overlay-icon.success { color: #10b981; }
    .overlay-icon.error   { color: #ef4444; }
    .overlay-icon.warn    { color: #f59e0b; }

    .face-ring {
      position: absolute; inset: 12px;
      border-radius: 50%; border: 2px dashed rgba(99,102,241,0.7);
      pointer-events: none;
    }

    .status-msg { font-size: 13px; text-align: center; margin: 0; color: #6b7280; min-height: 20px; }
    .text-success { color: #10b981 !important; }
    .text-danger  { color: #ef4444 !important; }
    .text-warn    { color: #f59e0b !important; }

    .face-actions { display: flex; gap: 8px; }
  `]
})
export class FaceCameraComponent implements OnDestroy {

  @Output() descriptor = new EventEmitter<number[]>();
  @ViewChild('videoEl') videoRef!: ElementRef<HTMLVideoElement>;

  state = signal<State>('idle');
  errorMsg = '';

  private stream: MediaStream | null = null;

  constructor(private faceService: FaceService) {}

  async start(): Promise<void> {
    this.state.set('loading');
    try {
      await this.faceService.loadModels();
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setTimeout(() => {
        if (this.videoRef?.nativeElement) {
          this.videoRef.nativeElement.srcObject = this.stream;
        }
        this.state.set('ready');
      }, 100);
    } catch (e: any) {
      this.errorMsg = 'Camera access denied or models failed to load.';
      this.state.set('error');
    }
  }

  async scan(): Promise<void> {
    this.state.set('scanning');
    try {
      const video = this.videoRef.nativeElement;
      const desc = await this.faceService.getDescriptor(video);
      if (!desc) {
        this.state.set('no-face');
        return;
      }
      this.state.set('success');
      this.descriptor.emit(Array.from(desc));
      setTimeout(() => this.stop(), 1500);
    } catch (e: any) {
      this.errorMsg = 'Scan failed. Please try again.';
      this.state.set('error');
    }
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.state.set('idle');
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
