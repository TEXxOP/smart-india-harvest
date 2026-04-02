/**
 * Offline Queue Service
 * Queues pending operations (like disease detection) when offline.
 * Automatically processes the queue when connectivity is restored.
 */
import { saveToCache, getFromCache, CACHE_KEYS } from './offlineStorage';
import { isOnline, onReconnect } from './networkService';
import * as FileSystem from 'expo-file-system/legacy';

export interface QueuedItem {
    id: string;
    type: 'disease_detection';
    imageUri: string;
    timestamp: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    result?: any;
    error?: string;
}

type QueueProcessorFn = (item: QueuedItem) => Promise<any>;

let _processor: QueueProcessorFn | null = null;
let _isProcessing = false;
let _unsubReconnect: (() => void) | null = null;

/**
 * Initialize the offline queue with a processor function.
 * The processor is called for each queued item when connectivity returns.
 */
export function initOfflineQueue(processor: QueueProcessorFn): void {
    _processor = processor;

    // Auto-process queue when reconnecting
    if (_unsubReconnect) _unsubReconnect();
    _unsubReconnect = onReconnect(async () => {
        await processQueue();
    });

    // Also process if already online and queue has items
    if (isOnline()) {
        processQueue().catch(console.error);
    }
}

/**
 * Add an item to the offline queue.
 */
export async function enqueue(imageUri: string): Promise<QueuedItem> {
    // Copy image to permanent storage so the URI survives session expiry
    let permanentUri = imageUri;
    try {
        const fileName = `queued_${Date.now()}.jpg`;
        const destPath = `${FileSystem.documentDirectory}offline_queue/${fileName}`;
        // Ensure directory exists
        await FileSystem.makeDirectoryAsync(
            `${FileSystem.documentDirectory}offline_queue/`,
            { intermediates: true }
        );
        await FileSystem.copyAsync({ from: imageUri, to: destPath });
        permanentUri = destPath;
        console.log(`[OfflineQueue] Image copied to permanent storage: ${destPath}`);
    } catch (copyErr) {
        console.warn('[OfflineQueue] Could not copy image, using original URI:', copyErr);
    }

    const item: QueuedItem = {
        id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: 'disease_detection',
        imageUri: permanentUri,
        timestamp: Date.now(),
        status: 'pending',
    };

    const queue = await getQueue();
    queue.push(item);
    await saveToCache(CACHE_KEYS.OFFLINE_QUEUE, queue, 43200);
    console.log(`[OfflineQueue] Enqueued item ${item.id}`);
    return item;
}

/**
 * Get all queued items.
 */
export async function getQueue(): Promise<QueuedItem[]> {
    const cached = await getFromCache<QueuedItem[]>(CACHE_KEYS.OFFLINE_QUEUE, true);
    return cached?.data || [];
}

/**
 * Get pending (unprocessed) items count.
 */
export async function getPendingCount(): Promise<number> {
    const queue = await getQueue();
    return queue.filter(item => item.status === 'pending').length;
}

/**
 * Process all pending items in the queue.
 */
export async function processQueue(): Promise<void> {
    if (_isProcessing || !_processor) return;
    if (!isOnline()) return;

    _isProcessing = true;
    console.log('[OfflineQueue] Processing queue...');

    try {
        const queue = await getQueue();
        const pending = queue.filter(item => item.status === 'pending');

        if (pending.length === 0) {
            console.log('[OfflineQueue] No pending items.');
            _isProcessing = false;
            return;
        }

        console.log(`[OfflineQueue] Processing ${pending.length} items...`);

        for (const item of pending) {
            if (!isOnline()) break; // Stop if we go offline again

            try {
                item.status = 'processing';
                await saveToCache(CACHE_KEYS.OFFLINE_QUEUE, queue, 43200);

                const result = await _processor(item);
                item.status = 'completed';
                item.result = result;
            } catch (error: any) {
                item.status = 'failed';
                item.error = error.message;
                console.error(`[OfflineQueue] Failed to process ${item.id}:`, error);
            }

            await saveToCache(CACHE_KEYS.OFFLINE_QUEUE, queue, 43200);
        }

        console.log('[OfflineQueue] Queue processing complete.');
    } finally {
        _isProcessing = false;
    }
}

/**
 * Remove completed/failed items from queue.
 */
export async function cleanQueue(): Promise<void> {
    const queue = await getQueue();
    const remaining = queue.filter(item => item.status === 'pending' || item.status === 'processing');
    await saveToCache(CACHE_KEYS.OFFLINE_QUEUE, remaining, 43200);
}
