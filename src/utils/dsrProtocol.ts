import { toast } from 'sonner';

export interface DSRTrackableTask {
  id?: string;
  title: string;
  category?: string;
  clientName?: string;
}

/**
 * Triggers the native DSR Tracker desktop application via custom OS protocol (dsr-tracker://).
 * Seamlessly transitions from Web Work Allocation Tool to the desktop timer bar.
 */
export function launchDSRTracker(task: DSRTrackableTask): boolean {
  try {
    const params = new URLSearchParams();
    if (task.title) params.set('title', task.title);
    if (task.category) params.set('category', task.category);
    if (task.id) params.set('taskId', task.id);
    if (task.clientName) params.set('client', task.clientName);

    const protocolUrl = `dsr-tracker://track?${params.toString()}`;

    // Show instant user feedback
    toast.success(`⚡ Launching DSR Desktop Tracker`, {
      description: `Starting timer for "${task.title}"`,
      action: {
        label: 'Copy Name',
        onClick: () => {
          navigator.clipboard.writeText(task.title);
          toast.info('Task name copied to clipboard');
        }
      }
    });

    // Execute protocol invocation safely
    const link = document.createElement('a');
    link.href = protocolUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 500);

    return true;
  } catch (err) {
    console.error('Failed to trigger DSR protocol:', err);
    toast.error('Could not launch DSR Tracker desktop protocol');
    return false;
  }
}

/**
 * Opens or focuses the main DSR Tracker desktop dashboard.
 */
export function openDSRTrackerDashboard(): void {
  try {
    window.location.assign('dsr-tracker://open');
    toast.info('Focusing DSR Tracker Desktop Dashboard');
  } catch (err) {
    console.error('Failed to open DSR Tracker:', err);
  }
}

/**
 * Switches the DSR Tracker desktop app into the compact Mini Floating Widget.
 */
export function openDSRTrackerMini(): void {
  try {
    window.location.assign('dsr-tracker://mini');
    toast.info('Switching DSR Tracker to Mini Floating Bar');
  } catch (err) {
    console.error('Failed to open Mini DSR Tracker:', err);
  }
}

/**
 * Forces an immediate offline queue flush and cloud sync on the DSR Tracker desktop app.
 */
export function triggerDSRSync(): void {
  try {
    window.location.assign('dsr-tracker://sync');
    toast.success('Triggering Cloud DSR Synchronization');
  } catch (err) {
    console.error('Failed to trigger DSR Sync:', err);
  }
}

/**
 * Opens the native DSR Tracker Project Notes window focused on a specific project.
 * Supports deep linking with project ID and name.
 */
export function openDSRProjectNotes(projectId?: string, projectName?: string): boolean {
  try {
    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    if (projectName) params.set('name', projectName);
    const protocolUrl = `dsr-tracker://notes?${params.toString()}`;

    toast.success('⚡ Opening DSR Project Notes', {
      description: projectName
        ? `Focusing notes for "${projectName}" in DSR Tracker Desktop`
        : 'Focusing DSR Tracker Desktop Project Notes window',
      action: projectName ? {
        label: 'Copy Name',
        onClick: () => {
          navigator.clipboard.writeText(projectName);
          toast.info('Project name copied');
        }
      } : undefined
    });

    const link = document.createElement('a');
    link.href = protocolUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 500);

    return true;
  } catch (err) {
    console.error('Failed to trigger DSR Project Notes protocol:', err);
    toast.error('Could not launch DSR Tracker Project Notes');
    return false;
  }
}

