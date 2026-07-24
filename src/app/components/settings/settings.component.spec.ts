import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { SettingsComponent } from './settings.component';
import { SettingsService, Settings } from '@services/settings.service';
import { ThemeService, PrebuiltTheme } from '@services/theme.service';
import { MapSettingsService } from '@services/mapsettings.service';
import { ToasterService } from '@services/toaster.service';
import { UpdatesService } from '@services/updates.service';
import { ControllerService } from '@services/controller.service';
import { AiChatService } from '@services/ai-chat.service';
import { ConsoleService } from '@services/settings/console.service';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;

  let mockSettingsService: any;
  let mockThemeService: any;
  let mockMapSettingsService: any;
  let mockToasterService: any;
  let mockUpdatesService: any;
  let mockControllerService: any;
  let mockAiChatService: any;
  let mockConsoleService: any;
  let mockActivatedRoute: any;
  let windowOpenSpy: ReturnType<typeof vi.spyOn>;

  const mockSettings: Settings = {
    crash_reports: true,
    console_command: 'telnet',
    anonymous_statistics: false,
  };

  const mockThemes = [
    { key: 'deeppurple-amber' as PrebuiltTheme, label: 'Deep Purple & Amber', type: 'light', primaryColor: '#6750A4' },
    { key: 'pink-bluegrey' as PrebuiltTheme, label: 'Pink & Bluegrey', type: 'dark', primaryColor: '#E91E63' },
  ];

  const mockMapBackgrounds = [
    { key: 'auto' as const, label: 'Follow global theme', background: '', textColor: '', type: 'light' as const },
    {
      key: 'light-1' as const,
      label: 'Cyan Sky',
      background: 'radial-gradient(...)',
      textColor: '#006064',
      type: 'light' as const,
    },
    {
      key: 'dark-1' as const,
      label: 'Deep Cyan',
      background: 'linear-gradient(...)',
      textColor: '#FFFFFF',
      type: 'dark' as const,
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
    windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    mockSettingsService = {
      getAll: vi.fn().mockReturnValue({ ...mockSettings }),
      setAll: vi.fn(),
      setReportsSettings: vi.fn(),
      setStatisticsSettings: vi.fn(),
    };

    mockThemeService = {
      availableThemes: mockThemes,
      availableMapBackgrounds: mockMapBackgrounds,
      savedMapTheme: 'auto',
      getCurrentTheme: vi.fn().mockReturnValue('deeppurple-amber'),
      setTheme: vi.fn(),
      setMapTheme: vi.fn(),
    };

    mockMapSettingsService = {
      integrateLinkLabelsToLinks: true,
      openReadme: false,
      openConsolesInWidget: false,
      toggleIntegrateInterfaceLabels: vi.fn(),
      toggleOpenReadme: vi.fn(),
      toggleOpenConsolesInWidget: vi.fn(),
    };

    mockToasterService = {
      success: vi.fn(),
      error: vi.fn(),
    };

    mockUpdatesService = {};

    mockControllerService = {
      get: vi.fn().mockResolvedValue({
        controller_id: 1,
      }),
    };

    mockAiChatService = {
      reloadSkills: vi.fn().mockReturnValue({
        subscribe: vi.fn().mockImplementation((callbacks) => {
          callbacks.next();
          callbacks.complete();
        }),
      }),
    };

    mockConsoleService = {
      command: 'telnet %h %p',
    };

    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue('1'),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: ThemeService, useValue: mockThemeService },
        { provide: MapSettingsService, useValue: mockMapSettingsService },
        { provide: ToasterService, useValue: mockToasterService },
        { provide: UpdatesService, useValue: mockUpdatesService },
        { provide: ControllerService, useValue: mockControllerService },
        { provide: AiChatService, useValue: mockAiChatService },
        { provide: ConsoleService, useValue: mockConsoleService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    windowOpenSpy?.mockRestore();
  });

  describe('ngOnInit', () => {
    it('should initialize settings from SettingsService', () => {
      expect(mockSettingsService.getAll).toHaveBeenCalled();
      expect(component.settings).toEqual(mockSettings);
    });

    it('should initialize map settings properties', () => {
      expect(component.integrateLinksLabelsToLinks()).toBe(true);
      expect(component.openReadme()).toBe(false);
      expect(component.openConsolesInWidget()).toBe(false);
    });

    it('should initialize theme settings', () => {
      expect(component.mapTheme).toBe('auto');
      expect(component.currentTheme).toBe('deeppurple-amber');
    });

    it('should initialize the console command', () => {
      expect(component.consoleCommand()).toBe('telnet %h %p');
    });

    it('should start in the General category', () => {
      expect(component.activeCategory()).toBe('general');
    });
  });

  describe('category navigation', () => {
    it('should expose all requested settings categories', () => {
      expect(component.categories.map((category) => category.label)).toEqual([
        'General',
        'Appearance',
        'Project workspace',
        'Console',
        'Privacy and diagnostics',
        'Updates',
        'AI',
      ]);
    });

    it('should render visual theme tiles and the global save action', () => {
      component.selectCategory('appearance');
      fixture.detectChanges();

      const element = fixture.nativeElement as HTMLElement;
      expect(element.querySelectorAll('.settings__theme-tile')).toHaveLength(
        mockThemes.length + mockMapBackgrounds.length
      );
      expect(element.textContent).toContain('Save Settings');
    });
  });

  describe('lightThemes getter', () => {
    it('should return only light themes', () => {
      const lightThemes = component.lightThemes;
      expect(lightThemes).toHaveLength(1);
      expect(lightThemes[0].type).toBe('light');
    });
  });

  describe('darkThemes getter', () => {
    it('should return only dark themes', () => {
      const darkThemes = component.darkThemes;
      expect(darkThemes).toHaveLength(1);
      expect(darkThemes[0].type).toBe('dark');
    });
  });

  describe('lightMapBackgrounds getter', () => {
    it('should return only light map backgrounds excluding auto', () => {
      const backgrounds = component.lightMapBackgrounds;
      expect(backgrounds.every((bg) => bg.type === 'light' && bg.key !== 'auto')).toBe(true);
    });
  });

  describe('darkMapBackgrounds getter', () => {
    it('should return only dark map backgrounds', () => {
      const backgrounds = component.darkMapBackgrounds;
      expect(backgrounds.every((bg) => bg.type === 'dark')).toBe(true);
    });
  });

  describe('autoMapBackground getter', () => {
    it('should return the auto map background preset', () => {
      const autoBackground = component.autoMapBackground;
      expect(autoBackground?.key).toBe('auto');
    });
  });

  describe('explicit persistence', () => {
    it('should stage privacy changes until Save is clicked', () => {
      component.setCrashReports(false);
      component.setAnonymousStatistics(true);

      expect(component.crashReports()).toBe(false);
      expect(component.anonymousStatistics()).toBe(true);
      expect(component.isDirty()).toBe(true);
      expect(mockSettingsService.setAll).not.toHaveBeenCalled();
    });

    it('should stage project workspace changes until Save is clicked', () => {
      component.setIntegrateLinkLabels(false);
      component.setOpenReadme(true);

      expect(component.integrateLinksLabelsToLinks()).toBe(false);
      expect(component.openReadme()).toBe(true);
      expect(component.isDirty()).toBe(true);
      expect(mockMapSettingsService.toggleIntegrateInterfaceLabels).not.toHaveBeenCalled();
      expect(mockMapSettingsService.toggleOpenReadme).not.toHaveBeenCalled();
    });

    it('should stage console settings until Save is clicked', () => {
      component.setOpenConsolesInWidget(true);
      component.setConsoleCommand('kitty telnet %h %p');

      expect(component.openConsolesInWidget()).toBe(true);
      expect(component.consoleCommand()).toBe('kitty telnet %h %p');
      expect(mockMapSettingsService.toggleOpenConsolesInWidget).not.toHaveBeenCalled();
      expect(mockConsoleService.command).toBe('telnet %h %p');
    });

    it('should navigate between categories without saving explicitly', () => {
      component.selectCategory('appearance');

      expect(component.activeCategory()).toBe('appearance');
      expect(mockSettingsService.setAll).not.toHaveBeenCalled();
    });

    it('should save the complete current settings snapshot from the global action', () => {
      component.setCrashReports(false);
      component.setAnonymousStatistics(true);
      component.setConsoleCommand('kitty telnet %h %p');
      component.setIntegrateLinkLabels(false);
      component.setOpenReadme(true);
      component.setOpenConsolesInWidget(true);

      component.saveSettings();

      expect(mockSettingsService.setAll).toHaveBeenCalledWith({
        crash_reports: false,
        anonymous_statistics: true,
        console_command: 'kitty telnet %h %p',
      });
      expect(mockMapSettingsService.toggleIntegrateInterfaceLabels).toHaveBeenCalledWith(false);
      expect(mockMapSettingsService.toggleOpenReadme).toHaveBeenCalledWith(true);
      expect(mockMapSettingsService.toggleOpenConsolesInWidget).toHaveBeenCalledWith(true);
      expect(mockConsoleService.command).toBe('kitty telnet %h %p');
      expect(component.isDirty()).toBe(false);
      expect(mockToasterService.success).toHaveBeenCalledWith('Settings saved');
    });

    it('should protect unsaved settings when navigating away', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      component.setCrashReports(false);

      expect(component.canDeactivate()).toBe(false);
      expect(confirmSpy).toHaveBeenCalledWith('You have unsaved settings. Leave without saving them?');

      confirmSpy.mockRestore();
    });
  });

  describe('setTheme', () => {
    it('should call themeService.setTheme with the selected theme', () => {
      const newTheme: PrebuiltTheme = 'pink-bluegrey';
      component.setTheme(newTheme);
      expect(mockThemeService.setTheme).not.toHaveBeenCalled();

      component.saveSettings();

      expect(mockThemeService.setTheme).toHaveBeenCalledWith(newTheme);
    });

    it('should update currentTheme property', () => {
      const newTheme: PrebuiltTheme = 'pink-bluegrey';
      component.setTheme(newTheme);
      expect(component.currentTheme).toBe(newTheme);
    });
  });

  describe('setMapTheme', () => {
    it('should update mapTheme property', () => {
      component.setMapTheme('dark');
      expect(component.mapTheme).toBe('dark');
    });

    it('should apply the map theme only when Save is clicked', () => {
      component.setMapTheme('dark');

      expect(mockThemeService.setMapTheme).not.toHaveBeenCalled();

      component.saveSettings();

      expect(mockThemeService.setMapTheme).toHaveBeenCalledWith('dark');
    });
  });

  describe('checkForUpdates', () => {
    it('should open updates URL in new window', () => {
      component.checkForUpdates();
      expect(windowOpenSpy).toHaveBeenCalledWith('https://gns3.com/software');
    });
  });

  describe('availableThemes and availableMapBackgrounds', () => {
    it('should expose availableThemes from themeService', () => {
      expect(component.availableThemes).toBe(mockThemes);
    });

    it('should expose availableMapBackgrounds from themeService', () => {
      expect(component.availableMapBackgrounds).toBe(mockMapBackgrounds);
    });
  });
});
