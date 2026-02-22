import type { CustomTask } from '../../../types/task';

export function playPomodoroNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const frequencies = [523.25, 659.25, 783.99];

        frequencies.forEach((freq, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = freq;
            oscillator.type = 'sine';

            const startTime = audioContext.currentTime + index * 0.15;
            const duration = 0.3;

            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        });
    } catch {
        console.log('Audio not supported');
    }
}

export function getQ1Tasks(tasks: CustomTask[]): CustomTask[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tasks
        .filter((task) => {
            if (task.completed || task.status === 'completed') return false;
            if (task.importance !== 'high') return false;
            if (!task.deadline) return false;
            const deadlineDate = new Date(task.deadline);
            deadlineDate.setHours(0, 0, 0, 0);
            return deadlineDate <= today;
        })
        .sort((a, b) => {
            const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
            const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
            return aTime - bTime;
        })
        .slice(0, 3);
}
