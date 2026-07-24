import { describe, it, expect, beforeEach } from 'vitest';
import { DialogConfigService, DialogConfig } from './dialog-config.service';

describe('DialogConfigService', () => {
  let service: DialogConfigService;

  beforeEach(() => {
    service = new DialogConfigService();
  });

  describe('Service Creation', () => {
    it('should create the service', () => {
      expect(service).toBeTruthy();
    });

    it('should be instance of DialogConfigService', () => {
      expect(service).toBeInstanceOf(DialogConfigService);
    });
  });

  describe('getConfig', () => {
    it('should return config for changeSymbol', () => {
      const config = service.getConfig('changeSymbol');

      expect(config).toBeDefined();
      expect(config.panelClass).toContain('change-symbol-dialog-panel');
    });

    it('should return config for confirmation', () => {
      const config = service.getConfig('confirmation');

      expect(config).toBeDefined();
      expect(config.panelClass).toContain('confirmation-danger-panel');
    });

    it('should return base config for unknown name', () => {
      const config = service.getConfig('unknownDialog');

      expect(config).toBeDefined();
      expect(config.panelClass).toContain('base-dialog-panel');
    });

    it('should return new object (not same reference)', () => {
      const config1 = service.getConfig('changeSymbol');
      const config2 = service.getConfig('changeSymbol');

      expect(config1).not.toBe(config2);
    });
  });

  describe('openConfig', () => {
    it('should return config with overrides applied', () => {
      const config = service.openConfig('changeSymbol', { width: '500px' });

      expect(config.width).toBe('500px');
      expect(config.panelClass).toContain('change-symbol-dialog-panel');
    });

    it('should return base config when no overrides', () => {
      const config = service.openConfig('confirmation');

      expect(config.panelClass).toContain('confirmation-danger-panel');
    });

    it('should preserve pattern classes when adding a content-specific panel class', () => {
      const config = service.openConfig('standardForm', { panelClass: 'custom-content-panel' });

      expect(config.panelClass).toContain('dialog-pattern-standard');
      expect(config.panelClass).toContain('custom-content-panel');
    });
  });

  describe('Dialog patterns', () => {
    it.each([
      ['confirmation', 'dialog-pattern-confirmation'],
      ['smallInput', 'dialog-pattern-small'],
      ['standardForm', 'dialog-pattern-standard'],
      ['largeConfigurator', 'dialog-pattern-large'],
    ] as const)('should return the responsive %s pattern', (pattern, panelClass) => {
      const config = service.getPatternConfig(pattern);

      expect(config.panelClass).toContain(panelClass);
      expect(config.width).toContain('min(');
      expect(config.maxWidth).toContain('100vw');
      expect(config.maxHeight).toContain('100dvh');
    });

    it('should return independent panel class arrays', () => {
      const first = service.getPatternConfig('smallInput');
      const second = service.getPatternConfig('smallInput');

      (first.panelClass as string[]).push('changed');

      expect(second.panelClass).not.toContain('changed');
    });
  });

  describe('registerConfig', () => {
    it('should register new config', () => {
      const newConfig: DialogConfig = {
        panelClass: ['custom-dialog-panel'],
        width: '300px',
      };

      service.registerConfig('customDialog', newConfig);

      const config = service.getConfig('customDialog');
      expect(config.panelClass).toContain('custom-dialog-panel');
    });

    it('should overwrite existing config', () => {
      const newConfig: DialogConfig = {
        panelClass: ['overwritten-panel'],
      };

      service.registerConfig('confirmation', newConfig);

      const config = service.getConfig('confirmation');
      expect(config.panelClass).toContain('overwritten-panel');
    });
  });

  describe('Predefined Dialogs', () => {
    it('should have changeSymbol config', () => {
      const config = service.getConfig('changeSymbol');
      expect(config.panelClass).toContain('change-symbol-dialog-panel');
    });

    it('should have templateSymbol config', () => {
      const config = service.getConfig('templateSymbol');
      expect(config.panelClass).toContain('change-symbol-dialog-panel');
    });

    it('should have symbolsManager config', () => {
      const config = service.getConfig('symbolsManager');
      expect(config.panelClass).toContain('configurator-dialog-panel');
    });

    it('should have confirmation config', () => {
      const config = service.getConfig('confirmation');
      expect(config.panelClass).toContain('confirmation-danger-panel');
    });

    it('should have editController config', () => {
      const config = service.getConfig('editController');
      expect(config.panelClass).toContain('edit-controller-dialog-panel');
    });

    it('should have addController config', () => {
      const config = service.getConfig('addController');
      expect(config.panelClass).toContain('add-controller-dialog-panel');
    });

    it('should have customAdapters config', () => {
      const config = service.getConfig('customAdapters');
      expect(config.panelClass).toContain('custom-adapters-dialog-panel');
    });

    it('should have editProject config', () => {
      const config = service.getConfig('editProject');
      expect(config.panelClass).toContain('edit-project-dialog-panel');
    });

    it('should have addAce config', () => {
      const config = service.getConfig('addAce');
      expect(config.panelClass).toContain('add-ace-dialog-panel');
    });

    it('should have newTemplate config', () => {
      const config = service.getConfig('newTemplate');
      expect(config.panelClass).toContain('new-template-dialog-panel');
    });

    it('should have nodesMenuConfirmation config', () => {
      const config = service.getConfig('nodesMenuConfirmation');
      expect(config.panelClass).toContain('nodes-menu-confirmation-dialog-panel');
    });

    it('should have startCapture config', () => {
      const config = service.getConfig('startCapture');
      expect(config.panelClass).toContain('simple-dialog-panel');
    });

    it('should have linkStyleEditor config', () => {
      const config = service.getConfig('linkStyleEditor');
      expect(config.panelClass).toContain('simple-dialog-panel');
    });

    it('should have packetFilters config', () => {
      const config = service.getConfig('packetFilters');
      expect(config.panelClass).toContain('simple-dialog-panel');
    });

    it('should have helpDialog config', () => {
      const config = service.getConfig('helpDialog');
      expect(config.panelClass).toContain('simple-dialog-panel');
    });
  });
});
