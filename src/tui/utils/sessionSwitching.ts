/**
 * Calculate the next session index with cyclic wrap-around.
 * Returns current index if queue has <= 1 item.
 */
export function getNextSessionIndex(
  currentIndex: number,
  queueLength: number,
): number {
  if (queueLength <= 1) {
    return currentIndex;
  }

  return (currentIndex + 1) % queueLength;
}

/**
 * Calculate the previous session index with cyclic wrap-around.
 * Returns current index if queue has <= 1 item.
 */
export function getPrevSessionIndex(
  currentIndex: number,
  queueLength: number,
): number {
  if (queueLength <= 1) {
    return currentIndex;
  }

  return (currentIndex - 1 + queueLength) % queueLength;
}

/**
 * Validate and return the target index for a direct jump (1-based input).
 * Returns null if the jump is invalid (out of range, same as current).
 */
export function getDirectJumpIndex(
  keyNumber: number,
  currentIndex: number,
  queueLength: number,
): number | null {
  if (keyNumber < 1 || keyNumber > 9) {
    return null;
  }

  const targetIndex = keyNumber - 1;

  if (targetIndex >= queueLength) {
    return null;
  }

  if (targetIndex === currentIndex) {
    return null;
  }

  return targetIndex;
}

/**
 * Calculate the new active session index after removing a session.
 * Handles: removal before active, removal at active, removal after active, queue becoming empty.
 */
export function getAdjustedIndexAfterRemoval(
  removedIndex: number,
  activeIndex: number,
  newQueueLength: number,
): number {
  if (newQueueLength === 0) {
    return 0;
  }

  if (removedIndex < activeIndex) {
    return activeIndex - 1;
  }

  if (removedIndex > activeIndex) {
    return activeIndex;
  }

  if (removedIndex < newQueueLength) {
    return removedIndex;
  }

  return newQueueLength - 1;
}
