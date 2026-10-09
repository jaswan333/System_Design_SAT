/**
 * Live Concurrency & Inventory State Monitor
 * Polls /api/system/state to show real-time locks, TTL timers, and booking records.
 */

const monitorApp = {
  pollInterval: null,

  init() {
    this.refreshState();
    this.pollInterval = setInterval(() => this.refreshState(), 5000);
  },

  async refreshState() {
    const res = await apiClient.getSystemState();
    if (!res.ok || !res.data.success) return;

    const data = res.data.data;

    // Header counter updates
    const headerLocksEl = document.getElementById('header-active-locks-count');
    if (headerLocksEl) headerLocksEl.textContent = data.activeLocksCount;

    // Monitor tab counters
    const monitorLocksEl = document.getElementById('monitor-active-locks-count');
    if (monitorLocksEl) monitorLocksEl.textContent = data.activeLocksCount;

    const monitorBookingsEl = document.getElementById('monitor-total-bookings-count');
    if (monitorBookingsEl) monitorBookingsEl.textContent = data.totalBookingsCount;

    const monitorEventsEl = document.getElementById('monitor-events-count');
    if (monitorEventsEl) monitorEventsEl.textContent = data.events.length;

    // Active Locks Table
    const locksContainer = document.getElementById('monitor-locks-table-container');
    if (locksContainer) {
      if (data.activeLocks.length === 0) {
        locksContainer.innerHTML = `
          <div style="background: rgba(15, 23, 42, 0.4); border: 1px dashed var(--border-subtle); padding: 24px; text-align: center; color: var(--text-dim); border-radius: var(--radius-md);">
            No active temporary seat holds currently. Select seats in Flow Simulator to trigger atomic locks.
          </div>
        `;
      } else {
        locksContainer.innerHTML = `
          <table class="lld-table">
            <thead>
              <tr>
                <th>Seat ID</th>
                <th>Event ID</th>
                <th>Reserved By</th>
                <th>Lock Token</th>
                <th>TTL Expiry</th>
              </tr>
            </thead>
            <tbody>
              ${data.activeLocks.map(lock => `
                <tr>
                  <td><strong style="color: var(--accent-amber);">${lock.seatId}</strong></td>
                  <td><code>${lock.eventId}</code></td>
                  <td>${lock.userId}</td>
                  <td><code style="font-size: 0.75rem;">${lock.lockToken}</code></td>
                  <td><span class="badge-tag" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24;">${lock.remainingSeconds}s remaining</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    }

    // Bookings Audit Trail
    const bookingsContainer = document.getElementById('monitor-bookings-table-container');
    if (bookingsContainer) {
      if (data.recentBookings.length === 0) {
        bookingsContainer.innerHTML = `
          <div style="background: rgba(15, 23, 42, 0.4); border: 1px dashed var(--border-subtle); padding: 24px; text-align: center; color: var(--text-dim); border-radius: var(--radius-md);">
            No bookings made yet in this session. Complete a booking in Tab 1 to see the audit trail.
          </div>
        `;
      } else {
        bookingsContainer.innerHTML = `
          <table class="lld-table">
            <thead>
              <tr>
                <th>Booking Ref</th>
                <th>Event</th>
                <th>Customer</th>
                <th>Seats</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              ${data.recentBookings.map(b => {
                const statusColor = b.status === 'CONFIRMED' ? '#34d399' : '#f43f5e';
                return `
                  <tr>
                    <td><strong>${b.bookingReference}</strong></td>
                    <td>${b.eventId}</td>
                    <td>${b.customer.name} <span style="color: var(--text-dim); font-size: 0.8rem;">(${b.customer.email})</span></td>
                    <td>${b.seats.map(s => s.seatNumber).join(', ')}</td>
                    <td>$${b.totalAmount.toFixed(2)}</td>
                    <td><span style="color: ${statusColor}; font-weight: 700;">${b.status}</span></td>
                    <td style="font-size: 0.8rem; color: var(--text-muted);">${new Date(b.createdAt).toLocaleTimeString()}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;
      }
    }
  }
};

window.monitorApp = monitorApp;
