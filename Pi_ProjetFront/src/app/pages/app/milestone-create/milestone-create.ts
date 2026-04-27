import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MilestoneService } from '../../../services/mileStoneService/milestone.service';
import { ProjectService, Project } from '../../../services/project-service';

@Component({
  selector: 'app-milestone-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './milestone-create.html',
  styleUrl: './milestone-create.css',
})
export class MilestoneCreate implements OnInit {

  milestone = {
    name: '',
    description: '',
    dueDate: '',
    status: 'pending',
    completionPct: 0,
    projectId: ''
  };

  projects: Project[] = [];

  constructor(
    private service: MilestoneService,
    private projectService: ProjectService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.projectService.getAll().subscribe({
      next: (projects) => {
        this.projects = projects;
        if (projects.length > 0) {
          this.milestone.projectId = projects[0].id; // Default to first project
        }
      },
      error: (err) => {
        console.error('Error loading projects', err);
      }
    });
  }

  save() {
    this.service.create(this.milestone).subscribe({
      next: () => {
        alert('Milestone created successfully ✅');
        this.router.navigate(['/app/milestones']);
      },
      error: (err) => {
        console.error(err);
        alert('Error while creating milestone ❌');
      }
    });
  }
}
