import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

export type InterfaceDensity = 'normal' | 'compact';

const INTERFACE_DENSITY_STORAGE_KEY = 'interfaceDensity';
const COMPACT_DENSITY_CLASS = 'gns3-density-compact';

@Injectable({ providedIn: 'root' })
export class InterfaceDensityService {
  private currentDensity: InterfaceDensity;

  constructor(@Inject(DOCUMENT) private document: Document) {
    const savedDensity = localStorage.getItem(INTERFACE_DENSITY_STORAGE_KEY);
    this.currentDensity = savedDensity === 'compact' ? 'compact' : 'normal';
    this.applyDensity(this.currentDensity);
  }

  getDensity(): InterfaceDensity {
    return this.currentDensity;
  }

  setDensity(density: InterfaceDensity): void {
    this.currentDensity = density;
    localStorage.setItem(INTERFACE_DENSITY_STORAGE_KEY, density);
    this.applyDensity(density);
  }

  private applyDensity(density: InterfaceDensity): void {
    this.document.documentElement.classList.toggle(COMPACT_DENSITY_CLASS, density === 'compact');
  }
}
