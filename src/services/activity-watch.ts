// src/services/activity-watch.ts
import axios from 'axios';

const AW_BASE_URL = `/api/aw/0`;

export interface AWEvent {
    id: number;
    timestamp: string;
    duration: number; // in seconds
    data: {
        app?: string;
        title?: string;
        url?: string;
        aud?: string;
        status?: string;
    };
}

/**
 * Service to interact with local ActivityWatch server
 */
export const activityWatchService = {
    async getBuckets(): Promise<Record<string, any>> {
        const res = await axios.get(`${AW_BASE_URL}/buckets/?t=${Date.now()}`);
        return (res.data as Record<string, any>) || {};
    },

    /**
     * Check if ActivityWatch is running locally
     */
    async checkConnection(): Promise<boolean> {
        try {
            await axios.get(`${AW_BASE_URL}/info?t=${Date.now()}`, { timeout: 2000 });
            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * Get window events (active app/window title) for a specific time range
     */
    async getWindowEvents(startTime: string, endTime: string): Promise<AWEvent[]> {
        try {
            // Get the hostname to find the correct bucket
            const buckets = await this.getBuckets();

            // Find the window watcher bucket (usually aw-watcher-window_HOSTNAME)
            const windowBucketId = Object.keys(buckets).find(id => id.startsWith('aw-watcher-window_'));

            if (!windowBucketId) return [];

            // Prefer direct bucket events endpoint (more stable across AW query language versions).
            const res = await axios.get(
                `${AW_BASE_URL}/buckets/${encodeURIComponent(windowBucketId)}/events`,
                {
                    params: { start: startTime, end: endTime }
                }
            );
            return Array.isArray(res.data) ? res.data : [];
        } catch (e) {
            console.error('AF Event Fetch Error:', e);
            return [];
        }
    },

    /**
     * Get web events (Chrome urls/titles) for a specific time range
     */
    async getWebEvents(startTime: string, endTime: string): Promise<AWEvent[]> {
        try {
            const buckets = await this.getBuckets();

            // Find the web watcher bucket (usually aw-watcher-web-chrome)
            const webBucketId = Object.keys(buckets).find(id => id.startsWith('aw-watcher-web-'));

            if (!webBucketId) return [];

            // Prefer direct bucket events endpoint (more stable across AW query language versions).
            const res = await axios.get(
                `${AW_BASE_URL}/buckets/${encodeURIComponent(webBucketId)}/events`,
                {
                    params: { start: startTime, end: endTime }
                }
            );
            return Array.isArray(res.data) ? res.data : [];
        } catch (e) {
            console.error('AW Web Event Fetch Error:', e);
            return [];
        }
    },

    /**
     * Get AFK events (idle/active) for a specific time range
     */
    async getAFKEvents(startTime: string, endTime: string): Promise<AWEvent[]> {
        try {
            const buckets = await this.getBuckets();
            const afkBucketId = Object.keys(buckets).find(id => id.startsWith('aw-watcher-afk_'));

            if (!afkBucketId) return [];

            const res = await axios.get(
                `${AW_BASE_URL}/buckets/${encodeURIComponent(afkBucketId)}/events`,
                {
                    params: { start: startTime, end: endTime }
                }
            );
            return Array.isArray(res.data) ? res.data : [];
        } catch (e) {
            console.error('AW AFK Event Fetch Error:', e);
            return [];
        }
    }
};
