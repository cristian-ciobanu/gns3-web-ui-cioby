import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ProgressDialogComponent } from './progress-dialog.component';

@Injectable()
export class ProgressDialogService {
  constructor(private dialog: MatDialog) {}

  public open() {
    const ref = this.dialog.open(ProgressDialogComponent, {
      panelClass: ['base-dialog-panel', 'dialog-pattern-small'],
      autoFocus: false,
      disableClose: true,
    });
    return ref;
  }
}
