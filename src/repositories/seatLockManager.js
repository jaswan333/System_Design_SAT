/**
 * SeatLockManager
 * Handles thread-safe / atomic seat reservation locks with TTL (Time-To-Live).
 * Prevents double booking and race conditions during high-concurrency ticket sales.
 */

class SeatLockManager {
  constructor(defaultTtlSeconds = 300) { // 5 minutes default
    this.defaultTtlMs = defaultTtlSeconds * 1000;
    // Map: seatKey (e.g. "eventId:seatId") -> { userId, lockToken, expiresAt, timerId }
    this.locks = new Map();
  }

  _getKey(eventId, seatId) {
    return `${eventId}:${seatId}`;
  }

  /**
   * Attempt to acquire locks for multiple seats atomically.
   * If any seat is already locked or unavailable, all locks are aborted (all-or-nothing).
   * @param {string} eventId
   * @param {string[]} seatIds
   * @param {string} userId
   * @param {Function} checkSeatAvailableFn - Callback (seatId) => boolean
   * @returns {{ success: boolean, lockToken?: string, lockedSeats?: string[], conflictSeat?: string, expiresAt?: number }}
   */
  acquireLocks(eventId, seatIds, userId, checkSeatAvailableFn) {
    const now = Date.now();
    const lockToken = `lock_${Math.random().toString(36).substring(2, 10)}_${now}`;
    const expiresAt = now + this.defaultTtlMs;

    // 1. Verify that all seats can be locked
    for (const seatId of seatIds) {
      const key = this._getKey(eventId, seatId);
      const existingLock = this.locks.get(key);

      if (existingLock && existingLock.expiresAt > now && existingLock.userId !== userId) {
        return {
          success: false,
          conflictSeat: seatId,
          error: `Seat ${seatId} is currently reserved by another customer.`
        };
      }

      if (!checkSeatAvailableFn(seatId)) {
        return {
          success: false,
          conflictSeat: seatId,
          error: `Seat ${seatId} is already booked or unavailable.`
        };
      }
    }

    // 2. Grant locks atomically
    for (const seatId of seatIds) {
      const key = this._getKey(eventId, seatId);
      this.locks.set(key, {
        eventId,
        seatId,
        userId,
        lockToken,
        expiresAt
      });
    }

    return {
      success: true,
      lockToken,
      lockedSeats: seatIds,
      expiresAt,
      ttlSeconds: Math.round(this.defaultTtlMs / 1000)
    };
  }

  /**
   * Check if a specific seat is locked by someone else
   */
  isSeatLocked(eventId, seatId, userId = null, lockToken = null) {
    const key = this._getKey(eventId, seatId);
    const lock = this.locks.get(key);
    if (!lock) return false;
    if (Date.now() > lock.expiresAt) {
      this.locks.delete(key);
      return false;
    }
    if (lockToken && lock.lockToken === lockToken) {
      return false; // Held by caller with matching lock token
    }
    if (userId && lock.userId === userId) {
      return false; // locked by the caller themselves
    }
    return true;
  }

  /**
   * Release locks for given seats
   */
  releaseLocks(eventId, seatIds, lockToken = null) {
    for (const seatId of seatIds) {
      const key = this._getKey(eventId, seatId);
      const lock = this.locks.get(key);
      if (lock) {
        if (!lockToken || lock.lockToken === lockToken) {
          this.locks.delete(key);
        }
      }
    }
  }

  /**
   * Verify whether seats are properly held by this token/user
   */
  validateHold(eventId, seatIds, userId) {
    const now = Date.now();
    for (const seatId of seatIds) {
      const key = this._getKey(eventId, seatId);
      const lock = this.locks.get(key);
      if (!lock) return false;
      if (lock.expiresAt <= now) return false;
      if (userId && lock.userId !== userId) return false;
    }
    return true;
  }

  /**
   * Get all active locks (for debug/monitoring UI)
   */
  getActiveLocks() {
    const now = Date.now();
    const active = [];
    for (const [key, lock] of this.locks.entries()) {
      if (lock.expiresAt > now) {
        active.push({
          key,
          ...lock,
          remainingSeconds: Math.max(0, Math.round((lock.expiresAt - now) / 1000))
        });
      } else {
        this.locks.delete(key);
      }
    }
    return active;
  }
}

module.exports = new SeatLockManager();
