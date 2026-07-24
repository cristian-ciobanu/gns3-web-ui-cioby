import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DefaultLayoutComponent } from './default-layout.component';
import { ControllerManagementService } from '@services/controller-management.service';
import { ControllerService } from '@services/controller.service';
import { RecentlyOpenedProjectService } from '@services/recentlyOpenedProject.service';
import { ToasterService } from '@services/toaster.service';
import { UserService } from '@services/user.service';
import { ConnectionManagerService } from '@services/connection-manager.service';
import { ProjectService } from '@services/project.service';
import { ProgressService, State } from '../../common/progress/progress.service';
import { Controller } from '@models/controller';
import { Project } from '@models/project';

describe('DefaultLayoutComponent', () => {
  let component: DefaultLayoutComponent;
  let fixture: ComponentFixture<DefaultLayoutComponent>;
  let router: Router;
  let toasterService: { error: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn> };
  let connectionManager: { isConnectedTo: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> };
  let controllerStatusChanged: Subject<any>;
  let recentlyOpenedProjectService: any;
  let projectService: any;

  const controller = {
    id: 1,
    name: 'Local controller',
    username: 'admin',
    authToken: 'token',
  } as Controller;

  const project = {
    project_id: 'project-1',
    name: 'Branch Office Lab',
  } as Project;

  beforeEach(async () => {
    toasterService = {
      error: vi.fn(),
      warning: vi.fn(),
    };
    connectionManager = {
      isConnectedTo: vi.fn().mockReturnValue(true),
      disconnect: vi.fn(),
    };
    controllerStatusChanged = new Subject();

    await TestBed.configureTestingModule({
      imports: [DefaultLayoutComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        {
          provide: RecentlyOpenedProjectService,
          useValue: {
            getcontrollerId: vi.fn().mockReturnValue('1'),
            getProjectId: vi.fn().mockReturnValue('project-1'),
            getcontrollerIdProjectList: vi.fn().mockReturnValue('1'),
            setcontrollerId: vi.fn(),
            setProjectId: vi.fn(),
          },
        },
        {
          provide: ControllerManagementService,
          useValue: {
            controllerStatusChanged,
            stopAll: vi.fn().mockResolvedValue(undefined),
          },
        },
        { provide: ToasterService, useValue: toasterService },
        { provide: UserService, useValue: {} },
        {
          provide: ProgressService,
          useValue: {
            state: new BehaviorSubject(new State(false)),
            activate: vi.fn(),
            deactivate: vi.fn(),
            clear: vi.fn(),
          },
        },
        {
          provide: MatDialog,
          useValue: {
            open: vi.fn(),
          },
        },
        {
          provide: ControllerService,
          useValue: {
            get: vi.fn().mockResolvedValue(controller),
            update: vi.fn().mockResolvedValue(controller),
          },
        },
        {
          provide: ProjectService,
          useValue: {
            get: vi.fn().mockReturnValue(of(project)),
            list: vi.fn().mockReturnValue(of([{ ...project, status: 'opened' }])),
          },
        },
        { provide: ConnectionManagerService, useValue: connectionManager },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DefaultLayoutComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    recentlyOpenedProjectService = TestBed.inject(RecentlyOpenedProjectService);
    projectService = TestBed.inject(ProjectService);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('hides controller resources until a controller is connected', () => {
    component.controllerId = null;
    component.controller = undefined;
    fixture.detectChanges();

    let labels = Array.from(fixture.nativeElement.querySelectorAll('.navigation__label')).map((element: Element) =>
      element.textContent?.trim()
    );

    expect(labels).toEqual(['Controllers']);

    component.controllerId = '1';
    component.controller = controller;
    component.updateResponsiveLayout(1400);
    fixture.detectChanges();

    labels = Array.from(fixture.nativeElement.querySelectorAll('.navigation__label')).map((element: Element) =>
      element.textContent?.trim()
    );

    expect(labels).toEqual([
      'Controllers',
      'Projects',
      'Workspace',
      'Templates',
      'Image manager',
      'Computes',
      'Management',
      'Settings',
      'Help',
    ]);
  });

  it('uses an expanded rail, collapsed rail, and mobile drawer at the configured breakpoints', () => {
    component.updateResponsiveLayout(1400);
    expect(component.isMobile).toBe(false);
    expect(component.isRailCollapsed).toBe(false);

    component.updateResponsiveLayout(1199);
    expect(component.isMobile).toBe(false);
    expect(component.isRailCollapsed).toBe(true);

    component.updateResponsiveLayout(767);
    expect(component.isMobile).toBe(true);
    expect(component.isRailCollapsed).toBe(false);
  });

  it('toggles and closes mobile navigation after a destination is selected', () => {
    component.updateResponsiveLayout(600);
    component.toggleMobileNavigation();
    expect(component.mobileNavigationOpen).toBe(true);

    component.handleNavigation();
    expect(component.mobileNavigationOpen).toBe(false);
  });

  it('marks Workspace active only on a project topology route', () => {
    component.currentRouteUrl = '/controller/1/project/project-1';
    expect(component.isWorkspaceRoute).toBe(true);

    component.currentRouteUrl = '/controller/1/image-manager';
    expect(component.isWorkspaceRoute).toBe(false);

    component.currentRouteUrl = '/controller/1/projects';
    expect(component.isWorkspaceRoute).toBe(false);
  });

  it('opens the remembered project topology from Workspace', () => {
    component.controller = controller;
    component.controllerId = '1';
    component.recentlyOpenedcontrollerId = '1';
    component.recentlyOpenedProjectId = 'project-1';
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.openWorkspace();

    expect(navigateSpy).toHaveBeenCalledWith(['/controller', '1', 'project', 'project-1']);
  });

  it('falls back to an opened project when the remembered project is stale', () => {
    component.controller = controller;
    component.controllerId = '1';
    component.recentlyOpenedcontrollerId = '1';
    component.recentlyOpenedProjectId = 'deleted-project';
    projectService.list.mockReturnValue(of([{ ...project, project_id: 'opened-project', status: 'opened' }]));
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.openWorkspace();

    expect(recentlyOpenedProjectService.setProjectId).toHaveBeenCalledWith('opened-project');
    expect(navigateSpy).toHaveBeenCalledWith(['/controller', '1', 'project', 'opened-project']);
  });

  it('does not expose another controller project as the current project', () => {
    component.controllerId = '2';
    component.controller = { ...controller, id: 2 };
    component.recentlyOpenedcontrollerId = '1';
    component.recentlyOpenedProjectId = 'project-1';

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.project-context')).toBeNull();
  });

  it('resolves an opened project when no workspace is remembered', () => {
    component.controller = controller;
    component.controllerId = '1';
    component.recentlyOpenedcontrollerId = undefined;
    component.recentlyOpenedProjectId = undefined;
    projectService.list.mockReturnValue(of([{ ...project, status: 'opened' }]));
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.openWorkspace();

    expect(recentlyOpenedProjectService.setcontrollerId).toHaveBeenCalledWith('1');
    expect(recentlyOpenedProjectService.setProjectId).toHaveBeenCalledWith('project-1');
    expect(navigateSpy).toHaveBeenCalledWith(['/controller', '1', 'project', 'project-1']);
  });

  it('reports the real controller connection state', () => {
    component.controller = controller;

    expect(component.controllerDisplayName).toBe('Local controller');
    expect(component.isControllerConnected).toBe(true);
    expect(connectionManager.isConnectedTo).toHaveBeenCalledWith(controller);
  });

  it('keeps controller errors in the notifications menu and allows clearing them', () => {
    controllerStatusChanged.next({ status: 'errored', message: 'Controller connection failed' });

    expect(component.shellNotifications).toEqual(['Controller connection failed']);
    expect(toasterService.error).toHaveBeenCalledWith('Controller connection failed');

    component.clearNotifications();
    expect(component.shellNotifications).toEqual([]);
  });
});
