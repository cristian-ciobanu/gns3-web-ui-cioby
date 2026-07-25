import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InterfaceDensityService } from './interface-density.service';

describe('InterfaceDensityService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('gns3-density-compact');
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('gns3-density-compact');
  });

  it('uses normal density by default', () => {
    const service = TestBed.inject(InterfaceDensityService);

    expect(service.getDensity()).toBe('normal');
    expect(document.documentElement.classList.contains('gns3-density-compact')).toBe(false);
  });

  it('persists and applies compact density', () => {
    const service = TestBed.inject(InterfaceDensityService);

    service.setDensity('compact');

    expect(localStorage.getItem('interfaceDensity')).toBe('compact');
    expect(document.documentElement.classList.contains('gns3-density-compact')).toBe(true);
  });

  it('restores a saved compact density when initialized', () => {
    localStorage.setItem('interfaceDensity', 'compact');

    const service = TestBed.inject(InterfaceDensityService);

    expect(service.getDensity()).toBe('compact');
    expect(document.documentElement.classList.contains('gns3-density-compact')).toBe(true);
  });

  it('removes the compact class when normal density is selected', () => {
    const service = TestBed.inject(InterfaceDensityService);
    service.setDensity('compact');

    service.setDensity('normal');

    expect(service.getDensity()).toBe('normal');
    expect(document.documentElement.classList.contains('gns3-density-compact')).toBe(false);
  });
});
