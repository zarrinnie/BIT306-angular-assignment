import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { ActivityDraft, SERVICE_TYPES } from '../../../core/models';
import { ActivityService } from '../../../core/services/activity.service';
import { apiErrorMessage } from '../../../core/services/http-error.util';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Cross-field rule: the registration cut-off has to fall before the activity
 * starts, and the activity has to finish after it begins.
 *
 * Written as a validator on the form group because neither rule can be checked
 * by looking at a single control in isolation.
 */
function scheduleValidator(group: AbstractControl): ValidationErrors | null {
  const activityDate = group.get('activityDate')?.value as string;
  const startTime = group.get('startTime')?.value as string;
  const endTime = group.get('endTime')?.value as string;
  const cutOff = group.get('registrationCutOff')?.value as string;
  const errors: ValidationErrors = {};

  if (startTime && endTime && startTime >= endTime) {
    errors['endBeforeStart'] = true;
  }
  if (activityDate && startTime && cutOff) {
    const starts = new Date(`${activityDate}T${startTime}`).getTime();
    if (new Date(cutOff).getTime() > starts) {
      errors['cutOffAfterStart'] = true;
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Add or edit an NGO activity (Use Case 1).
 *
 * One component serves both operations: with no `:id` in the address it
 * creates, and with one it loads that activity and updates it. The form is
 * built with Angular's reactive forms, so the validation rules sit in
 * TypeScript next to the business rules rather than being scattered through
 * the template.
 */
@Component({
  selector: 'app-activity-form',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activity-form.component.html',
  styleUrl: './activity-form.component.css',
})
export class ActivityFormComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly activityService = inject(ActivityService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Present when editing, absent when creating. */
  readonly id = input<string>();

  readonly serviceTypes = SERVICE_TYPES;
  readonly saving = this.activityService.saving;
  readonly errorMessage = signal<string | null>(null);
  /** Remembers which activity has already been copied into the form. */
  private readonly patchedId = signal<string | null>(null);

  readonly isEditing = computed(() => Boolean(this.id()));
  readonly activity = computed(() =>
    this.activityService.activities().find((item) => item.id === this.id()),
  );

  readonly form = this.formBuilder.nonNullable.group(
    {
      ngoName: ['', [Validators.required, Validators.maxLength(120)]],
      activityTitle: ['', [Validators.required, Validators.maxLength(120)]],
      serviceType: ['Education', [Validators.required]],
      description: ['', [Validators.required, Validators.minLength(30)]],
      location: ['', [Validators.required]],
      activityDate: ['', [Validators.required]],
      startTime: ['09:00', [Validators.required]],
      endTime: ['13:00', [Validators.required]],
      maxEmployees: [20, [Validators.required, Validators.min(1), Validators.max(500)]],
      registrationCutOff: ['', [Validators.required]],
      contactPerson: ['', [Validators.required]],
      contactEmail: ['', [Validators.required, Validators.email]],
      status: ['published', [Validators.required]],
    },
    { validators: scheduleValidator },
  );

  constructor() {
    // When editing, make sure the activity is loaded, then copy it into the form.
    effect(() => {
      const id = this.id();
      if (!id) {
        return;
      }

      const activity = this.activity();
      if (!activity) {
        this.activityService.loadOne(id).subscribe({
          error: () =>
            this.errorMessage.set('That activity could not be loaded. It may have been removed.'),
        });
        return;
      }

      if (this.patchedId() !== id) {
        this.patchedId.set(id);
        this.form.patchValue({
          ngoName: activity.ngoName,
          activityTitle: activity.activityTitle,
          serviceType: activity.serviceType,
          description: activity.description,
          location: activity.location,
          activityDate: activity.activityDate,
          startTime: activity.startTime,
          endTime: activity.endTime,
          maxEmployees: activity.maxEmployees,
          // `datetime-local` inputs expect exactly `YYYY-MM-DDTHH:mm`.
          registrationCutOff: activity.registrationCutOff.slice(0, 16),
          contactPerson: activity.contactPerson,
          contactEmail: activity.contactEmail,
          status: activity.status,
        });
      }
    });
  }

  /** True when a control has been touched and is invalid. */
  showError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return Boolean(control && control.touched && control.invalid);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Please correct the highlighted fields before saving.');
      return;
    }

    this.errorMessage.set(null);
    const draft = this.toDraft();
    const id = this.id();

    const request$ = id ? this.activityService.update(id, draft) : this.activityService.create(draft);

    request$.subscribe({
      next: (activity) => {
        this.toast.success(
          id
            ? `"${activity.activityTitle}" has been updated.`
            : `"${activity.activityTitle}" has been added to the Service Day programme.`,
        );
        void this.router.navigate(['/admin/activities']);
      },
      error: (error: unknown) =>
        this.errorMessage.set(apiErrorMessage(error, 'The activity could not be saved.')),
    });
  }

  cancel(): void {
    void this.router.navigate(['/admin/activities']);
  }

  /** Normalises the form value into the shape the back end expects. */
  private toDraft(): ActivityDraft {
    const value = this.form.getRawValue();
    return {
      ...value,
      serviceType: value.serviceType as ActivityDraft['serviceType'],
      status: value.status as ActivityDraft['status'],
      maxEmployees: Number(value.maxEmployees),
      // A `datetime-local` value has no seconds; the stored format does.
      registrationCutOff:
        value.registrationCutOff.length === 16
          ? `${value.registrationCutOff}:00`
          : value.registrationCutOff,
    };
  }
}
