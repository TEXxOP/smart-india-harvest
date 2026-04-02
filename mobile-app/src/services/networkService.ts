/**
 * Network Service
 * Detects connectivity state and provides hooks for online/offline transitions.
 * Triggers sync operations when connection is restored.
 */
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

type ConnectivityCallback = (isConnected: boolean) => void;

let _isConnected: boolean = true;
const _listeners: ConnectivityCallback[] = [];
let _unsubscribe: (() => void) | null = null;

/**
 * Initialize network monitoring. Call once at app startup.
 */
export function initNetworkMonitoring(): void {
    if (_unsubscribe) return; // Already initialized

    _unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
        const wasConnected = _isConnected;
        _isConnected = !!(state.isConnected && state.isInternetReachable !== false);

        // Notify listeners on change
        if (wasConnected !== _isConnected) {
            console.log(`[Network] Connectivity changed: ${_isConnected ? 'ONLINE' : 'OFFLINE'}`);
            _listeners.forEach(cb => cb(_isConnected));
        }
    });
}

/**
 * Check current connectivity status.
 */
export function isOnline(): boolean {
    return _isConnected;
}

/**
 * Perform a one-time connectivity check (async, more accurate).
 */
export async function checkConnectivity(): Promise<boolean> {
    try {
        const state = await NetInfo.fetch();
        _isConnected = !!(state.isConnected && state.isInternetReachable !== false);
        return _isConnected;
    } catch {
        return false;
    }
}

/**
 * Subscribe to connectivity changes.
 * Returns an unsubscribe function.
 */
export function onConnectivityChange(callback: ConnectivityCallback): () => void {
    _listeners.push(callback);
    return () => {
        const index = _listeners.indexOf(callback);
        if (index > -1) _listeners.splice(index, 1);
    };
}

/**
 * Register a sync function to run when connection is restored.
 * Useful for processing offline queues.
 */
export function onReconnect(syncFn: () => Promise<void>): () => void {
    const handler = (isConnected: boolean) => {
        if (isConnected) {
            console.log('[Network] Connection restored — running sync...');
            syncFn().catch(err => console.error('[Network] Sync error:', err));
        }
    };
    return onConnectivityChange(handler);
}

/**
 * Cleanup network monitoring.
 */
export function stopNetworkMonitoring(): void {
    if (_unsubscribe) {
        _unsubscribe();
        _unsubscribe = null;
    }
    _listeners.length = 0;
}
