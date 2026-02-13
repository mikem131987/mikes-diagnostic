/**
 * Mike's Diagnostic Hardware - License Manager
 * Handles license activation, validation, and feature gating for the Electron app
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

interface LicenseData {
    licenseKey: string;
    email: string;
    tier: 'starter' | 'professional' | 'enterprise';
    status: 'active' | 'expired' | 'invalid';
    expiresAt: string;
    lastValidated: string;
    features: Record<string, boolean>;
}

export class LicenseManager {
    private apiUrl: string;
    private licenseFilePath: string;
    private currentLicense: LicenseData | null = null;

    constructor(apiUrl: string = 'http://localhost:3001') {
        this.apiUrl = apiUrl;
        this.licenseFilePath = path.join(
            app.getPath('userData'),
            'license.json'
        );
    }

    /**
     * Activate a license key
     */
    async activateLicense(licenseKey: string, email: string): Promise<boolean> {
        try {
            const response = await axios.post(
                `${this.apiUrl}/api/licenses/validate`,
                { licenseKey }
            );

            if (!response.data.valid) {
                console.error('License validation failed');
                return false;
            }

            const licenseData: LicenseData = {
                licenseKey,
                email,
                tier: response.data.tier as any,
                status: 'active',
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                lastValidated: new Date().toISOString(),
                features: response.data.features,
            };

            this.saveLicenseLocally(licenseData);
            this.currentLicense = licenseData;

            console.log('✓ License activated:', licenseKey);
            return true;
        } catch (error) {
            console.error('License activation error:', error);
            return false;
        }
    }

    /**
     * Validate current license
     */
    async validateLicense(): Promise<LicenseData | null> {
        // First, check if we have a cached license
        const cachedLicense = this.loadLicenseLocally();
        if (cachedLicense && this.isLicenseValid(cachedLicense)) {
            this.currentLicense = cachedLicense;

            // Try to validate online if expired date is far away
            if (this.shouldRevalidateOnline(cachedLicense)) {
                await this.revalidateWithServer(cachedLicense);
            }

            return cachedLicense;
        }

        return null;
    }

    /**
     * Check if a feature is available for current license
     */
    isFeatureAvailable(featureName: string): boolean {
        if (!this.currentLicense) {
            return false;
        }

        const features = this.currentLicense.features;
        return features[featureName] === true;
    }

    /**
     * Get current license tier
     */
    getCurrentTier(): string | null {
        return this.currentLicense?.tier || null;
    }

    /**
     * Get all features for current tier
     */
    getAvailableFeatures(): Record<string, boolean> {
        return this.currentLicense?.features || {};
    }

    /**
     * Private: Save license to local file
     */
    private saveLicenseLocally(license: LicenseData): void {
        try {
            // Encrypt if needed in production
            fs.writeFileSync(
                this.licenseFilePath,
                JSON.stringify(license, null, 2)
            );
            console.log('License saved locally');
        } catch (error) {
            console.error('Failed to save license:', error);
        }
    }

    /**
     * Private: Load license from local file
     */
    private loadLicenseLocally(): LicenseData | null {
        try {
            if (fs.existsSync(this.licenseFilePath)) {
                const data = fs.readFileSync(this.licenseFilePath, 'utf-8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Failed to load license:', error);
        }
        return null;
    }

    /**
     * Private: Check if license is still valid
     */
    private isLicenseValid(license: LicenseData): boolean {
        if (license.status !== 'active') {
            return false;
        }

        const expiresAt = new Date(license.expiresAt).getTime();
        const now = Date.now();

        return now < expiresAt;
    }

    /**
     * Private: Check if we should revalidate with server
     */
    private shouldRevalidateOnline(license: LicenseData): boolean {
        const lastValidated = new Date(license.lastValidated).getTime();
        const now = Date.now();
        const dayInMs = 24 * 60 * 60 * 1000;

        // Revalidate every 7 days
        return (now - lastValidated) > (7 * dayInMs);
    }

    /**
     * Private: Revalidate with server
     */
    private async revalidateWithServer(license: LicenseData): Promise<void> {
        try {
            const response = await axios.post(
                `${this.apiUrl}/api/licenses/validate`,
                { licenseKey: license.licenseKey }
            );

            if (response.data.valid) {
                license.lastValidated = new Date().toISOString();
                license.features = response.data.features;
                this.saveLicenseLocally(license);
            } else {
                license.status = 'invalid';
                this.saveLicenseLocally(license);
            }
        } catch (error) {
            console.warn('Could not revalidate with server, using cached license');
        }
    }

    /**
     * Clear current license
     */
    clearLicense(): void {
        this.currentLicense = null;
        try {
            if (fs.existsSync(this.licenseFilePath)) {
                fs.unlinkSync(this.licenseFilePath);
            }
        } catch (error) {
            console.error('Failed to clear license:', error);
        }
    }

    /**
     * Get trial period info
     */
    getTrialStatus(): { remaining: number; isTrialUser: boolean } {
        if (!this.currentLicense) {
            return { remaining: 0, isTrialUser: true };
        }

        const expiresAt = new Date(this.currentLicense.expiresAt).getTime();
        const now = Date.now();
        const dayInMs = 24 * 60 * 60 * 1000;

        const remaining = Math.ceil((expiresAt - now) / dayInMs);

        return {
            remaining: Math.max(0, remaining),
            isTrialUser: remaining <= 7,
        };
    }
}

// Export singleton instance
export const licenseManager = new LicenseManager(
    process.env.API_URL || 'https://api.mikesdiagnostic.com'
);
