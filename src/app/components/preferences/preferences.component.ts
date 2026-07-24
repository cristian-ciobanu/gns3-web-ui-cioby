import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Controller } from '@models/controller';
import { Template } from '@models/template';
import { ControllerService } from '@services/controller.service';
import { TemplateService } from '@services/template.service';
import { ToasterService } from '@services/toaster.service';
import { DeleteTemplateComponent } from './common/delete-template-component/delete-template.component';

interface TemplateTypeConfig {
  type: string;
  label: string;
  icon: string;
  description: string;
  detailPath: (templateId: string) => string[];
  createPath: string[];
  copyPath?: (templateId: string) => string[];
}

type InspectableTemplate = Template & {
  image?: string;
  path?: string;
  platform?: string;
  usage?: string;
};

@Component({
  selector: 'app-preferences',
  templateUrl: './preferences.component.html',
  styleUrl: './preferences.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    DeleteTemplateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreferencesComponent implements OnInit {
  public controllerId = '';
  public controller: Controller;
  public templates: InspectableTemplate[] = [];
  public selectedTemplate: InspectableTemplate;
  public searchText = '';
  public selectedType = 'all';
  public loading = true;

  readonly deleteComponent = viewChild(DeleteTemplateComponent);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly controllerService = inject(ControllerService);
  private readonly templateService = inject(TemplateService);
  private readonly toasterService = inject(ToasterService);
  private readonly cd = inject(ChangeDetectorRef);

  private readonly templateTypeConfigs: TemplateTypeConfig[] = [
    {
      type: 'docker',
      label: 'Docker',
      icon: 'dns',
      description: 'Container-based node template',
      detailPath: (templateId) => ['docker', 'templates', templateId],
      createPath: ['docker', 'addtemplate'],
      copyPath: (templateId) => ['docker', 'templates', templateId, 'copy'],
    },
    {
      type: 'qemu',
      label: 'QEMU',
      icon: 'memory',
      description: 'QEMU virtual machine template',
      detailPath: (templateId) => ['qemu', 'templates', templateId],
      createPath: ['qemu', 'addtemplate'],
      copyPath: (templateId) => ['qemu', 'templates', templateId, 'copy'],
    },
    {
      type: 'dynamips',
      label: 'Dynamips',
      icon: 'router',
      description: 'Cisco IOS router template',
      detailPath: (templateId) => ['dynamips', 'templates', templateId],
      createPath: ['dynamips', 'templates', 'addtemplate'],
      copyPath: (templateId) => ['dynamips', 'templates', templateId, 'copy'],
    },
    {
      type: 'iou',
      label: 'IOS on Unix',
      icon: 'settings_ethernet',
      description: 'IOS on Unix device template',
      detailPath: (templateId) => ['iou', 'templates', templateId],
      createPath: ['iou', 'addtemplate'],
      copyPath: (templateId) => ['iou', 'templates', templateId, 'copy'],
    },
    {
      type: 'vpcs',
      label: 'VPCS',
      icon: 'computer',
      description: 'Lightweight virtual PC template',
      detailPath: (templateId) => ['vpcs', 'templates', templateId],
      createPath: ['vpcs', 'addtemplate'],
    },
    {
      type: 'ethernet_hub',
      label: 'Ethernet hub',
      icon: 'hub',
      description: 'Built-in Ethernet hub template',
      detailPath: (templateId) => ['builtin', 'ethernet-hubs', templateId],
      createPath: ['builtin', 'ethernet-hubs', 'addtemplate'],
    },
    {
      type: 'ethernet_switch',
      label: 'Ethernet switch',
      icon: 'device_hub',
      description: 'Built-in Ethernet switch template',
      detailPath: (templateId) => ['builtin', 'ethernet-switches', templateId],
      createPath: ['builtin', 'ethernet-switches', 'addtemplate'],
    },
    {
      type: 'cloud',
      label: 'Cloud',
      icon: 'cloud',
      description: 'Built-in cloud node template',
      detailPath: (templateId) => ['builtin', 'cloud-nodes', templateId],
      createPath: ['builtin', 'cloud-nodes', 'addtemplate'],
    },
  ];

  ngOnInit(): void {
    this.controllerId = this.route.snapshot.paramMap.get('controller_id') || '';
    const numericControllerId = Number.parseInt(this.controllerId, 10);

    if (!this.controllerId || Number.isNaN(numericControllerId)) {
      this.loading = false;
      this.toasterService.error('Invalid controller');
      return;
    }

    this.controllerService.get(numericControllerId).then(
      (controller) => {
        this.controller = controller;
        this.loadTemplates();
      },
      (error) => {
        this.loading = false;
        this.toasterService.error(this.errorMessage(error, 'Failed to load controller'));
        this.cd.markForCheck();
      }
    );
  }

  get filteredTemplates(): InspectableTemplate[] {
    const query = this.searchText.trim().toLowerCase();

    return this.templates
      .filter((template) => this.selectedType === 'all' || template.template_type === this.selectedType)
      .filter((template) => {
        if (!query) return true;

        const searchableText = [
          template.name,
          this.typeLabel(template.template_type),
          template.category,
          ...(template.tags || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(query);
      })
      .sort((first, second) => first.name.localeCompare(second.name));
  }

  get availableTypes(): TemplateTypeConfig[] {
    const available = new Set(this.templates.map((template) => template.template_type));
    const knownTypes = this.templateTypeConfigs.filter((config) => available.has(config.type));
    const unknownTypes = [...available]
      .filter((type) => !this.getTypeConfig(type))
      .sort()
      .map((type) => this.fallbackTypeConfig(type));

    return [...knownTypes, ...unknownTypes];
  }

  get creationTypes(): TemplateTypeConfig[] {
    return this.templateTypeConfigs;
  }

  loadTemplates(): void {
    if (!this.controller) return;

    this.loading = true;
    this.templateService.list(this.controller).subscribe({
      next: (templates) => {
        this.templates = (templates || []).filter((template) => !template.builtin);
        this.reconcileSelection();
        this.loading = false;
        this.cd.markForCheck();
      },
      error: (error) => {
        this.templates = [];
        this.selectedTemplate = undefined;
        this.loading = false;
        this.toasterService.error(this.errorMessage(error, 'Failed to load templates'));
        this.cd.markForCheck();
      },
    });
  }

  selectTemplate(template: InspectableTemplate): void {
    this.selectedTemplate = template;
  }

  closeInspector(): void {
    this.selectedTemplate = undefined;
  }

  clearFilters(): void {
    this.searchText = '';
    this.selectedType = 'all';
  }

  typeLabel(type: string): string {
    return this.getTypeConfig(type)?.label || this.humanize(type);
  }

  typeIcon(type: string): string {
    return this.getTypeConfig(type)?.icon || 'widgets';
  }

  typeDescription(type: string): string {
    return this.getTypeConfig(type)?.description || 'GNS3 node template';
  }

  createTemplate(type: string): void {
    const config = this.getTypeConfig(type);
    if (!config) return;

    this.navigateToTemplatePath(config.createPath);
  }

  openAdvancedSettings(template: InspectableTemplate = this.selectedTemplate): void {
    if (!template) return;

    const config = this.getTypeConfig(template.template_type);
    if (!config) {
      this.toasterService.error(`Editing ${this.typeLabel(template.template_type)} templates is not supported`);
      return;
    }

    this.navigateToTemplatePath(config.detailPath(template.template_id));
  }

  copyTemplate(template: InspectableTemplate = this.selectedTemplate): void {
    if (!template) return;

    const config = this.getTypeConfig(template.template_type);
    if (!config?.copyPath) return;

    this.navigateToTemplatePath(config.copyPath(template.template_id));
  }

  canCopy(template: InspectableTemplate = this.selectedTemplate): boolean {
    return !!template && !!this.getTypeConfig(template.template_type)?.copyPath;
  }

  deleteTemplate(template: InspectableTemplate = this.selectedTemplate): void {
    if (!template) return;

    this.deleteComponent()?.deleteItem(template.name, template.template_id);
  }

  onDeleteEvent(templateId: string): void {
    if (this.selectedTemplate?.template_id === templateId) {
      this.selectedTemplate = undefined;
    }
    this.loadTemplates();
  }

  private reconcileSelection(): void {
    if (!this.selectedTemplate) return;

    this.selectedTemplate = this.templates.find(
      (template) => template.template_id === this.selectedTemplate.template_id
    );
  }

  private getTypeConfig(type: string): TemplateTypeConfig | undefined {
    return this.templateTypeConfigs.find((config) => config.type === type);
  }

  private fallbackTypeConfig(type: string): TemplateTypeConfig {
    return {
      type,
      label: this.humanize(type),
      icon: 'widgets',
      description: 'GNS3 node template',
      detailPath: () => [],
      createPath: [],
    };
  }

  private navigateToTemplatePath(path: string[]): void {
    this.router
      .navigate(['/controller', this.controllerId, 'preferences', ...path])
      .catch(() => this.toasterService.error('Cannot open the selected template destination'));
  }

  private humanize(value: string): string {
    if (!value) return 'Unknown';

    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  private errorMessage(error: any, fallback: string): string {
    return error?.error?.message || error?.message || fallback;
  }
}
