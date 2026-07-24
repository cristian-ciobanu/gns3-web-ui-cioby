import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageManagerComponent } from './image-manager.component';
import { ImageTableRow, imageDataSource, imageDatabase } from './image-database-file';
import { firstValueFrom, Subject } from 'rxjs';

describe('ImageManagerComponent', () => {
  describe('prototype methods', () => {
    it('should have ngOnInit method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).ngOnInit).toBe('function');
    });

    it('should have ngOnDestroy method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).ngOnDestroy).toBe('function');
    });

    it('should have getImages method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).getImages).toBe('function');
    });

    it('should have onSearchChange method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).onSearchChange).toBe('function');
    });

    it('should have onTypeFilterChange method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).onTypeFilterChange).toBe('function');
    });

    it('should have isHighlighted method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).isHighlighted).toBe('function');
    });

    it('should have isPersistedRow method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).isPersistedRow).toBe('function');
    });

    it('should have hasUploadState method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).hasUploadState).toBe('function');
    });

    it('should have formatImageSize method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).formatImageSize).toBe('function');
    });

    it('should have deleteFile method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).deleteFile).toBe('function');
    });

    it('should have cancelUpload method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).cancelUpload).toBe('function');
    });

    it('should have onRowCheckboxClick method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).onRowCheckboxClick).toBe('function');
    });

    it('should have trackByRow method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).trackByRow).toBe('function');
    });

    it('should have isAllSelected method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).isAllSelected).toBe('function');
    });

    it('should have selectAllImages method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).selectAllImages).toBe('function');
    });

    it('should have unChecked method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).unChecked).toBe('function');
    });

    it('should have allChecked method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).allChecked).toBe('function');
    });

    it('should have hasSelection method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).hasSelection).toBe('function');
    });

    it('should have selectedCount method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).selectedCount).toBe('function');
    });

    it('should have installAllImages method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).installAllImages).toBe('function');
    });

    it('should have pruneImages method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).pruneImages).toBe('function');
    });

    it('should have addImageDialog method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).addImageDialog).toBe('function');
    });

    it('should have deleteAllFiles method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).deleteAllFiles).toBe('function');
    });

    it('should have isRowSelected method', () => {
      expect(typeof (ImageManagerComponent.prototype as any).isRowSelected).toBe('function');
    });

    it('should have image details methods', () => {
      expect(typeof (ImageManagerComponent.prototype as any).openImageDetails).toBe('function');
      expect(typeof (ImageManagerComponent.prototype as any).closeImageDetails).toBe('function');
    });
  });

  describe('image type filtering', () => {
    it('should filter rows by image type independently of text search', async () => {
      const database = new imageDatabase();
      database.addImages([
        {
          rowType: 'image',
          filename: 'router.qcow2',
          path: '/images/QEMU/router.qcow2',
          image_type: 'qemu',
        },
        {
          rowType: 'image',
          filename: 'switch.bin',
          path: '/images/IOS/switch.bin',
          image_type: 'ios',
        },
      ]);
      const dataSource = new imageDataSource(database);
      dataSource.setTypeFilter('qemu');

      const rows = await firstValueFrom(dataSource.connect());

      expect(rows.map((row) => row.filename)).toEqual(['router.qcow2']);
    });

    it('should show all image types when the type filter is reset', async () => {
      const database = new imageDatabase();
      database.addImages([
        { rowType: 'image', filename: 'router.qcow2', image_type: 'qemu' },
        { rowType: 'image', filename: 'switch.bin', image_type: 'ios' },
      ]);
      const dataSource = new imageDataSource(database);
      dataSource.setTypeFilter('all');

      const rows = await firstValueFrom(dataSource.connect());

      expect(rows).toHaveLength(2);
    });
  });

  describe('sorting and pagination', () => {
    it('should paginate the filtered data and update the total row count', async () => {
      const database = new imageDatabase();
      database.addImages([
        { rowType: 'image', filename: 'a.qcow2', image_type: 'qemu' },
        { rowType: 'image', filename: 'b.qcow2', image_type: 'qemu' },
      ]);
      const sort = {
        active: 'filename',
        direction: 'asc',
        sortChange: new Subject(),
      };
      const paginator = {
        pageIndex: 1,
        pageSize: 1,
        length: 0,
        page: new Subject(),
      };
      const dataSource = new imageDataSource(database, sort as any, paginator as any);

      const rows = await firstValueFrom(dataSource.connect());

      expect(rows.map((row) => row.filename)).toEqual(['b.qcow2']);
      expect(paginator.length).toBe(2);
    });
  });

  describe('row interactions', () => {
    let component: ImageManagerComponent;
    let imageRow: ImageTableRow;

    beforeEach(() => {
      component = Object.create(ImageManagerComponent.prototype);
      component.selectedPaths = new Set<string>();
      component.detailsRow = null;
      imageRow = {
        rowType: 'image',
        filename: 'router.qcow2',
        path: '/images/QEMU/router.qcow2',
        image_type: 'qemu',
      };
    });

    it('should use the checkbox exclusively for row selection', () => {
      const event = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        shiftKey: false,
      } as unknown as MouseEvent;

      component.onRowCheckboxClick(event, imageRow);

      expect(component.isRowSelected(imageRow)).toBe(true);
      expect(component.detailsRow).toBeNull();
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('should open and close details without changing row selection', () => {
      component.openImageDetails(imageRow);

      expect(component.detailsRow).toBe(imageRow);
      expect(component.hasSelection()).toBe(false);

      component.closeImageDetails();

      expect(component.detailsRow).toBeNull();
    });

    it('should not open details for an upload progress row', () => {
      component.openImageDetails({
        rowType: 'upload',
        tempId: 'upload-1',
        filename: 'router.qcow2',
      });

      expect(component.detailsRow).toBeNull();
    });
  });
});
