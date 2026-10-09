/**
 * REST API Interactive Sandbox
 * Directly tests all Challenge Tasks:
 *  - Search Event
 *  - Get Event Details
 *  - Get Available Tickets
 *  - Book Ticket
 *  - Check Booking Status
 *  - Cancel Ticket
 */

const apiSandbox = {
  endpoints: [
    {
      id: 'api-search',
      task: 'Task 1: Search Event',
      method: 'GET',
      uri: '/api/events?query=Symphony&category=ALL&city=ALL',
      description: 'Search for events matching keywords, category, or city filter.',
      body: null
    },
    {
      id: 'api-details',
      task: 'Task 1: Get Event Details',
      method: 'GET',
      uri: '/api/events/evt_music_fest_2026',
      description: 'Fetch complete event information, venue specifications, and ticket tier pricing.',
      body: null
    },
    {
      id: 'api-available',
      task: 'Task 1: Get Available Tickets',
      method: 'GET',
      uri: '/api/events/evt_music_fest_2026/available-tickets',
      description: 'Get real-time seat inventory and ticket counts with lock status.',
      body: null
    },
    {
      id: 'api-hold',
      task: 'Task 5: Hold Seats (Concurrency Lock)',
      method: 'POST',
      uri: '/api/bookings/hold',
      description: 'Temporarily reserves seats for 5 minutes during checkout to prevent double bookings.',
      body: JSON.stringify({
        eventId: 'evt_music_fest_2026',
        seatIds: ['seat_A7', 'seat_A8'],
        userId: 'sarah.connor@example.com'
      }, null, 2)
    },
    {
      id: 'api-book',
      task: 'Tasks 1, 3 & 4: Book Ticket',
      method: 'POST',
      uri: '/api/bookings',
      description: 'Validates seat reservation, processes payment, confirms booking, and generates ticket pass.',
      body: JSON.stringify({
        eventId: 'evt_music_fest_2026',
        customer: {
          name: 'Sarah Connor',
          email: 'sarah.connor@example.com',
          phone: '+1-555-0199'
        },
        seatIds: ['seat_A7', 'seat_A8'],
        paymentDetails: {
          method: 'CREDIT_CARD',
          simulateStatus: 'SUCCESS'
        }
      }, null, 2)
    },
    {
      id: 'api-status',
      task: 'Task: Check Booking Status',
      method: 'GET',
      uri: '/api/bookings/replace_with_booking_id',
      description: 'Fetch current status (CONFIRMED, CANCELLED) and attendee ticket info.',
      body: null
    },
    {
      id: 'api-cancel',
      task: 'Task 6: Cancel Ticket API',
      method: 'POST',
      uri: '/api/bookings/replace_with_booking_id/cancel',
      description: 'Cancels a confirmed booking, frees the seats back to available inventory, and issues refund.',
      body: JSON.stringify({
        reason: 'Customer schedule conflict'
      }, null, 2)
    }
  ],

  init() {
    this.renderCards();
  },

  renderCards() {
    const container = document.getElementById('api-cards-container');
    if (!container) return;

    container.innerHTML = this.endpoints.map(ep => {
      const isPost = ep.method === 'POST';
      const methodClass = ep.method === 'GET' ? 'method-get' : ep.method === 'POST' ? 'method-post' : 'method-delete';

      return `
        <div class="api-endpoint-card" id="card-${ep.id}">
          <div class="api-header-bar" onclick="apiSandbox.togglePanel('${ep.id}')">
            <div class="api-method-uri">
              <span class="method-tag ${methodClass}">${ep.method}</span>
              <span style="color: #fff;">${ep.uri}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="api-task-badge">${ep.task}</span>
              <span style="font-size: 0.8rem; color: var(--text-dim);" id="arrow-${ep.id}">▼</span>
            </div>
          </div>

          <div class="api-body-panel" id="panel-${ep.id}">
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 12px;">${ep.description}</p>
            
            <div style="display: flex; gap: 10px; margin-bottom: 12px;">
              <input type="text" class="form-control" id="uri-${ep.id}" value="${ep.uri}" style="font-family: var(--font-mono); font-size: 0.88rem;">
              <button class="btn btn-primary" style="white-space: nowrap;" onclick="apiSandbox.executeRequest('${ep.id}')">
                ⚡ Send Request
              </button>
            </div>

            ${isPost ? `
              <div style="margin-bottom: 12px;">
                <label class="form-label">Request JSON Body:</label>
                <textarea class="code-editor" id="body-${ep.id}">${ep.body || ''}</textarea>
              </div>
            ` : ''}

            <div class="api-response-viewer" id="resp-container-${ep.id}" style="display: none;">
              <div class="response-meta">
                <div>Status: <span class="status-badge" id="resp-status-${ep.id}">---</span></div>
                <div>Latency: <span id="resp-latency-${ep.id}" style="font-family: var(--font-mono); color: var(--text-muted);">0 ms</span></div>
              </div>
              <pre class="json-pre" id="resp-json-${ep.id}">...</pre>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  togglePanel(id) {
    const panel = document.getElementById(`panel-${id}`);
    const arrow = document.getElementById(`arrow-${id}`);
    if (!panel) return;
    if (panel.style.display === 'none') {
      panel.style.display = 'block';
      if (arrow) arrow.textContent = '▲';
    } else {
      panel.style.display = 'none';
      if (arrow) arrow.textContent = '▼';
    }
  },

  async executeRequest(id) {
    const ep = this.endpoints.find(e => e.id === id);
    if (!ep) return;

    const uriInput = document.getElementById(`uri-${id}`);
    let uri = uriInput ? uriInput.value.trim() : ep.uri;

    // Check if user has a recent booking to replace placeholder
    if (uri.includes('replace_with_booking_id')) {
      if (window.flowApp && window.flowApp.confirmedBooking) {
        uri = uri.replace('replace_with_booking_id', window.flowApp.confirmedBooking.bookingId);
        if (uriInput) uriInput.value = uri;
      } else {
        // Find any booking from system
        const stateRes = await apiClient.getSystemState();
        if (stateRes.ok && stateRes.data.data.recentBookings.length > 0) {
          const sampleId = stateRes.data.data.recentBookings[0].id;
          uri = uri.replace('replace_with_booking_id', sampleId);
          if (uriInput) uriInput.value = uri;
        } else {
          showToast('Please first create a booking via Flow Simulator or the Book Ticket API to test this!', 'warning');
          return;
        }
      }
    }

    const options = { method: ep.method };

    if (ep.method === 'POST') {
      const bodyEl = document.getElementById(`body-${id}`);
      if (bodyEl && bodyEl.value.trim()) {
        try {
          options.body = JSON.parse(bodyEl.value.trim());
        } catch (err) {
          showToast('Invalid JSON in request body: ' + err.message, 'error');
          return;
        }
      }
    }

    const res = await apiClient.request(uri, options);

    // Render response
    const respContainer = document.getElementById(`resp-container-${id}`);
    const statusBadge = document.getElementById(`resp-status-${id}`);
    const latencyEl = document.getElementById(`resp-latency-${id}`);
    const jsonPre = document.getElementById(`resp-json-${id}`);

    if (respContainer) respContainer.style.display = 'block';
    if (statusBadge) {
      statusBadge.textContent = `${res.status} ${res.statusText || (res.status === 200 ? 'OK' : res.status === 201 ? 'Created' : '')}`;
      statusBadge.className = `status-badge ${res.status < 400 ? 'status-2xx' : 'status-4xx'}`;
    }
    if (latencyEl) latencyEl.textContent = `${res.latency} ms`;
    if (jsonPre) jsonPre.textContent = JSON.stringify(res.data, null, 2);

    if (res.ok) {
      showToast(`${ep.method} request succeeded (${res.status})`, 'success');
    } else {
      showToast(`Request returned HTTP ${res.status}`, 'error');
    }

    // Refresh state if changed
    if (window.monitorApp) {
      window.monitorApp.refreshState();
    }
  }
};

window.apiSandbox = apiSandbox;
