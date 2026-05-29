import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "vdf_offline_queue";

export interface QueuedAction {
  id: string;
  endpoint: string;
  method: "POST" | "PATCH";
  body: unknown;
  createdAt: string;
}

export async function enqueueAction(action: Omit<QueuedAction, "id" | "createdAt">) {
  const queue = await getQueue();
  queue.push({
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getQueue(): Promise<QueuedAction[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function clearQueue() {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function flushQueue(
  executor: (action: QueuedAction) => Promise<void>,
  onError?: (action: QueuedAction, err: Error) => void
) {
  const queue = await getQueue();
  const failed: QueuedAction[] = [];

  for (const action of queue) {
    try {
      await executor(action);
    } catch (err) {
      failed.push(action);
      onError?.(action, err as Error);
    }
  }

  // Keep only failed items
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
  return { flushed: queue.length - failed.length, failed: failed.length };
}
