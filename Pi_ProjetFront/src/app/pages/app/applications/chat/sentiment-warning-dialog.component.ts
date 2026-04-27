import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface SentimentWarningData {
  score: number;
}

@Component({
  selector: 'app-sentiment-warning-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="sw-wrap">
      <div class="sw-icon-row">
        <div class="sw-icon-circle">
          <mat-icon>warning_amber</mat-icon>
        </div>
      </div>
      <h2 class="sw-title">Negative Message Detected</h2>
      <p class="sw-body">
        Our system detected that your message may contain
        <strong>negative or offensive content</strong>
        (confidence: {{ (data.score * 100) | number:'1.0-0' }}%).
      </p>
      <p class="sw-body">
        Messages with negative tone may be <strong>reported</strong> and reviewed by a moderator.
        Are you sure you want to send this message?
      </p>
      <div class="sw-actions">
        <button mat-stroked-button class="sw-cancel-btn" (click)="cancel()">
          <mat-icon>edit</mat-icon> Edit Message
        </button>
        <button mat-flat-button class="sw-send-btn" (click)="send()">
          <mat-icon>send</mat-icon> Send Anyway
        </button>
      </div>
    </div>
  `,
  styles: [`
    .sw-wrap {
      padding: 28px 28px 20px;
      max-width: 420px;
      text-align: center;
      font-family: inherit;
    }
    .sw-icon-row {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
    }
    .sw-icon-circle {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #fff3e0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sw-icon-circle mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #f57c00;
    }
    .sw-title {
      font-size: 1.2rem;
      font-weight: 700;
      margin: 0 0 12px;
      color: #bf360c;
    }
    .sw-body {
      font-size: 0.92rem;
      color: #555;
      line-height: 1.55;
      margin: 0 0 10px;
    }
    .sw-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 20px;
    }
    .sw-cancel-btn {
      border-color: #ccc;
      color: #444;
    }
    .sw-send-btn {
      background: #e64a19;
      color: #fff;
    }
    .sw-send-btn:hover {
      background: #bf360c;
    }
  `],
})
export class SentimentWarningDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<SentimentWarningDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SentimentWarningData,
  ) {}

  cancel(): void {
    this.dialogRef.close(false);
  }

  send(): void {
    this.dialogRef.close(true);
  }
}
