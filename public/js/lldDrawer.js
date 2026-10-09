/**
 * LLD Architecture & REST API Drawer Controller
 * Handles the slide-over engineering panel showcasing the Round 2 specifications.
 */

const lldDrawer = {
  endpoints: [
    {
      id: 'ep-search',
      task: 'Task 1: Search Event',
      method: 'GET',
      uri: '/api/events?query=Symphony&city=ALL&category=ALL',
      description: 'Search catalog with query keywords, city, and category filters.',
      body: null
    },
    {
      id: 'ep-details',
      task: 'Task 1: Get Event Details',
      method: 'GET',
      uri: '/api/events/evt_music_fest_2026',
      description: 'Returns event details, venue specs, and pricing tiers (VIP, Premium, Standard).',
      body: null
    },
    {
      id: 'ep-tickets',
      task: 'Task 1: Get Available Tickets',
      method: 'GET',
      uri: '/api/events/evt_music_fest_2026/available-tickets',
      description: 'Returns real-time seat inventory matrix with availability and lock status.',
      body: null
    },
    {
      id: 'ep-hold',
      task: 'Task 5: Hold Seats (Atomic Concurrency Lock)',
      method: 'POST',
      uri: '/api/bookings/hold',
      description: 'Acquires a 5-minute atomic lock on seats to prevent race conditions during checkout.',
      body: JSON.stringify({
        eventId: 'evt_music_fest_2026',
        seatIds: ['seat_B5', 'seat_B6'],
        userId: 'sarah.connor@example.com'
      }, null, 2)
    },
    {
      id: 'ep-book',
      task: 'Tasks 1, 3 & 4: Book Ticket',
      method: 'POST',
      uri: '/api/bookings',
      description: 'Validates seat lock, charges payment, creates confirmed booking, and generates ticket pass.',
      body: JSON.stringify({
        eventId: 'evt_music_fest_2026',
        customer: {
          name: 'Sarah Connor',
          email: 'sarah.connor@example.com',
          phone: '+1-555-0199'
        },
        seatIds: ['seat_B5', 'seat_B6'],
        paymentDetails: {
          method: 'CREDIT_CARD',
          simulateStatus: 'SUCCESS'
        }
      }, null, 2)
    },
    {
      id: 'ep-status',
      task: 'Task: Check Booking Status',
      method: 'GET',
      uri: '/api/bookings/replace_with_booking_id',
      description: 'Retrieves current status (CONFIRMED, CANCELLED) and ticket QR code payload.',
      body: null
    },
    {
      id: 'ep-cancel',
      task: 'Task 6: Cancel Ticket API',
      method: 'POST',
      uri: '/api/bookings/replace_with_booking_id/cancel',
      description: 'Cancels booking, releases seats back to available inventory, and initiates refund.',
      body: JSON.stringify({
        reason: 'Customer schedule conflict'
      }, null, 2)
    }
  ],

  open() {
    document.getElementById('lld-drawer-overlay').classList.add('active');
    this.renderApiSandbox();
    this.refreshLocksState();
  },

  close() {
    document.getElementById('lld-drawer-overlay').classList.remove('active');
  },

  closeOnBackdrop(e) {
    if (e.target.id === 'lld-drawer-overlay') {
      this.close();
    }
  },

  openToApiTab() {
    this.open();
    const btn = document.querySelectorAll('.lld-tab-btn')[1];
    if (btn) this.showTab('lld-api', btn);
  },

  showTab(tabId, btn) {
    document.querySelectorAll('.lld-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.lld-tab-panel').forEach(p => p.style.display = 'none');
    const panel = document.getElementById(tabId);
    if (panel) panel.style.display = 'block';

    if (tabId === 'lld-locks') {
      this.refreshLocksState();
    }
  },

  renderApiSandbox() {
    const container = document.getElementById('lld-api-list-container');
    if (!container) return;

    container.innerHTML = this.endpoints.map(ep => {
      const isPost = ep.method === 'POST';
      const methodClass = isPost ? 'method-post' : 'method-get';

      return `
        <div style="background: #121826; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="method-tag ${methodClass}">${ep.method}</span>
              <strong style="color: #fff; font-size: 0.92rem;">${ep.task}</strong>
            </div>
            <button class="btn-proceed-checkout" style="padding: 6px 14px; font-size: 0.8rem;" onclick="lldDrawer.executeApiTest('${ep.id}')">
              ⚡ Execute Call
            </button>
          </div>

          <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 10px;">${ep.description}</p>
          
          <input type="text" class="form-input" id="input-uri-${ep.id}" value="${ep.uri}" style="font-family: var(--font-mono); font-size: 0.82rem; margin-bottom: 10px;">

          ${isPost ? `
            <div style="margin-bottom: 10px;">
              <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 4px;">Request Payload (JSON):</label>
              <textarea class="form-input" id="input-body-${ep.id}" style="font-family: var(--font-mono); font-size: 0.8rem; height: 100px; resize: vertical;">${ep.body}</textarea>
            </div>
          ` : ''}

          <div id="resp-box-${ep.id}" style="display: none; margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">
              <span>Status: <strong id="resp-status-${ep.id}" style="color: var(--accent-emerald);">200 OK</strong></span>
              <span id="resp-time-${ep.id}">24 ms</span>
            </div>
            <pre class="code-box" id="resp-data-${ep.id}" style="margin-bottom: 0;">...</pre>
          </div>
        </div>
      `;
    }).join('');
  },

  async executeApiTest(id) {
    const ep = this.endpoints.find(e => e.id === id);
    if (!ep) return;

    let uri = document.getElementById(`input-uri-${id}`)?.value.trim() || ep.uri;

    // Replace placeholder if booking exists
    if (uri.includes('replace_with_booking_id')) {
      if (window.ticketBoxApp && window.ticketBoxApp.currentConfirmedBooking) {
        uri = uri.replace('replace_with_booking_id', window.ticketBoxApp.currentConfirmedBooking.bookingId);
      } else {
        const stateRes = await apiClient.getSystemState();
        if (stateRes.ok && stateRes.data.data.recentBookings.length > 0) {
          uri = uri.replace('replace_with_booking_id', stateRes.data.data.recentBookings[0].id);
        } else {
          showToast('Please complete a booking in the website first before testing this endpoint!', 'warning');
          return;
        }
      }
      document.getElementById(`input-uri-${id}`).value = uri;
    }

    const options = { method: ep.method };

    if (ep.method === 'POST') {
      const bodyVal = document.getElementById(`input-body-${id}`)?.value.trim();
      if (bodyVal) {
        try {
          options.body = JSON.parse(bodyVal);
        } catch (err) {
          showToast('Invalid JSON syntax in body', 'error');
          return;
        }
      }
    }

    const res = await apiClient.request(uri, options);

    const respBox = document.getElementById(`resp-box-${id}`);
    const statusEl = document.getElementById(`resp-status-${id}`);
    const timeEl = document.getElementById(`resp-time-${id}`);
    const dataEl = document.getElementById(`resp-data-${id}`);

    if (respBox) respBox.style.display = 'block';
    if (statusEl) {
      statusEl.textContent = `${res.status} ${res.statusText || ''}`;
      statusEl.style.color = res.status < 400 ? 'var(--accent-emerald)' : 'var(--accent-coral)';
    }
    if (timeEl) timeEl.textContent = `${res.latency} ms`;
    if (dataEl) dataEl.textContent = JSON.stringify(res.data, null, 2);

    if (res.ok) {
      showToast(`${ep.method} call returned ${res.status} OK`, 'success');
    } else {
      showToast(`${ep.method} call returned HTTP ${res.status}`, 'error');
    }

    this.refreshLocksState();
  },

  async refreshLocksState() {
    const container = document.getElementById('lld-locks-container');
    if (!container) return;

    const res = await apiClient.getSystemState();
    if (!res.ok || !res.data.success) return;

    const { activeLocks, totalBookingsCount } = res.data.data;

    if (activeLocks.length === 0) {
      container.innerHTML = `
        <div style="background: #121826; border: 1px dashed var(--border-color); border-radius: var(--radius-md); padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.88rem;">
          <p>No active temporary seat holds right now.</p>
          <p style="font-size: 0.8rem; margin-top: 6px;">Select seats in any event and click "Reserve Seats & Checkout" to trigger atomic 5-minute locks.</p>
        </div>
      `;
    } else {
      container.innerHTML = `
        <table class="lld-spec-table">
          <thead>
            <tr>
              <th>Seat ID</th>
              <th>Reserved By</th>
              <th>Lock Token</th>
              <th>TTL Remaining</th>
            </tr>
          </thead>
          <tbody>
            ${activeLocks.map(l => `
              <tr>
                <td><strong style="color: var(--accent-gold);">${l.seatId}</strong></td>
                <td>${l.userId}</td>
                <td><code style="font-size: 0.72rem;">${l.lockToken}</code></td>
                <td><span style="color: var(--accent-gold); font-weight: 700;">${l.remainingSeconds}s</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  }
};

window.lldDrawer = lldDrawer;
