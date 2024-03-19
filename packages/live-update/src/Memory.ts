import { objectKeys } from "./Helpers";
import { DependencyTracker, Memory, MemoryNode, MemoryTracker } from "./LiveUpdate";


export function forget(memory: Memory, oldTracker: MemoryTracker, newTracker: MemoryTracker)
{
	// we will forget what we did not activly remember
	// alls keys that are in the OLD tracker, but NOT in the NEW tracker.
	console.log(JSON.stringify({ oldTracker, newTracker }));
	const keysToForget = objectKeys(oldTracker).filter(oldKey => !(oldKey in newTracker));
	console.log(JSON.stringify(keysToForget));

	// for each of these keys, call onForget and then remove from storage
	for (const keyToForget of keysToForget)
	{
		const dataToForget = memory[keyToForget];
		if (isMemoryNode(dataToForget))
		{
			console.log(JSON.stringify(memory));
			dataToForget?.onForget?.(dataToForget.item);
			delete memory[keyToForget];
		}
	}
}export function isMemoryNode(node: MemoryNode | MemoryTracker | DependencyTracker): node is MemoryNode
{
	console.log(JSON.stringify(node));
	return typeof node === "object" && node !== null && "item" in node;
}
export function remember<T = unknown>(storage: Memory, key: string, item: T, onForget?: (item: T) => void)
{
	storage[key] = { item, onForget: onForget as (item: unknown) => void } satisfies MemoryNode;
	storage._$tracker[key] = true;
}
export function recognize(storage: Memory, key: string): boolean
{
	return typeof storage === "object" && storage !== null && key in storage;
}
export function recall<T>(storage: Memory, key: string): T | undefined
{
	if (recognize(storage, key))
	{
		// when recalling, we active reenforce memory to remember.
		storage._$tracker[key] = true;

		const node = storage[key];
		if (isMemoryNode(node))
			return node.item as T;
	}

	return undefined;
}

