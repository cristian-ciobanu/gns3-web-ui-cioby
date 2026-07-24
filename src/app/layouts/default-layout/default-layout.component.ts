import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { ProjectService } from '@services/project.service';
import { filter, Subscription, take } from 'rxjs';
import { ProgressService } from '../../common/progress/progress.service';
import { LoggedUserComponent } from '@components/users/logged-user/logged-user.component';
import { AiProfileDialogComponent } from '@components/user-management/ai-profile-dialog/ai-profile-dialog.component';
import { ApiKeyManagementDialogComponent } from '@components/api-key-management/api-key-management-dialog.component';
import { ApiKeyManagementDialogData } from '@components/api-key-management/api-key-management-dialog.component';
import { Controller } from '@models/controller';
import { Project } from '@models/project';
import { ControllerManagementService } from '@services/controller-management.service';
import { ControllerService } from '@services/controller.service';
import { RecentlyOpenedProjectService } from '@services/recentlyOpenedProject.service';
import { ToasterService } from '@services/toaster.service';
import { UserService } from '@services/user.service';
import { ConnectionManagerService } from '@services/connection-manager.service';
import { ProgressComponent } from '../../common/progress/progress.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-default-layout',
  templateUrl: './default-layout.component.html',
  styleUrl: './default-layout.component.scss',
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatSidenavModule,
    ProgressComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DefaultLayoutComponent implements OnInit, OnDestroy {
  private readonly mobileBreakpoint = 768;
  private readonly collapsedRailBreakpoint = 1200;

  public isInstalledSoftwareAvailable = false;
  public isLoginPage = false;
  public routeSubscription = new Subscription();

  controllerStatusSubscription = new Subscription();
  shouldStopControllersOnClosing = true;
  recentlyOpenedcontrollerId: string;
  recentlyOpenedProjectId: string;
  controllerIdProjectList: string;
  controllerId: string | undefined | null;
  public controller: Controller;
  public project: Project;
  public isMobile = false;
  public isRailCollapsed = false;
  public mobileNavigationOpen = false;
  public shellNotifications: string[] = [];
  public currentRouteUrl = '';

  private projectMapSubscription: Subscription = new Subscription();
  private controllerRequestId = 0;

  private recentlyOpenedProjectService = inject(RecentlyOpenedProjectService);
  private controllerManagement = inject(ControllerManagementService);
  private toasterService = inject(ToasterService);
  private userService = inject(UserService);
  private progressService = inject(ProgressService);
  private dialog = inject(MatDialog);
  public router = inject(Router);
  private route = inject(ActivatedRoute);
  private controllerService = inject(ControllerService);
  private projectService = inject(ProjectService);
  private cd = inject(ChangeDetectorRef);
  private connectionManager = inject(ConnectionManagerService);

  ngOnInit() {
    this.currentRouteUrl = this.router.url;
    this.updateResponsiveLayout(window.innerWidth);
    this.refreshShellContext();

    // Use filter and proper subscription for NavigationEnd
    this.routeSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentRouteUrl = event.urlAfterRedirects || event.url;
        // Recursively traverse the route tree to find controller_id
        this.controllerId = this.getParamFromRoute(this.route, 'controller_id');
        this.refreshShellContext();
        this.getData();
        this.checkIfUserIsLoginPage();
        this.mobileNavigationOpen = false;
        this.cd.markForCheck();
      });

    // Initial load
    this.controllerId = this.getParamFromRoute(this.route, 'controller_id');
    this.getData();

    this.isInstalledSoftwareAvailable = false; // Web application

    // attach to notification stream when any of running local controllers experienced issues
    this.controllerStatusSubscription = this.controllerManagement.controllerStatusChanged.subscribe(
      (controllerStatus) => {
        if (controllerStatus.status === 'errored' || controllerStatus.status === 'stderr') {
          console.error(controllerStatus.message);
          this.shellNotifications = [
            controllerStatus.message,
            ...this.shellNotifications.filter((message) => message !== controllerStatus.message),
          ].slice(0, 10);
          this.toasterService.error(controllerStatus.message);
          this.cd.markForCheck();
        }
      }
    );

    // stop controllers only when in Electron (not applicable for web)
    this.shouldStopControllersOnClosing = false;
  }

  private refreshShellContext(): void {
    this.recentlyOpenedcontrollerId = this.recentlyOpenedProjectService.getcontrollerId();
    this.recentlyOpenedProjectId = this.recentlyOpenedProjectService.getProjectId();
    this.controllerIdProjectList = this.recentlyOpenedProjectService.getcontrollerIdProjectList();
  }

  /**
   * Recursively traverse the route tree to find a parameter value.
   * This is more reliable than just checking children[0] because
   * the route structure may vary depending on which child routes are active.
   */
  private getParamFromRoute(route: ActivatedRoute, paramName: string): string | null {
    let child = route;
    // Traverse the entire route tree
    while (child.firstChild) {
      child = child.firstChild;
      // Check current level params
      const param = child.snapshot.paramMap.get(paramName);
      if (param) return param;
    }
    // If no param found in tree, check root params
    return child.snapshot.paramMap.get(paramName);
  }

  get isWorkspaceRoute(): boolean {
    return /^\/controller\/[^/]+\/project\/[^/?#]+(?:[?#].*)?$/.test(this.currentRouteUrl);
  }

  get isControllerConnected(): boolean {
    return !!this.controller && !!this.connectionManager.isConnectedTo(this.controller);
  }

  get controllerDisplayName(): string {
    return this.controller?.name || 'No controller';
  }

  get currentUserLabel(): string {
    return this.controller?.username || 'User';
  }

  get currentUserInitials(): string {
    const label = this.currentUserLabel.trim();
    if (!label || label === 'User') return 'U';

    return label
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }

  public toggleMobileNavigation(): void {
    this.mobileNavigationOpen = !this.mobileNavigationOpen;
  }

  public handleNavigation(): void {
    if (this.isMobile) {
      this.mobileNavigationOpen = false;
    }
  }

  public openWorkspace(): void {
    this.handleNavigation();

    if (!this.controller || !this.controllerId) {
      this.toasterService.warning('Connect to a controller before opening a workspace');
      return;
    }

    this.projectService
      .list(this.controller)
      .pipe(take(1))
      .subscribe({
        next: (projects) => {
          const rememberedProject =
            this.recentlyOpenedcontrollerId === this.controllerId
              ? projects.find((project) => project.project_id === this.recentlyOpenedProjectId)
              : undefined;
          const workspaceProject = rememberedProject || projects.find((project) => project.status === 'opened');
          if (!workspaceProject) {
            this.toasterService.warning('Open a project before entering the workspace');
            void this.router.navigate(['/controller', this.controllerId, 'projects']);
            return;
          }

          const controllerId = this.controller.id.toString();
          this.recentlyOpenedProjectService.setcontrollerId(controllerId);
          this.recentlyOpenedProjectService.setProjectId(workspaceProject.project_id);
          this.recentlyOpenedcontrollerId = controllerId;
          this.recentlyOpenedProjectId = workspaceProject.project_id;
          this.navigateToWorkspace(controllerId, workspaceProject.project_id);
        },
        error: (err) => {
          const message = err.error?.message || err.message || 'Cannot determine the active project';
          this.toasterService.error(message);
        },
      });
  }

  private navigateToWorkspace(controllerId: string, projectId: string): void {
    this.router
      .navigate(['/controller', controllerId, 'project', projectId])
      .catch(() => this.toasterService.error('Cannot open the project workspace'));
  }

  public clearNotifications(): void {
    this.shellNotifications = [];
    this.cd.markForCheck();
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize(event: Event): void {
    this.updateResponsiveLayout((event.target as Window).innerWidth);
  }

  public updateResponsiveLayout(width: number): void {
    this.isMobile = width < this.mobileBreakpoint;
    this.isRailCollapsed = !this.isMobile && width < this.collapsedRailBreakpoint;

    if (!this.isMobile) {
      this.mobileNavigationOpen = false;
    }

    this.cd.markForCheck();
  }

  openLoggedUserDialog() {
    this.dialog.open(LoggedUserComponent, {
      panelClass: ['base-dialog-panel'],
      autoFocus: false,
      data: { controllerId: +this.controllerId },
    });
  }

  openApiKeyManagementDialog() {
    this.controllerService.get(+this.controllerId).then((controller: Controller) => {
      this.dialog.open(ApiKeyManagementDialogComponent, {
        panelClass: ['base-dialog-panel', 'configurator-dialog-panel'],
        autoFocus: false,
        data: { controller } satisfies ApiKeyManagementDialogData,
      });
    });
  }

  openAiProfileDialog() {
    this.controllerService.get(+this.controllerId).then((controller: Controller) => {
      this.userService.getInformationAboutLoggedUser(controller).subscribe((user) => {
        this.dialog.open(AiProfileDialogComponent, {
          panelClass: ['base-dialog-panel', 'configurator-dialog-panel'],
          autoFocus: false,
          data: { user, controller },
        });
      });
    });
  }

  goToDocumentation() {
    this.controllerService.get(+this.controllerId).then((controller: Controller) => {
      (window as any).open(`${controller.protocol}//${controller.host}:${controller.port}/docs`);
    });
  }

  checkIfUserIsLoginPage() {
    if (this.router.url.includes('login')) {
      this.isLoginPage = true;
    } else {
      this.isLoginPage = false;
    }
  }

  logout() {
    this.controllerService.get(+this.controllerId).then((controller: Controller) => {
      // Clear refresh token
      localStorage.removeItem(`refresh_token_${controller.id}`);

      controller.authToken = null;
      this.controllerService.update(controller).then((val) => {
        // Disconnect WebSocket connection on logout
        this.connectionManager.disconnect();
        this.router.navigate(['/controller', controller.id, 'login']);
      });
    });
  }

  listProjects() {
    this.router
      .navigate(['/controller', this.controllerIdProjectList, 'projects'])
      .catch((error) => this.toasterService.error('Cannot list projects'));
  }

  backToProject() {
    this.openWorkspace();
  }

  @HostListener('window:beforeunload', ['$event'])
  async onBeforeUnload($event) {
    if (!this.shouldStopControllersOnClosing) {
      return;
    }
    $event.preventDefault();
    $event.returnValue = false;
    this.progressService.activate();
    await this.controllerManagement.stopAll();
    this.shouldStopControllersOnClosing = false;
    this.progressService.deactivate();
    window.close();
    return false;
  }
  getData() {
    const requestId = ++this.controllerRequestId;
    this.projectMapSubscription.unsubscribe();
    this.projectMapSubscription = new Subscription();

    if (!this.controllerId) {
      this.controller = undefined;
      this.project = undefined;
      this.cd.markForCheck();
      return;
    }

    const requestedControllerId = this.controllerId;
    this.controllerService
      .get(+requestedControllerId)
      .then((controller: Controller) => {
        if (requestId !== this.controllerRequestId || requestedControllerId !== this.controllerId) {
          return;
        }

        this.controller = controller;
        this.project = undefined;

        if (
          controller &&
          this.recentlyOpenedProjectId &&
          this.recentlyOpenedcontrollerId === controller.id.toString()
        ) {
          this.projectMapSubscription = this.projectService.get(controller, this.recentlyOpenedProjectId).subscribe({
            next: (project) => {
              if (requestId !== this.controllerRequestId) return;
              this.project = project;
              this.cd.markForCheck();
            },
            error: () => {
              if (requestId !== this.controllerRequestId) return;
              this.project = undefined;
              this.cd.markForCheck();
            },
          });
        }

        this.cd.markForCheck();
      })
      .catch(() => {
        if (requestId !== this.controllerRequestId) return;
        this.controller = undefined;
        this.project = undefined;
        this.cd.markForCheck();
      });
  }

  ngOnDestroy() {
    this.controllerStatusSubscription.unsubscribe();
    this.routeSubscription.unsubscribe();
    this.projectMapSubscription.unsubscribe();
  }
}
