import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Controller } from '@models/controller';
import { Template } from '@models/template';
import { ControllerService } from '@services/controller.service';
import { TemplateService } from '@services/template.service';
import { ToasterService } from '@services/toaster.service';
import { PreferencesComponent } from './preferences.component';

describe('PreferencesComponent', () => {
  let component: PreferencesComponent;
  let fixture: ComponentFixture<PreferencesComponent>;
  let router: Router;
  let controllerService: { get: ReturnType<typeof vi.fn> };
  let templateService: {
    list: ReturnType<typeof vi.fn>;
    deleteTemplate: ReturnType<typeof vi.fn>;
  };
  let toasterService: {
    error: ReturnType<typeof vi.fn>;
    success: ReturnType<typeof vi.fn>;
  };

  const controller = {
    id: 1,
    name: 'Local controller',
  } as Controller;

  const templates = [
    {
      template_id: 'docker-1',
      name: 'Web terminal',
      template_type: 'docker',
      category: 'guest',
      default_name_format: 'webterm-{0}',
      compute_id: 'local',
      symbol: 'docker_guest.svg',
      tags: ['terminal'],
      image: 'gns3/webterm:latest',
      builtin: false,
    },
    {
      template_id: 'qemu-1',
      name: 'Firewall',
      template_type: 'qemu',
      category: 'firewall',
      default_name_format: 'firewall-{0}',
      compute_id: 'local',
      symbol: 'firewall.svg',
      tags: [],
      builtin: false,
    },
    {
      template_id: 'vpcs-1',
      name: 'Desktop',
      template_type: 'vpcs',
      category: 'guest',
      default_name_format: 'PC-{0}',
      compute_id: 'local',
      symbol: 'vpcs_guest.svg',
      tags: [],
      builtin: false,
    },
    {
      template_id: 'builtin-1',
      name: 'Built-in switch',
      template_type: 'ethernet_switch',
      category: 'switch',
      builtin: true,
    },
  ] as Template[];

  beforeEach(async () => {
    controllerService = {
      get: vi.fn().mockResolvedValue(controller),
    };
    templateService = {
      list: vi.fn().mockReturnValue(of(templates)),
      deleteTemplate: vi.fn().mockReturnValue(of({})),
    };
    toasterService = {
      error: vi.fn(),
      success: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PreferencesComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: vi.fn().mockReturnValue('1'),
              },
            },
          },
        },
        { provide: ControllerService, useValue: controllerService },
        { provide: TemplateService, useValue: templateService },
        { provide: ToasterService, useValue: toasterService },
        {
          provide: MatDialog,
          useValue: {
            open: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PreferencesComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('loads all custom templates with one shared template request', () => {
    expect(controllerService.get).toHaveBeenCalledWith(1);
    expect(templateService.list).toHaveBeenCalledOnce();
    expect(templateService.list).toHaveBeenCalledWith(controller);
    expect(component.templates.map((template) => template.name)).toEqual(['Web terminal', 'Firewall', 'Desktop']);
  });

  it('renders the unified workspace and clearly labelled creation action', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.templates-workspace__title')?.textContent).toContain('Templates');
    expect(element.querySelector('.templates-workspace__create-button')?.textContent).toContain('Create template');
    expect(element.querySelectorAll('.template-row')).toHaveLength(3);
  });

  it('filters templates by search text and type', () => {
    component.searchText = 'fire';
    expect(component.filteredTemplates.map((template) => template.name)).toEqual(['Firewall']);

    component.searchText = '';
    component.selectedType = 'docker';
    expect(component.filteredTemplates.map((template) => template.name)).toEqual(['Web terminal']);
  });

  it('opens an inline inspector when a template is selected', () => {
    const firstRow = fixture.nativeElement.querySelector('.template-row') as HTMLButtonElement;
    firstRow.click();
    fixture.detectChanges();

    const inspector = fixture.nativeElement.querySelector('.template-inspector') as HTMLElement;
    expect(inspector).toBeTruthy();
    expect(inspector.textContent).toContain('Desktop');
    expect(inspector.textContent).toContain('VPCS');
  });

  it('routes advanced editing to the existing type-specific editor', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.selectedTemplate = templates[0];

    component.openAdvancedSettings();

    expect(navigate).toHaveBeenCalledWith([
      '/controller',
      '1',
      'preferences',
      'docker',
      'templates',
      'docker-1',
    ]);
  });

  it('routes creation to the existing type-specific workflow', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.createTemplate('qemu');

    expect(navigate).toHaveBeenCalledWith(['/controller', '1', 'preferences', 'qemu', 'addtemplate']);
  });

  it('keeps copy available only for template types with an existing copy workflow', () => {
    expect(component.canCopy(templates[0])).toBe(true);
    expect(component.canCopy(templates[2])).toBe(false);
  });

  it('clears search and type filters together', () => {
    component.searchText = 'terminal';
    component.selectedType = 'docker';

    component.clearFilters();

    expect(component.searchText).toBe('');
    expect(component.selectedType).toBe('all');
  });
});
