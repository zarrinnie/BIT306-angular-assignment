import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize, Observable, tap } from 'rxjs';

import { User } from '../models';

/**
 * Administrator-only lookups that do not belong to any one feature.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  private readonly employeeItems = signal<User[]>([]);
  private readonly busyState = signal(false);

  /** Every member of staff with the employee role. */
  readonly employees = this.employeeItems.asReadonly();
  readonly busy = this.busyState.asReadonly();

  /** GET /api/employees — the staff directory. */
  loadEmployees(): Observable<User[]> {
    return this.http
      .get<User[]>('/api/employees')
      .pipe(tap((employees) => this.employeeItems.set(employees)));
  }

  /**
   * POST /api/admin/reset — restores the seeded demonstration data.
   * Useful when the prototype is being shown more than once.
   */
  resetDemoData(): Observable<{ reset: boolean }> {
    this.busyState.set(true);
    return this.http
      .post<{ reset: boolean }>('/api/admin/reset', {})
      .pipe(finalize(() => this.busyState.set(false)));
  }
}
