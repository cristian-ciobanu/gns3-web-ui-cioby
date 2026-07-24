import { Injectable } from '@angular/core';

export type DialogPattern = 'confirmation' | 'smallInput' | 'standardForm' | 'largeConfigurator';

export interface DialogConfig {
  panelClass?: string | string[];
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  height?: string;
  maxHeight?: string;
  autoFocus?: boolean;
  disableClose?: boolean;
  [key: string]: unknown;
}

const VIEWPORT_WIDTH = 'calc(100vw - 32px)';
const VIEWPORT_HEIGHT = 'calc(100dvh - 32px)';

const DIALOG_PATTERNS: Record<DialogPattern, DialogConfig> = {
  confirmation: {
    panelClass: ['base-confirmation-dialog-panel', 'dialog-pattern-confirmation'],
    width: `min(480px, ${VIEWPORT_WIDTH})`,
    maxWidth: VIEWPORT_WIDTH,
    maxHeight: VIEWPORT_HEIGHT,
    autoFocus: false,
  },
  smallInput: {
    panelClass: ['base-dialog-panel', 'dialog-pattern-small'],
    width: `min(480px, ${VIEWPORT_WIDTH})`,
    maxWidth: VIEWPORT_WIDTH,
    maxHeight: VIEWPORT_HEIGHT,
  },
  standardForm: {
    panelClass: ['base-dialog-panel', 'dialog-pattern-standard'],
    width: `min(720px, ${VIEWPORT_WIDTH})`,
    maxWidth: VIEWPORT_WIDTH,
    maxHeight: VIEWPORT_HEIGHT,
  },
  largeConfigurator: {
    panelClass: ['base-dialog-panel', 'dialog-pattern-large'],
    width: `min(1120px, ${VIEWPORT_WIDTH})`,
    maxWidth: VIEWPORT_WIDTH,
    maxHeight: VIEWPORT_HEIGHT,
  },
};

@Injectable({ providedIn: 'root' })
export class DialogConfigService {
  private configs: Map<string, DialogConfig> = new Map();

  constructor() {
    this.registerDefaultConfigs();
  }

  private registerDefaultConfigs(): void {
    this.configs.set('base', this.withClasses('standardForm'));
    this.configs.set('smallInput', this.withClasses('smallInput', 'simple-dialog-panel'));
    this.configs.set('standardForm', this.withClasses('standardForm'));
    this.configs.set(
      'largeConfigurator',
      this.withClasses('largeConfigurator', 'configurator-dialog-panel')
    );

    this.configs.set(
      'changeSymbol',
      this.withClasses('largeConfigurator', 'configurator-dialog-panel', 'change-symbol-dialog-panel')
    );
    this.configs.set(
      'templateSymbol',
      this.withClasses('largeConfigurator', 'configurator-dialog-panel', 'change-symbol-dialog-panel')
    );
    this.configs.set(
      'symbolsManager',
      this.withClasses('largeConfigurator', 'configurator-dialog-panel')
    );
    this.configs.set(
      'confirmation',
      this.withClasses('confirmation', 'confirmation-danger-panel')
    );
    this.configs.set(
      'editController',
      this.withClasses('smallInput', 'edit-controller-dialog-panel')
    );
    this.configs.set(
      'addController',
      this.withClasses('smallInput', 'add-controller-dialog-panel')
    );
    this.configs.set(
      'customAdapters',
      this.withClasses('largeConfigurator', 'custom-adapters-dialog-panel')
    );
    this.configs.set(
      'editProject',
      this.withClasses('largeConfigurator', 'configurator-dialog-panel', 'edit-project-dialog-panel')
    );
    this.configs.set(
      'addAce',
      this.withClasses('largeConfigurator', 'configurator-dialog-panel', 'add-ace-dialog-panel')
    );
    this.configs.set(
      'newTemplate',
      this.withClasses('largeConfigurator', 'configurator-dialog-panel', 'new-template-dialog-panel')
    );
    this.configs.set(
      'nodesMenuConfirmation',
      this.withClasses('confirmation', 'confirmation-warning-panel', 'nodes-menu-confirmation-dialog-panel')
    );
    this.configs.set('startCapture', this.withClasses('smallInput', 'simple-dialog-panel'));
    this.configs.set('linkStyleEditor', this.withClasses('smallInput', 'simple-dialog-panel'));
    this.configs.set('packetFilters', this.withClasses('smallInput', 'simple-dialog-panel'));
    this.configs.set('helpDialog', this.withClasses('smallInput', 'simple-dialog-panel'));
  }

  getPatternConfig(pattern: DialogPattern, overrides?: Partial<DialogConfig>): DialogConfig {
    return this.mergeConfig(this.withClasses(pattern), overrides);
  }

  getConfig(name: string): DialogConfig {
    const config = this.configs.get(name);
    if (!config) {
      console.warn(`DialogConfigService: No config found for "${name}", using standard form pattern`);
      return this.withClasses('standardForm');
    }
    return this.cloneConfig(config);
  }

  openConfig(name: string, overrides?: Partial<DialogConfig>): DialogConfig {
    return this.mergeConfig(this.getConfig(name), overrides);
  }

  registerConfig(name: string, config: DialogConfig): void {
    this.configs.set(name, this.cloneConfig(config));
  }

  private withClasses(pattern: DialogPattern, ...additionalClasses: string[]): DialogConfig {
    const config = this.cloneConfig(DIALOG_PATTERNS[pattern]);
    config.panelClass = [...this.toClasses(config.panelClass), ...additionalClasses];
    return config;
  }

  private mergeConfig(baseConfig: DialogConfig, overrides?: Partial<DialogConfig>): DialogConfig {
    if (!overrides) {
      return this.cloneConfig(baseConfig);
    }

    const merged = { ...baseConfig, ...overrides };
    if (overrides.panelClass) {
      merged.panelClass = [
        ...this.toClasses(baseConfig.panelClass),
        ...this.toClasses(overrides.panelClass),
      ].filter((className, index, classes) => classes.indexOf(className) === index);
    }
    return merged;
  }

  private cloneConfig(config: DialogConfig): DialogConfig {
    return {
      ...config,
      panelClass: config.panelClass ? [...this.toClasses(config.panelClass)] : undefined,
    };
  }

  private toClasses(panelClass?: string | string[]): string[] {
    if (!panelClass) {
      return [];
    }
    return Array.isArray(panelClass) ? panelClass : [panelClass];
  }
}
