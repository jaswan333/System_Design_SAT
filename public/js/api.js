/**
 * API Client & Shared Utilities
 */

const apiClient = {
  baseUrl: '',

  async request(endpoint, options = {}) {
    const startTime = performance.now();
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      const latency = Math.round(performance.now() - startTime);
      const data = await response.json();
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        data,
        latency
      };
    } catch (err) {
      const latency = Math.round(performance.now() - startTime);
      return {
        ok: false,
        status: 500,
        statusText: 'Network Error',
        data: { error: err.message },
        latency
      };
    }
  },

  // Task 1: Search Events
  searchEvents(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/events?${query}`);
  },

  // Task 1: Get Event Details
  getEventDetails(eventId) {
    return this.request(`/api/events/${eventId}`);
  },

  // Task 1: Get Available Tickets
  getAvailableTickets(eventId, userId) {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return this.request(`/api/events/${eventId}/available-tickets${query}`);
  },

  // Hold Seats (Locking)
  holdSeats(eventId, seatIds, userId) {
    return this.request('/api/bookings/hold', {
      method: 'POST',
      body: { eventId, seatIds, userId }
    });
  },

  // Task 1 & 3: Book Ticket
  bookTicket(payload) {
    return this.request('/api/bookings', {
      method: 'POST',
      body: payload
    });
  },

  // Check Booking Status
  getBooking(bookingId) {
    return this.request(`/api/bookings/${bookingId}`);
  },

  // Task 6: Cancel Ticket
  cancelTicket(bookingId, reason) {
    return this.request(`/api/bookings/${bookingId}/cancel`, {
      method: 'POST',
      body: { reason }
    });
  },

  // System State
  getSystemState() {
    return this.request('/api/system/state');
  }
};

/**
 * Toast Notification System
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toast.innerHTML = `<span style="font-weight: bold;">${icon}</span> <span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Draw decorative pseudo-QR matrix on a canvas
 */
function renderQRCodeCanvas(canvasId, seedString = 'TICKET') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 130;
  canvas.width = size;
  canvas.height = size;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  const cellSize = 5;
  const gridCount = Math.floor(size / cellSize);

  // Simple deterministic hash from string
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash * 31 + seedString.charCodeAt(i)) & 0xffffffff;
  }

  // Draw QR corner locator squares
  function drawCornerBox(x, y) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x * cellSize, y * cellSize, 7 * cellSize, 7 * cellSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect((x + 1) * cellSize, (y + 1) * cellSize, 5 * cellSize, 5 * cellSize);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect((x + 2) * cellSize, (y + 2) * cellSize, 3 * cellSize, 3 * cellSize);
  }

  drawCornerBox(1, 1);
  drawCornerBox(gridCount - 8, 1);
  drawCornerBox(1, gridCount - 8);

  // Random looking patterns using hash
  ctx.fillStyle = '#0f172a';
  for (let r = 0; r < gridCount; r++) {
    for (let c = 0; c < gridCount; c++) {
      // Skip corner boxes
      if ((r < 8 && c < 8) || (r < 8 && c > gridCount - 9) || (r > gridCount - 9 && c < 8)) {
        continue;
      }
      hash = (hash * 1664525 + 1013904223) & 0xffffffff;
      if (Math.abs(hash) % 3 === 0) {
        ctx.fillRect(c * cellSize, r * cellSize, cellSize - 1, cellSize - 1);
      }
    }
  }
}
