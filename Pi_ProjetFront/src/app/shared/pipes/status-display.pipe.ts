import { Pipe, PipeTransform } from '@angular/core';

/**
 * Standardizes status display formatting across the app
 * Converts API status codes to user-friendly labels
 */
@Pipe({
  name: 'statusDisplay',
  standalone: true
})
export class StatusDisplayPipe implements PipeTransform {
  private readonly statusMap: Record<string, string> = {
    'ACTIVE': 'Active',
    'PLANNING': 'Planning',
    'ON_HOLD': 'On Hold',
    'COMPLETED': 'Completed',
    'CANCELLED': 'Cancelled',
    'ARCHIVED': 'Archived',
    'DRAFT': 'Draft',
  };

  transform(status: string | null | undefined): string {
    if (!status) return '';
    const normalized = (status || '').toUpperCase().trim();
    return this.statusMap[normalized] || status;
  }
}
