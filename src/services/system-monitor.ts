// src/services/system-monitor.ts
import { usePlannerStore } from '../stores/planner-store';
import { activityWatchService } from './activity-watch';

const DISTRACTION_DOMAINS = [
    'xiaohongshu.com',
    'twitter.com',
    'weibo.com',
    'bilibili.com',
    'youtube.com',
    'netflix.com'
];

// Bridge configuration matching mcp.ts
const BRIDGE_PORT = 3002;
const BRIDGE_HOST = '127.0.0.1';
const BRIDGE_URL = `http://${BRIDGE_HOST}:${BRIDGE_PORT}`;
const BRIDGE_TOKEN = localStorage.getItem('mcp_bridge_token') || 'dev-token-secret-123';

class SystemMonitorService {
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private isRunning = false;
    private lastInterventionTime = 0;

    // Only interrupt once every 5 minutes to avoid spamming
    private readonly INTERVENTION_COOLDOWN_MS = 5 * 60 * 1000;

    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        // Check every minute
        this.intervalId = setInterval(() => this.checkSystemContent(), 60 * 1000);
        console.log('[SystemMonitor] Started polling for distractions');
    }

    stop() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.isRunning = false;
        console.log('[SystemMonitor] Stopped polling');
    }

    private async checkSystemContent() {
        try {
            const isAwRunning = await activityWatchService.checkConnection();
            if (!isAwRunning) return;

            const now = new Date();
            // Look at the last minute
            const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

            const webEvents = await activityWatchService.getWebEvents(oneMinuteAgo.toISOString(), now.toISOString());

            let isDistracted = false;
            let distractedUrl = '';

            // Check if user spent significant time (> 20 seconds) on a distraction in the last minute
            for (const ev of webEvents) {
                const url = ev.data.url?.toLowerCase() || '';
                if (ev.duration >= 20 && DISTRACTION_DOMAINS.some(d => url.includes(d))) {
                    isDistracted = true;
                    distractedUrl = url;
                    break;
                }
            }

            if (isDistracted) {
                // Check game state via Planner Store (MonitorEngine sets this)
                const plannerStatus = usePlannerStore.getState().healthMetrics?.overallStatus || 'green';

                // If they are distracted AND their status is yellow or red, intervene!
                if (plannerStatus === 'yellow' || plannerStatus === 'red') {
                    this.triggerIntervention(plannerStatus, distractedUrl);
                }
            }

        } catch (e) {
            console.error('[SystemMonitor] check failed:', e);
        }
    }

    private async triggerIntervention(status: 'yellow' | 'red', url: string) {
        const now = Date.now();
        if (now - this.lastInterventionTime < this.INTERVENTION_COOLDOWN_MS) {
            return; // Cooldown
        }

        this.lastInterventionTime = now;

        // Choose message severity based on status
        const message = status === 'red'
            ? `严重警告：你的主线任务即将逾期或严重落后，请立即关闭网页，回到正轨！`
            : `注意：检测到你在浏览无关网页。你还有任务未完成，Coach AI 建议你重新专注。`;

        console.log('[SystemMonitor] Triggering system intervention...', { status, url });

        try {
            await fetch(`${BRIDGE_URL}/system/intervene`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-bridge-token': BRIDGE_TOKEN
                },
                body: JSON.stringify({
                    message,
                    title: 'Priaxis Coach 强力提醒',
                    buttonText: '我这就去干活'
                })
            });
        } catch (e) {
            console.error('[SystemMonitor] Failed to call bridge /intervene', e);
        }
    }
}

export const systemMonitor = new SystemMonitorService();
