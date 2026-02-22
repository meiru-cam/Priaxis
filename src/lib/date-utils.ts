/**
 * Date and Time Utilities
 * Shared helpers for date validation, deadline status, and formatting.
 */

// Validate and clamp date to prevent crashes when navigating months
// E.g., if user is on 2026-01-31 and navigates to February, clamp to 2026-02-28
export function validateAndClampDate(dateStr: string): string {
    if (!dateStr) return '';

    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return dateStr;

    const [, yearStr, monthStr, dayStr] = match;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;

    // Get the last day of the target month
    const lastDayOfMonth = new Date(year, month, 0).getDate();

    // Clamp day to valid range
    const clampedDay = Math.min(day, lastDayOfMonth);

    return `${year}-${monthStr}-${String(clampedDay).padStart(2, '0')}`;
}

// Calculate deadline status using local date parsing to avoid timezone issues
// Returns: 'red' (expired or <1 day), 'yellow' (<3 days), 'green' (>3 days), null (completed/no deadline)
export function getDeadlineStatus(deadline?: string, questStatus?: string): 'red' | 'yellow' | 'green' | null {
    if (!deadline) return null;
    // Don't show warnings for completed quests
    if (questStatus === 'completed') return null;

    // Parse deadline as local date (YYYY-MM-DD format)
    const [year, month, day] = deadline.split('-').map(Number);
    if (!year || !month || !day) return null;

    const deadlineDate = new Date(year, month - 1, day);
    deadlineDate.setHours(23, 59, 59, 999); // End of deadline day

    const now = new Date();

    // Calculate days remaining
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysRemaining = Math.ceil((deadlineDate.getTime() - now.getTime()) / msPerDay);

    if (daysRemaining < 1) return 'red';      // Expired or today
    if (daysRemaining <= 3) return 'yellow';  // 1-3 days
    return 'green';                            // More than 3 days
}
