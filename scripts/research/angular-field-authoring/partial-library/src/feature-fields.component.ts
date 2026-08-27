import { Component, ElementRef, ViewChild } from '@angular/core';
import type { AfterViewChecked, OnDestroy } from '@angular/core';
import { FieldType, type FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'research-partial-overlay-field',
  standalone: false,
  template: `
    <button
      type="button"
      role="combobox"
      [attr.aria-label]="props.label"
      [attr.aria-controls]="popupId"
      [attr.aria-expanded]="open"
      (click)="open = true"
    >
      Open choices
    </button>
    @if (open) {
      <div #popup [id]="popupId" role="listbox" [attr.aria-label]="props.label">
        <button type="button" role="option" (click)="select('north')">North</button>
        <button type="button" role="option" (click)="select('south')">South</button>
      </div>
    }
  `,
})
export class PartialOverlayFieldComponent
  extends FieldType<FieldTypeConfig>
  implements AfterViewChecked, OnDestroy
{
  @ViewChild('popup') popup?: ElementRef<HTMLElement>;

  open = false;

  get popupId(): string {
    return `${this.id}-research-popup`;
  }

  ngAfterViewChecked(): void {
    const popup = this.popup?.nativeElement;
    if (popup != null && popup.parentElement !== document.body) {
      document.body.append(popup);
    }
  }

  ngOnDestroy(): void {
    this.popup?.nativeElement.remove();
  }

  select(value: string): void {
    this.formControl.setValue(value);
    this.open = false;
  }
}

@Component({
  selector: 'research-partial-info-panel',
  standalone: false,
  template: '<aside role="status">{{ props.label }}</aside>',
})
export class PartialInfoPanelComponent extends FieldType<FieldTypeConfig> {}
