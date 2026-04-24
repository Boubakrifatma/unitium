import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import * as faceapi from 'face-api.js';

export interface FaceDuplicatePair {
  user1: { id: number; email: string; fullName: string };
  user2: { id: number; email: string; fullName: string };
  distance: number;
}

@Injectable({ providedIn: 'root' })
export class FaceService {

  private readonly API = 'http://localhost:8084/api/auth';
  private modelsLoaded = false;

  constructor(private http: HttpClient) {}

  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;
    const url = '/assets/models';
    await faceapi.nets.ssdMobilenetv1.loadFromUri(url);
    await faceapi.nets.faceLandmark68Net.loadFromUri(url);
    await faceapi.nets.faceRecognitionNet.loadFromUri(url);
    this.modelsLoaded = true;
  }

  async getDescriptor(video: HTMLVideoElement): Promise<Float32Array | null> {
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    return detection?.descriptor ?? null;
  }

  registerFace(descriptor: number[]): Observable<any> {
    return this.http.post(`${this.API}/face-register`, { descriptor });
  }

  faceLogin(descriptor: number[]): Observable<any> {
    return this.http.post(`${this.API}/face-login`, { descriptor });
  }

  removeFace(): Observable<any> {
    return this.http.delete(`${this.API}/face-register`);
  }

  getFaceDuplicates(): Observable<FaceDuplicatePair[]> {
    return this.http.get<FaceDuplicatePair[]>(`${this.API}/face-duplicates`);
  }
}
