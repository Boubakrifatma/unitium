import {
  Component, OnInit, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DeliverableService, CreateDeliverableVersionRequest } from '../../../services/Deliverable.service';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';

// ── Virus Warning Dialog ─────────────────────────────────────────────────────
@Component({
  selector: 'app-virus-warning-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div style="padding: 8px 0 0 0;">
      <h2 mat-dialog-title style="display:flex; align-items:center; gap:10px; color:#b71c1c; margin:0 0 4px 0;">
        <mat-icon style="font-size:28px; height:28px; width:28px; color:#b71c1c;">gpp_bad</mat-icon>
        Fichier dangereux détecté
      </h2>
      <mat-dialog-content style="padding-top:12px;">
        <div style="display:flex; gap:14px; align-items:flex-start; background:#fff3f3; border-radius:8px; padding:16px; border-left:4px solid #e53935;">
          <mat-icon style="color:#e53935; margin-top:2px; flex-shrink:0;">warning_amber</mat-icon>
          <div>
            <p style="margin:0 0 8px 0; font-weight:600; color:#c62828;">Ce fichier a été rejeté par l'antivirus.</p>
            <p style="margin:0; color:#555; font-size:13.5px;">{{ data.message }}</p>
          </div>
        </div>
        <p style="margin:16px 0 0 0; font-size:12.5px; color:#888;">
          Ne tentez pas de soumettre ce fichier. Si vous pensez qu'il s'agit d'une fausse détection, contactez votre administrateur.
        </p>
      </mat-dialog-content>
      <mat-dialog-actions align="end" style="padding:8px 0 0 0;">
        <button mat-raised-button color="warn" mat-dialog-close style="min-width:100px;">
          <mat-icon>close</mat-icon> Fermer
        </button>
      </mat-dialog-actions>
    </div>
  `,
})
export class VirusWarningDialogComponent {
  readonly data: { message: string } = inject(MAT_DIALOG_DATA);
}

const VAGUE_PHRASES = [
  'work done', 'done', 'finished', 'completed', 'ok', 'good',
  'travail fait', 'fait', 'terminé', 'fini', 'nothing', 'n/a', 'rien'
];

const KEYWORD_DICTIONARY: Record<string, string[]> = {
  development: [
    'fonctionnalité', 'implémentation', 'module', 'composant', 'intégration',
    'API', 'endpoint', 'service', 'logique', 'algorithme', 'optimisation',
    'performance', 'refactoring', 'tests unitaires', 'build', 'librairie',
    'interface', 'méthode', 'classe', 'déploiement', 'configuration',
    'validation', 'traitement', 'flux', 'pipeline', 'routage'
  ],
  design: [
    'maquette', 'wireframe', 'prototype', 'UI', 'UX', 'charte graphique',
    'palette', 'typographie', 'icônes', 'responsive', 'accessibilité',
    'composant visuel', 'navigation', 'layout', 'grille', 'espacement',
    'animation', 'Figma', 'interaction', 'flux utilisateur', 'écran',
    'symbole', 'style guide', 'couleur', 'bouton', 'formulaire'
  ],
  backend: [
    'API REST', 'base de données', 'requête SQL', 'authentification',
    'autorisation', 'sécurité', 'migration', 'schéma', 'modèle',
    'microservice', 'cache', 'logging', 'monitoring', 'serveur',
    'conteneur', 'Docker', 'CORS', 'middleware', 'token', 'JWT',
    'ORM', 'transaction', 'indexation', 'relation', 'entité', 'repository'
  ],
  bug: [
    'correction', 'résolution', 'régression', 'cause racine', 'diagnostic',
    'reproduction', 'test de non-régression', 'hotfix', 'patch', 'anomalie',
    'comportement attendu', 'comportement observé', 'environnement', 'logs',
    'stack trace', 'validation', 'vérification', 'impact', 'ticket',
    'scénario', 'conditions de déclenchement', 'rollback', 'correctif'
  ],
  testing: [
    "test unitaire", "test d'intégration", 'test fonctionnel', 'couverture',
    'scénario de test', 'cas de test', 'résultat attendu', 'résultat obtenu',
    'rapport de test', 'anomalie', 'validation', 'recette', 'smoke test',
    'assertion', 'mock', 'fixture', 'pipeline CI', 'automatisation'
  ],
  documentation: [
    'documentation technique', 'guide utilisateur', 'spécification',
    'diagramme', 'architecture', 'processus', 'procédure', 'manuel',
    'tutoriel', 'référence', 'changelog', 'README', 'swagger', 'API doc',
    'schéma de données', 'glossaire', 'exemple', 'use case'
  ],
  analysis: [
    'analyse', 'étude', 'benchmark', 'comparaison', 'évaluation', 'KPI',
    'métriques', 'rapport', 'tendance', 'statistique', 'insight',
    'hypothèse', 'conclusion', 'recommandation', 'données', 'visualisation'
  ],
  devops: [
    'pipeline CI/CD', 'déploiement', 'conteneur', 'Docker', 'Kubernetes',
    'infrastructure', 'monitoring', 'alerting', 'scalabilité', 'rollback',
    'automatisation', 'script', 'environnement', 'secrets', 'certificat',
    'load balancer', 'reverse proxy', 'release', 'artefact'
  ],
  default: [
    'résultats', 'objectifs', 'méthodologie', 'analyse', 'synthèse',
    'recommandations', 'jalons', 'avancement', 'décisions', 'contexte',
    'contraintes', 'risques', 'livrables attendus', 'périmètre'
  ]
};

const SUGGESTION_TEMPLATES: Record<string, (title: string) => string> = {
  development: (title) =>
    `Livrable de développement pour la tâche "${title}". Ce livrable inclut l'implémentation du module concerné, les tests unitaires associés et la documentation technique. Les fonctionnalités développées ont été validées par rapport aux critères d'acceptance définis, avec une attention particulière portée à la performance et à la maintenabilité du code.`,
  design: (title) =>
    `Livrable de design pour la tâche "${title}". Ce livrable comprend les maquettes finales (Figma), le prototype interactif et la charte graphique appliquée. Les choix UX ont été guidés par les retours utilisateurs et les principes d'accessibilité. Le flux de navigation et les interactions ont été documentés.`,
  backend: (title) =>
    `Livrable backend pour la tâche "${title}". Ce livrable expose les endpoints API REST développés, les migrations de base de données appliquées et les règles de sécurité mises en place. Les performances ont été validées et les logs de monitoring sont configurés.`,
  bug: (title) =>
    `Correctif pour la tâche "${title}". Ce livrable décrit la cause racine identifiée, les conditions de déclenchement de l'anomalie et la solution appliquée (hotfix/patch). Des tests de non-régression ont été exécutés pour valider que le comportement attendu est rétabli sans impact sur les fonctionnalités existantes.`,
  testing: (title) =>
    `Livrable de tests pour la tâche "${title}". Ce livrable présente les scénarios de test rédigés, les résultats obtenus par rapport aux résultats attendus et le taux de couverture atteint. Les anomalies détectées sont documentées avec leur criticité et les actions correctives recommandées.`,
  documentation: (title) =>
    `Livrable de documentation pour la tâche "${title}". Ce livrable contient la documentation technique rédigée, les diagrammes d'architecture mis à jour et les guides utilisateurs. Les exemples pratiques et les use cases ont été intégrés pour faciliter la prise en main.`,
  analysis: (title) =>
    `Livrable d'analyse pour la tâche "${title}". Ce livrable présente l'étude réalisée, les métriques collectées et les insights dégagés. Les conclusions et recommandations s'appuient sur les données analysées et sont accompagnées de visualisations pour faciliter la prise de décision.`,
  devops: (title) =>
    `Livrable DevOps pour la tâche "${title}". Ce livrable décrit les changements apportés au pipeline CI/CD, la configuration des environnements et les scripts d'automatisation déployés. Les procédures de rollback sont documentées et le monitoring est opérationnel.`,
  default: (title) =>
    `Livrable réalisé dans le cadre de la tâche "${title}". Ce livrable présente les résultats obtenus, les décisions prises et les objectifs atteints lors de l'exécution de cette tâche. Les contraintes rencontrées et les risques identifiés sont également documentés.`
};

function normalizeTaskType(taskType: string): string {
  const t = (taskType || '').toLowerCase().trim();
  if (t.includes('devop')) return 'devops';
  if (t.includes('dev')) return 'development';
  if (t.includes('design') || t.includes('ui') || t.includes('ux')) return 'design';
  if (t.includes('backend') || t.includes('back-end') || t.includes('api')) return 'backend';
  if (t.includes('bug') || t.includes('fix') || t.includes('hotfix')) return 'bug';
  if (t.includes('test') || t.includes('qa')) return 'testing';
  if (t.includes('doc')) return 'documentation';
  if (t.includes('analys') || t.includes('rapport')) return 'analysis';
  return 'default';
}

function noVagueDescriptionValidator(control: AbstractControl): ValidationErrors | null {
  const val = (control.value || '').toLowerCase().trim();
  if (!val) return null;
  const isVague = VAGUE_PHRASES.some(p => val === p || val === p + '.' || val === p + '!');
  return isVague ? { vagueDescription: true } : null;
}

export interface DeliverableFormData {
  mode: 'create' | 'edit' | 'add-version';
  deliverable: any;
  tasks: any[];
  users: any[];
  projects: any[];
  currentUserId: number;
  currentProjectId: string;
  deliverableId?: number;
  hasExistingDeliverable?: boolean;
}

@Component({
  selector: 'app-deliverable-dialog',
  standalone: true,
  templateUrl: './deliverable-dialog.component.html',
  styleUrls: ['./deliverable-dialog.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatCardModule,
    MatBadgeModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDividerModule,
  ],
})
export class DeliverableDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private deliverableService = inject(DeliverableService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  readonly dialogRef = inject(MatDialogRef<DeliverableDialogComponent>);
  readonly data: DeliverableFormData = inject(MAT_DIALOG_DATA);

  form!: FormGroup;
  loading = false;
  uploading = false;
  error = '';
  submitted = false;

  // ── Drag & Drop (same pattern as editfile.component.ts) ──────────────────
  isDragging = signal(false);
  selectedFile = signal<File | null>(null);

  // ── Antivirus scan UI state ─────────────────────────────────────────────
  scanState = signal<'idle' | 'scanning' | 'clean' | 'unverified' | 'rejected'>('idle');
  scanMessage = signal('');
  scanResult: { status?: 'clean' | 'unverified'; virusName?: string | null } = {};

  // ── Smart Description Analyzer ──────────────────────────────────────────
  descriptionScore = signal(0);
  missingKeywords = signal<string[]>([]);
  descriptionSuggestion = signal('');

  constructor() {
    const isVersionMode = this.data.mode === 'add-version';

    this.form = this.fb.group({
      title: [{ value: '', disabled: isVersionMode }, [Validators.required, Validators.minLength(3)]],
      description: [{ value: '', disabled: isVersionMode }, [Validators.required, Validators.minLength(10), noVagueDescriptionValidator]],
      taskId: [{ value: '', disabled: isVersionMode }, Validators.required],
      projectId: [{ value: '', disabled: isVersionMode }, Validators.required],
      submittedById: [{ value: '', disabled: isVersionMode }, Validators.required],
      fileUrl: ['', Validators.required],
      fileType: [''],
      fileSizeKb: [''],
      status: [{ value: 'under_review', disabled: isVersionMode }, Validators.required],
      changeSummary: ['', isVersionMode ? [Validators.required, Validators.minLength(5)] : []],
    });
  }

  ngOnInit() {
    if (this.data.mode === 'add-version') {
      this.form.patchValue({ fileUrl: '', fileType: '', fileSizeKb: '', changeSummary: '' });
    } else {
      const firstTask = this.data.tasks && this.data.tasks.length > 0 ? this.data.tasks[0].id : null;
      this.form.patchValue({
        taskId: firstTask,
        projectId: this.data.currentProjectId,
        submittedById: this.data.currentUserId,
        status: 'under_review',
      });

      // Build initial suggestion and analyze on every description change
      this.buildSuggestion();
      this.form.get('description')!.valueChanges.subscribe(() => this.analyzeDescription());
      this.form.get('taskId')!.valueChanges.subscribe(() => {
        this.buildSuggestion();
        this.analyzeDescription();
      });
    }
  }

  // ── Smart Description Analyzer ──────────────────────────────────────────

  private getTaskKeywords(): string[] {
    const taskId = this.form.get('taskId')?.value?.toString();
    const task = this.data.tasks.find((t: any) => t.id.toString() === taskId);
    if (!task) return [];

    const stopWords = new Set(['dans', 'pour', 'avec', 'cette', 'from', 'that', 'with', 'this', 'task', 'the', 'and']);
    const titleWords = (task.title || '').toLowerCase()
      .split(/\W+/)
      .filter((w: string) => w.length > 3 && !stopWords.has(w));

    const typeKey = normalizeTaskType(task.taskType || '');
    const typeKeywords = KEYWORD_DICTIONARY[typeKey] || KEYWORD_DICTIONARY['default'];

    return [...new Set([...titleWords, ...typeKeywords.slice(0, 12)])];
  }

  private buildSuggestion(): void {
    const taskId = this.form.get('taskId')?.value?.toString();
    const task = this.data.tasks.find((t: any) => t.id.toString() === taskId);
    if (!task) { this.descriptionSuggestion.set(''); return; }

    const title = task.title || '';
    const typeKey = normalizeTaskType(task.taskType || '');
    const template = SUGGESTION_TEMPLATES[typeKey] || SUGGESTION_TEMPLATES['default'];
    this.descriptionSuggestion.set(template(title));
  }

  analyzeDescription(): void {
    const val = (this.form.get('description')?.value || '').trim();
    const lower = val.toLowerCase();

    // Vague check → score 0
    if (VAGUE_PHRASES.some(p => lower === p || lower === p + '.' || lower === p + '!')) {
      this.descriptionScore.set(0);
      this.missingKeywords.set(this.getTaskKeywords());
      return;
    }

    const keywords = this.getTaskKeywords();
    const matched = keywords.filter(k => lower.includes(k));
    const missing = keywords.filter(k => !lower.includes(k));
    this.missingKeywords.set(missing);

    // Score: length (40) + keywords (40) + bonus (20)
    const lengthScore = Math.min(40, Math.floor(val.length / 2));
    const keywordScore = keywords.length > 0 ? Math.round((matched.length / keywords.length) * 40) : 20;
    const bonus = val.length > 60 && matched.length > 0 ? 20 : 0;
    this.descriptionScore.set(Math.min(100, lengthScore + keywordScore + bonus));
  }

  applySuggestion(): void {
    this.form.get('description')!.setValue(this.descriptionSuggestion());
    this.analyzeDescription();
  }

  getScoreColor(): string {
    const s = this.descriptionScore();
    if (s >= 70) return '#27ae60';
    if (s >= 40) return '#f39c12';
    return '#e74c3c';
  }

  getScoreLabel(): string {
    const s = this.descriptionScore();
    if (s >= 70) return 'Bonne description';
    if (s >= 40) return 'Description correcte';
    if (s > 0)   return 'Description faible';
    return 'Description vague — rejetée';
  }

  // ── Drag & Drop handlers ─────────────────────────────────────────────────

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(_event: DragEvent) {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer?.files?.length) {
      this.processFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.processFile(input.files[0]);
  }

  processFile(file: File): void {
    this.selectedFile.set(file);

    const mimeType = file.type;
    const extension = file.name.split('.').pop()?.toUpperCase() || '';
    const fileType = mimeType || extension;
    const fileSizeKb = Math.round((file.size / 1024) * 100) / 100;

    this.form.patchValue({ fileType, fileSizeKb });

    // Upload vers le serveur — backend runs ClamAV scan synchronously
    this.uploading = true;
    this.error = '';
    this.scanState.set('scanning');
    this.scanMessage.set('Analyse antivirus en cours…');
    this.scanResult = {};

    this.deliverableService.uploadFile(file).subscribe({
      next: (res) => {
        this.uploading = false;
        this.form.patchValue({ fileUrl: res.fileUrl });
        this.scanResult = { status: res.scanStatus, virusName: res.virusName };
        if (res.scanStatus === 'unverified') {
          this.scanState.set('unverified');
          this.scanMessage.set('Antivirus indisponible — le fichier sera marqué "non vérifié".');
        } else {
          this.scanState.set('clean');
          this.scanMessage.set('Aucune menace détectée ✓');
        }
      },
      error: (err) => {
        this.uploading = false;
        this.selectedFile.set(null);
        this.form.patchValue({ fileUrl: '' });
        // Backend rejection: HTTP 422 (virus) / 400 (type/size) / 503 (scanner down)
        const backendMsg = err?.error?.message || err?.error?.error || err?.message;
        const isVirus = err?.status === 422 || (typeof backendMsg === 'string' && backendMsg.toLowerCase().includes('virus'));
        if (isVirus) {
          this.scanState.set('rejected');
          const virusMsg = backendMsg || 'Fichier rejeté : virus détecté.';
          this.scanMessage.set(virusMsg);
          this.error = virusMsg;
          this.dialog.open(VirusWarningDialogComponent, {
            data: { message: virusMsg },
            width: '460px',
            disableClose: false,
            panelClass: 'virus-dialog',
          });
        } else {
          this.scanState.set('idle');
          this.scanMessage.set('');
          this.error = backendMsg || 'Erreur lors de l\'upload du fichier. Veuillez réessayer.';
        }
        console.error('Upload error:', err);
      }
    });
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  onSubmit() {
    this.submitted = true;
    this.error = '';

    if (this.uploading) {
      this.error = 'Veuillez attendre la fin de l\'upload du fichier.';
      return;
    }

    if (this.form.invalid) {
      this.error = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    this.loading = true;

    if (this.data.mode === 'add-version' && this.data.deliverableId) {
      const versionRequest: CreateDeliverableVersionRequest = {
        deliverableId: this.data.deliverableId,
        fileUrl: this.form.get('fileUrl')?.value,
        fileSizeKb: this.form.get('fileSizeKb')?.value ? Number(this.form.get('fileSizeKb')?.value) : undefined,
        changeSummary: this.form.get('changeSummary')?.value,
        // forward antivirus verdict so the version row stores the actual scan result
        virusScanStatus: this.scanResult.status,
        virusName: this.scanResult.virusName ?? null,
      };

      this.deliverableService.createVersion(
        this.data.deliverableId,
        this.data.currentUserId,
        versionRequest
      ).subscribe({
        next: () => { this.loading = false; this.dialogRef.close(true); },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || 'Erreur lors de la création de la version.';
        },
      });
    } else {
      const formData = {
        ...this.form.getRawValue(),
        taskId: Number(this.form.get('taskId')?.value),
        submittedById: Number(this.form.get('submittedById')?.value),
        fileSizeKb: this.form.get('fileSizeKb')?.value ? Number(this.form.get('fileSizeKb')?.value) : null,
      };

      this.deliverableService.createDeliverable(formData).subscribe({
        next: () => { this.loading = false; this.dialogRef.close(true); },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || 'Une erreur est survenue. Veuillez réessayer.';
        },
      });
    }
  }

  onCancel() {
    this.dialogRef.close(false);
  }

  getTaskTitle(taskId: string): string {
    const task = this.data.tasks.find(t => t.id.toString() === taskId);
    return task ? task.title : '';
  }

  getUserName(userId: number): string {
    const user = this.data.users.find(u => u.id === userId);
    return user ? user.fullName || user.name : '';
  }
}
