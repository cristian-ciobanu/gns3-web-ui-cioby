import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ControllerService } from '@services/controller.service';
import { Image } from '@models/images';
import { Controller } from '@models/controller';
import { ImageManagerService } from '@services/image-manager.service';
import { AddImageDialogComponent } from './add-image-dialog/add-image-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToasterService } from '@services/toaster.service';
import { DeleteAllImageFilesDialogComponent } from './deleteallfiles-dialog/deleteallfiles-dialog.component';
import { ImageTableRow, imageDataSource, imageDatabase } from './image-database-file';
import { QuestionDialogComponent } from '@components/dialogs/question-dialog/question-dialog.component';
import { MatSort, MatSortable, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { Subscription } from 'rxjs';
import { ImageUploadEvent, ImageUploadSessionService } from '@services/image-upload-session.service';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

type ImageManagerView = 'list' | 'grid';

@Component({
  selector: 'app-image-manager',
  templateUrl: './image-manager.component.html',
  styleUrl: './image-manager.component.scss',
  imports: [
    CommonModule,
    RouterModule,
    MatDialogModule,
    MatSortModule,
    MatPaginatorModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTooltipModule,
    MatButtonToggleModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageManagerComponent implements OnInit, AfterViewInit, OnDestroy {
  controller: Controller;
  controllerId: number;
  public version: string;
  dataSource: imageDataSource;
  imageDatabase = new imageDatabase();
  readonly searchText = model('');
  readonly imageTypeFilter = model('all');
  readonly imageTypes = signal<string[]>([]);
  readonly viewMode = signal<ImageManagerView>(
    localStorage.getItem('imageManagerView') === 'grid' ? 'grid' : 'list'
  );
  readonly visibleRows = signal<ImageTableRow[]>([]);
  selectedPaths = new Set<string>();
  detailsRow: ImageTableRow | null = null;
  private images: Image[] = [];
  private uploadRows = new Map<string, ImageTableRow>();
  private uploadEventsSubscription: Subscription;
  private dataRowsSubscription: Subscription;
  private refreshAfterUploadTimer: ReturnType<typeof setTimeout>;
  private displayedRows: ImageTableRow[] = [];
  private lastSelectedPath: string | null = null;
  highlightedFilename: string | null = null;
  private highlightTimer: ReturnType<typeof setTimeout>;

  // Pagination properties
  pageSizeOptions: number[] = [5, 10, 25, 50, 100];
  defaultPageSize = 10;

  readonly displayedColumns = signal(['select', 'filename', 'image_type', 'image_size', 'created_at', 'actions']);
  readonly sort = viewChild.required(MatSort);
  readonly paginator = viewChild.required(MatPaginator);

  private imageService = inject(ImageManagerService);
  private route = inject(ActivatedRoute);
  private controllerService = inject(ControllerService);
  private dialog = inject(MatDialog);
  private toasterService = inject(ToasterService);
  private imageUploadSessionService = inject(ImageUploadSessionService);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  constructor() {}

  ngOnInit(): void {
    this.controllerId = parseInt(this.route.snapshot.paramMap.get('controller_id'), 10);
    this.uploadEventsSubscription = this.imageUploadSessionService.events$.subscribe((event: ImageUploadEvent) => {
      this.onUploadEvent(event);
    });

    this.route.queryParams.subscribe((params) => {
      if (params['highlight']) {
        this.flashRow(params['highlight']);
        this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
      }
    });

    this.controllerService.get(this.controllerId).then(
      (controller: Controller) => {
        this.controller = controller;
        if (controller.authToken) {
          this.getImages();
        }
      },
      (err) => {
        const message = err.error?.message || err.message || 'Failed to load controller';
        this.toasterService.error(message);
        this.cd.markForCheck();
      }
    );
  }

  ngAfterViewInit(): void {
    const sort = this.sort();
    const paginator = this.paginator();
    sort.sort(<MatSortable>{
      id: 'filename',
      start: 'asc',
    });
    paginator.pageIndex = 0;
    paginator.pageSize = this.defaultPageSize;

    this.dataSource = new imageDataSource(this.imageDatabase, sort, paginator);
    this.dataRowsSubscription = this.dataSource.connect().subscribe((rows: ImageTableRow[]) => {
      this.displayedRows = rows || [];
      this.visibleRows.set(rows || []);
      this.cd.markForCheck();
    });
    this.cd.detectChanges();
  }

  ngOnDestroy(): void {
    if (this.uploadEventsSubscription) {
      this.uploadEventsSubscription.unsubscribe();
    }
    if (this.dataRowsSubscription) {
      this.dataRowsSubscription.unsubscribe();
    }
    if (this.refreshAfterUploadTimer) {
      clearTimeout(this.refreshAfterUploadTimer);
    }
    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer);
    }
  }

  getImages() {
    this.imageService.getImages(this.controller).subscribe({
      next: (images: Image[]) => {
        this.images = images || [];
        this.syncDetailsRow();
        this.syncUploadedRowsWithPersistedData();
        this.refreshTableRows();
        this.cd.markForCheck();
      },
      error: (err) => {
        const message = err.error?.message || err.message || 'Failed to get images';
        this.toasterService.error(message);
        this.cd.markForCheck();
      },
    });
  }

  onSearchChange(value: string) {
    this.searchText.set(value);
    if (this.dataSource) {
      this.dataSource.setFilter(value);
      // Reset to first page when searching
      const paginator = this.paginator();
      if (paginator) {
        paginator.pageIndex = 0;
      }
    }
  }

  onTypeFilterChange(value: string) {
    this.imageTypeFilter.set(value || 'all');
    if (this.dataSource) {
      this.dataSource.setTypeFilter(this.imageTypeFilter());
      const paginator = this.paginator();
      if (paginator) {
        paginator.pageIndex = 0;
      }
    }
  }

  setViewMode(viewMode: ImageManagerView): void {
    this.viewMode.set(viewMode);
    localStorage.setItem('imageManagerView', viewMode);
  }

  imageTypeIcon(row: ImageTableRow): string {
    const type = String(row.image_type || '').toLowerCase();
    if (type.includes('qemu')) return 'memory';
    if (type.includes('docker')) return 'deployed_code';
    if (type.includes('iou') || type.includes('ios')) return 'router';
    return 'hard_drive';
  }

  imageExtension(row: ImageTableRow): string {
    const filename = row.filename || '';
    const extension = filename.includes('.') ? filename.split('.').pop() : '';
    return extension ? extension.toUpperCase() : 'IMAGE';
  }

  isHighlighted(row: ImageTableRow): boolean {
    return !!this.highlightedFilename && row.filename === this.highlightedFilename;
  }

  private flashRow(filename: string) {
    if (this.highlightTimer) clearTimeout(this.highlightTimer);
    this.highlightedFilename = filename;
    this.highlightTimer = setTimeout(() => {
      this.highlightedFilename = null;
    }, 2000);
  }

  isPersistedRow(row: ImageTableRow): boolean {
    return row && row.rowType === 'image';
  }

  hasUploadState(row: ImageTableRow): boolean {
    return row && row.rowType === 'upload';
  }

  formatImageSize(row: ImageTableRow): string {
    const size = Number(row.image_size || 0);
    if (!size) {
      return '0 MB';
    }
    return `${(size / 1000000).toFixed(2)} MB`;
  }

  deleteFile(path: string) {
    const dialogRef = this.dialog.open(QuestionDialogComponent, {
      panelClass: ['base-confirmation-dialog-panel', 'confirmation-danger-panel', 'question-dialog-panel'],
      data: { title: 'Delete image', question: 'Are you sure you want to delete this image?' },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (!result) {
        return;
      }

      this.imageService.deleteFile(this.controller, path).subscribe({
        next: () => {
          this.selectedPaths.delete(path);
          if (this.detailsRow?.path === path) {
            this.closeImageDetails();
          }
          this.getImages();
          this.toasterService.success('File deleted');
          this.cd.markForCheck();
        },
        error: (err) => {
          const message = err.error?.message || err.message || 'Failed to delete file';
          this.toasterService.error(message);
          this.getImages();
          this.cd.markForCheck();
        },
      });
    });
  }

  cancelUpload(row: ImageTableRow) {
    if (!row || !row.tempId) {
      return;
    }
    this.imageUploadSessionService.requestCancel(row.tempId);
    this.toasterService.warning('Image file uploading canceled');
  }

  openImageDetails(row: ImageTableRow): void {
    if (!this.isPersistedRow(row)) {
      return;
    }
    this.detailsRow = row;
  }

  closeImageDetails(): void {
    this.detailsRow = null;
  }

  onRowCheckboxClick(event: MouseEvent, row: ImageTableRow) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.isPersistedRow(row)) {
      return;
    }

    const isSelected = this.isRowSelected(row);
    const shouldSelect = !isSelected;

    if (event.shiftKey && this.lastSelectedPath) {
      const selectedRange = this.selectRowRange(this.lastSelectedPath, row.path, shouldSelect);
      if (!selectedRange) {
        this.toggleRowSelection(row, shouldSelect);
      }
    } else {
      this.toggleRowSelection(row, shouldSelect);
    }

    this.lastSelectedPath = row.path || null;
  }

  trackByRow(index: number, row: ImageTableRow): string {
    return row.tempId || row.path || `${row.filename}-${index}`;
  }

  isAllSelected() {
    const selectablePaths = new Set(this.getSelectableRows().map((row) => row.path));
    const numSelected = Array.from(this.selectedPaths).filter((path) => selectablePaths.has(path)).length;
    const numRows = selectablePaths.size;
    if (numRows === 0) {
      return false;
    }
    return numSelected === numRows;
  }

  selectAllImages() {
    this.isAllSelected() ? this.unChecked() : this.allChecked();
  }

  unChecked() {
    this.selectedPaths.clear();
    this.lastSelectedPath = null;
  }

  allChecked() {
    this.getSelectableRows().forEach((row) => {
      if (row.path) {
        this.selectedPaths.add(row.path);
      }
    });
  }

  hasSelection(): boolean {
    return this.selectedPaths.size > 0;
  }

  selectedCount(): number {
    return this.selectedPaths.size;
  }

  installAllImages() {
    const dialogRef = this.dialog.open(QuestionDialogComponent, {
      panelClass: ['base-confirmation-dialog-panel', 'confirmation-info-panel', 'question-dialog-panel'],
      data: {
        title: 'Install all images',
        question: 'This will attempt to automatically create templates based on image checksums. Continue?',
      },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.imageService.installImages(this.controller).subscribe({
          next: () => {
            this.toasterService.success('Images installed');
            this.cd.markForCheck();
          },
          error: (err) => {
            const message = err.error?.message || err.message || 'Failed to install images';
            this.toasterService.error(message);
            this.cd.markForCheck();
          },
        });
      }
    });
  }

  pruneImages() {
    const dialogRef = this.dialog.open(QuestionDialogComponent, {
      panelClass: ['base-confirmation-dialog-panel', 'confirmation-danger-panel', 'question-dialog-panel'],
      data: { title: 'Prune images', question: 'Delete all images not used by a template? This cannot be reverted.' },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.imageService.pruneImages(this.controller).subscribe({
          next: () => {
            this.getImages();
            this.unChecked();
            this.toasterService.success('Images pruned');
            this.cd.markForCheck();
          },
          error: (err) => {
            const message = err.error?.message || err.message || 'Failed to prune images';
            this.toasterService.error(message);
            this.getImages();
            this.unChecked();
            this.cd.markForCheck();
          },
        });
      }
    });
  }

  public addImageDialog() {
    const dialogRef = this.dialog.open(AddImageDialogComponent, {
      panelClass: ['base-dialog-panel', 'add-image-dialog-panel'],
      autoFocus: false,
      data: this.controller,
    });

    dialogRef.afterClosed().subscribe(() => {
      this.getImages();
      this.unChecked();
    });
  }

  deleteAllFiles() {
    const selectedRows = this.getSelectedRows();
    const selectedPaths = new Set(selectedRows.map((row) => row.path));
    const dialogRef = this.dialog.open(DeleteAllImageFilesDialogComponent, {
      panelClass: ['base-confirmation-dialog-panel', 'confirmation-danger-panel', 'delete-all-images-dialog-panel'],
      autoFocus: false,
      disableClose: true,
      data: {
        controller: this.controller,
        deleteFilesPaths: selectedRows,
      },
    });

    dialogRef.afterClosed().subscribe((isAllfilesdeleted: boolean) => {
      if (isAllfilesdeleted) {
        this.unChecked();
        if (this.detailsRow?.path && selectedPaths.has(this.detailsRow.path)) {
          this.closeImageDetails();
        }
        this.getImages();
        this.toasterService.success('Selected images deleted');
      } else {
        this.unChecked();
        this.getImages();
        return false;
      }
    });
  }

  private onUploadEvent(event: ImageUploadEvent) {
    if (!event) {
      return;
    }

    if (event.status === 'canceled') {
      this.uploadRows.delete(event.tempId);
      this.refreshTableRows();
      return;
    }

    const existing = this.uploadRows.get(event.tempId);
    const uploadRow: ImageTableRow = {
      rowType: 'upload',
      tempId: event.tempId,
      filename: event.filename,
      image_type: event.image_type,
      image_size: event.image_size,
      uploadProgress: event.progress,
      uploadStatus: event.status,
      errorMessage: event.errorMessage,
      created_at: '',
      updated_at: '',
    };

    this.uploadRows.set(event.tempId, { ...(existing || {}), ...uploadRow });
    this.refreshTableRows();

    if (event.status === 'uploaded') {
      this.scheduleImagesRefresh();
    }
  }

  private scheduleImagesRefresh() {
    if (this.refreshAfterUploadTimer) {
      clearTimeout(this.refreshAfterUploadTimer);
    }

    this.refreshAfterUploadTimer = setTimeout(() => {
      this.getImages();
    }, 300);
  }

  private refreshTableRows() {
    const persistedRows = this.images.map((image: Image) => ({ ...image, rowType: 'image' as const }));
    const uploadingRows = Array.from(this.uploadRows.values());
    const imageTypes = Array.from(
      new Set(
        [...uploadingRows, ...persistedRows]
          .map((row) => String(row.image_type || '').trim())
          .filter((imageType) => !!imageType)
      )
    ).sort((first, second) => first.localeCompare(second));
    this.imageTypes.set(imageTypes);
    if (this.imageTypeFilter() !== 'all' && !imageTypes.includes(this.imageTypeFilter())) {
      this.imageTypeFilter.set('all');
      this.dataSource?.setTypeFilter('all');
    }
    this.removeInvalidSelections(persistedRows);
    this.imageDatabase.addImages([...uploadingRows, ...persistedRows]);
  }

  private removeInvalidSelections(persistedRows: ImageTableRow[]) {
    const persistedPaths = new Set(persistedRows.map((row) => row.path).filter((path) => !!path));
    Array.from(this.selectedPaths).forEach((path) => {
      if (!persistedPaths.has(path)) {
        this.selectedPaths.delete(path);
      }
    });
    if (this.lastSelectedPath && !persistedRows.some((row) => row.path === this.lastSelectedPath)) {
      this.lastSelectedPath = null;
    }
  }

  private syncUploadedRowsWithPersistedData() {
    const persistedNames = new Set(this.images.map((image) => image.filename));
    this.uploadRows.forEach((row, key) => {
      if (row.uploadStatus === 'uploaded' && persistedNames.has(row.filename)) {
        this.uploadRows.delete(key);
      }
    });
  }

  private syncDetailsRow() {
    if (!this.detailsRow?.path) {
      return;
    }

    const updatedImage = this.images.find((image) => image.path === this.detailsRow.path);
    this.detailsRow = updatedImage ? { ...updatedImage, rowType: 'image' } : null;
  }

  private getSelectableRows(): ImageTableRow[] {
    return this.imageDatabase.data.filter((row) => this.isPersistedRow(row));
  }

  private getVisibleSelectableRows(): ImageTableRow[] {
    const rows = this.displayedRows && this.displayedRows.length ? this.displayedRows : this.getSelectableRows();
    return rows.filter((row) => this.isPersistedRow(row));
  }

  private selectRowRange(fromPath: string, toPath: string, shouldSelect: boolean): boolean {
    const visibleRows = this.getVisibleSelectableRows();
    const fromIndex = visibleRows.findIndex((row) => row.path === fromPath);
    const toIndex = visibleRows.findIndex((row) => row.path === toPath);

    if (fromIndex < 0 || toIndex < 0) {
      return false;
    }

    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    visibleRows.slice(start, end + 1).forEach((row) => this.toggleRowSelection(row, shouldSelect));
    return true;
  }

  private toggleRowSelection(row: ImageTableRow, shouldSelect: boolean) {
    if (shouldSelect) {
      this.selectRow(row);
      return;
    }
    this.deselectRow(row);
  }

  isRowSelected(row: ImageTableRow): boolean {
    if (!row || !row.path) {
      return false;
    }
    return this.selectedPaths.has(row.path);
  }

  private selectRow(row: ImageTableRow) {
    if (!row || !row.path) {
      return;
    }
    this.selectedPaths.add(row.path);
  }

  private deselectRow(row: ImageTableRow) {
    if (!row || !row.path) {
      return;
    }
    this.selectedPaths.delete(row.path);
  }

  private getSelectedRows(): ImageTableRow[] {
    const selectableRows = this.getSelectableRows();
    return selectableRows.filter((row) => row.path && this.selectedPaths.has(row.path));
  }
}
