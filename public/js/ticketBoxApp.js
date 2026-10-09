/**
 * TICKETBOX Consumer Application Controller
 * Handles Discovery, Interactive Stadium Seat Picker, Checkout, Digital Passes & Cancellations.
 */

const ticketBoxApp = {
  events: [],
  selectedEvent: null,
  eventSeatsData: null,
  selectedSeats: new Set(),
  activeLockToken: null,
  lockExpiresAt: null,
  holdTimerInterval: null,
  currentConfirmedBooking: null,
  myBookings: [],

  init() {
    this.loadEvents();
    this.syncBookingsList();
  },

  // 1. EVENT CATALOG & SEARCH
  async loadEvents() {
    const query = document.getElementById('hero-search-input')?.value.trim() || '';
    const city = document.getElementById('hero-city-select')?.value || 'ALL';
    const category = document.getElementById('hero-category-select')?.value || 'ALL';

    const grid = document.getElementById('events-grid');
    if (grid) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 48px;">Loading live events...</div>';
    }

    const res = await apiClient.searchEvents({ query, city, category });
    this.notifyApiCall('GET', `/api/events`, res.status, res.latency);

    if (!res.ok || !res.data.success) {
      showToast('Unable to load events', 'error');
      return;
    }

    this.events = res.data.data;
    this.renderEventsGrid();
  },

  onSearchInput() {
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.loadEvents(), 200);
  },

  filterCategory(cat) {
    const catSelect = document.getElementById('hero-category-select');
    if (catSelect) catSelect.value = cat;

    // Highlight chip
    const chips = document.querySelectorAll('.category-chip');
    chips.forEach(chip => {
      chip.classList.toggle('active', chip.getAttribute('data-category') === cat);
    });

    this.loadEvents();
  },

  selectCategoryChip(el, cat) {
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    const catSelect = document.getElementById('hero-category-select');
    if (catSelect) catSelect.value = cat;
    this.loadEvents();
  },

  resetView() {
    const searchInput = document.getElementById('hero-search-input');
    if (searchInput) searchInput.value = '';
    this.filterCategory('ALL');
  },

  renderEventsGrid() {
    const grid = document.getElementById('events-grid');
    const countBadge = document.getElementById('events-count-badge');
    if (!grid) return;

    if (countBadge) countBadge.textContent = `${this.events.length} events found`;

    if (this.events.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 60px 20px;">
          <h3>No events found matching your criteria</h3>
          <p style="margin-top: 8px;">Try clearing filters or searching for another artist or city.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.events.map(evt => {
      // Parse ISO date
      const d = new Date(evt.date);
      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const month = monthNames[d.getMonth()] || 'NOV';
      const day = d.getDate() || '15';

      const isLow = evt.availableSeats < 30;

      return `
        <div class="event-box" id="event-box-${evt.id}">
          <div class="event-media-container">
            <img class="event-thumb" src="${evt.bannerUrl}" alt="${evt.title}" loading="lazy">
            <div class="event-date-box">
              <div class="event-date-month">${month}</div>
              <div class="event-date-day">${day}</div>
            </div>
            <div class="event-category-badge">${evt.category}</div>
          </div>

          <div class="event-body">
            <h3 class="event-headline">${evt.title}</h3>
            
            <div class="event-venue-row">
              <span>📍</span>
              <span>${evt.venue}, ${evt.city}</span>
            </div>
            <div class="event-time-row">
              <span>🕒</span>
              <span>${evt.time} Doors Open • Organized by ${evt.organizer}</span>
            </div>

            <div class="event-inventory-status ${isLow ? 'low' : ''}">
              <span>🎟️</span>
              <span>${evt.availableSeats} tickets left (${evt.totalSeats} capacity)</span>
            </div>

            <div class="event-footer-bar">
              <div>
                <div class="event-price-from">Prices from</div>
                <div class="event-price-amount">$${evt.startingPrice}</div>
              </div>
              <button class="btn-book-tickets" onclick="ticketBoxApp.openSeatModal('${evt.id}')">
                Get Tickets
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  // 2. SEAT SELECTION & ARENA PICKER
  async openSeatModal(eventId) {
    const res = await apiClient.getEventDetails(eventId);
    this.notifyApiCall('GET', `/api/events/${eventId}`, res.status, res.latency);

    if (!res.ok || !res.data.success) {
      showToast('Could not load event details', 'error');
      return;
    }

    this.selectedEvent = res.data.data;

    // Load Available Seats
    const seatsRes = await apiClient.getAvailableTickets(eventId);
    this.notifyApiCall('GET', `/api/events/${eventId}/available-tickets`, seatsRes.status, seatsRes.latency);

    if (!seatsRes.ok || !seatsRes.data.success) {
      showToast('Could not fetch seat availability', 'error');
      return;
    }

    this.eventSeatsData = seatsRes.data.data;
    this.selectedSeats.clear();

    document.getElementById('modal-event-title').textContent = this.selectedEvent.title;
    document.getElementById('modal-event-meta').textContent = `${this.selectedEvent.venue}, ${this.selectedEvent.city} • ${this.selectedEvent.date} @ ${this.selectedEvent.time}`;

    this.renderSeatLayout();
    document.getElementById('seat-modal-overlay').classList.add('active');
  },

  closeSeatModal() {
    document.getElementById('seat-modal-overlay').classList.remove('active');
  },

  renderSeatLayout() {
    const container = document.getElementById('arena-seats-container');
    if (!container || !this.eventSeatsData) return;

    // Group seats by Row letter ('A', 'B', 'C'...)
    const rowsMap = new Map();
    for (const s of this.eventSeatsData.seats) {
      const row = s.seatNumber.charAt(0);
      if (!rowsMap.has(row)) rowsMap.set(row, []);
      rowsMap.get(row).push(s);
    }

    container.innerHTML = Array.from(rowsMap.entries()).map(([rowLetter, seats]) => `
      <div class="arena-row">
        <span class="row-label">${rowLetter}</span>
        ${seats.map(s => {
          let stateClass = '';
          if (s.status === 'BOOKED') stateClass = 'booked';
          else if (s.status === 'LOCKED') stateClass = 'locked';
          else if (this.selectedSeats.has(s.id)) stateClass = 'selected';

          const tierClass = `tier-${s.tier.toLowerCase()}`;
          const titleHint = `${s.seatNumber} (${s.tier} $${s.price}) - ${s.status}`;

          return `
            <div 
              class="seat-circle ${tierClass} ${stateClass}" 
              id="seat-${s.id}"
              title="${titleHint}"
              onclick="ticketBoxApp.toggleSeat('${s.id}')"
            >
              ${s.seatNumber}
            </div>
          `;
        }).join('')}
        <span class="row-label">${rowLetter}</span>
      </div>
    `).join('');

    this.updateSeatSelectionSummary();
  },

  toggleSeat(seatId) {
    const seatObj = this.eventSeatsData.seats.find(s => s.id === seatId);
    if (!seatObj) return;

    if (seatObj.status === 'BOOKED') {
      showToast(`Seat ${seatObj.seatNumber} is already booked.`, 'error');
      return;
    }
    if (seatObj.status === 'LOCKED') {
      showToast(`Seat ${seatObj.seatNumber} is on temporary hold by another customer.`, 'warning');
      return;
    }

    if (this.selectedSeats.has(seatId)) {
      this.selectedSeats.delete(seatId);
    } else {
      if (this.selectedSeats.size >= 6) {
        showToast('Maximum 6 seats allowed per purchase.', 'warning');
        return;
      }
      this.selectedSeats.add(seatId);
    }

    // Toggle styling
    const seatEl = document.getElementById(`seat-${seatId}`);
    if (seatEl) {
      seatEl.classList.toggle('selected', this.selectedSeats.has(seatId));
    }

    this.updateSeatSelectionSummary();
  },

  updateSeatSelectionSummary() {
    const summaryText = document.getElementById('selection-seats-summary');
    const priceText = document.getElementById('selection-subtotal-price');
    const proceedBtn = document.getElementById('btn-proceed-checkout');

    let total = 0;
    const seatNames = [];

    for (const seatId of this.selectedSeats) {
      const s = this.eventSeatsData.seats.find(item => item.id === seatId);
      if (s) {
        seatNames.push(s.seatNumber);
        total += s.price;
      }
    }

    if (summaryText) {
      summaryText.textContent = seatNames.length === 0 ? 'No seats selected' : `Selected Seats: ${seatNames.join(', ')}`;
    }
    if (priceText) {
      priceText.textContent = `$${total.toFixed(2)}`;
    }
    if (proceedBtn) {
      proceedBtn.disabled = (this.selectedSeats.size === 0);
    }
  },

  // 3. ATOMIC SEAT HOLD & CHECKOUT
  async openCheckoutModal() {
    if (this.selectedSeats.size === 0) return;

    const email = document.getElementById('checkout-email')?.value.trim() || 'guest@example.com';
    const seatIds = Array.from(this.selectedSeats);

    // Call Hold Seats API (Task 5: Concurrency Lock with TTL)
    const holdRes = await apiClient.holdSeats(this.selectedEvent.id, seatIds, email);
    this.notifyApiCall('POST', '/api/bookings/hold', holdRes.status, holdRes.latency);

    if (!holdRes.ok || !holdRes.data.success) {
      showToast(holdRes.data.message || 'Seat lock failed (Someone else selected these seats!)', 'error');
      // Re-fetch seats to show latest conflict status
      this.openSeatModal(this.selectedEvent.id);
      return;
    }

    this.activeLockToken = holdRes.data.data.lockToken;
    this.lockExpiresAt = holdRes.data.data.expiresAt;

    showToast('Seats temporarily locked for 5 minutes during checkout.', 'success');
    this.startHoldTimer();

    // Populate checkout fields
    document.getElementById('summary-event-name').textContent = this.selectedEvent.title;
    
    let subtotal = 0;
    const seatNames = [];
    for (const seatId of this.selectedSeats) {
      const s = this.eventSeatsData.seats.find(item => item.id === seatId);
      if (s) {
        seatNames.push(s.seatNumber);
        subtotal += s.price;
      }
    }

    document.getElementById('summary-seats-badges').textContent = seatNames.join(', ');
    document.getElementById('summary-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('summary-grand-total').textContent = `$${subtotal.toFixed(2)}`;

    this.closeSeatModal();
    document.getElementById('checkout-modal-overlay').classList.add('active');
  },

  closeCheckoutModal() {
    document.getElementById('checkout-modal-overlay').classList.remove('active');
  },

  startHoldTimer() {
    clearInterval(this.holdTimerInterval);
    const timerEl = document.getElementById('checkout-countdown');

    this.holdTimerInterval = setInterval(() => {
      const remainingMs = this.lockExpiresAt - Date.now();
      if (remainingMs <= 0) {
        clearInterval(this.holdTimerInterval);
        if (timerEl) timerEl.textContent = 'EXPIRED';
        showToast('Your 5-minute seat reservation has expired. Please select seats again.', 'error');
        this.closeCheckoutModal();
        return;
      }

      const totalSec = Math.floor(remainingMs / 1000);
      const mins = Math.floor(totalSec / 60).toString().padStart(2, '0');
      const secs = (totalSec % 60).toString().padStart(2, '0');
      if (timerEl) timerEl.textContent = `${mins}:${secs}`;
    }, 1000);
  },

  // 4. CONFIRM BOOKING & PAYMENT
  async confirmBooking() {
    const name = document.getElementById('checkout-name')?.value.trim();
    const email = document.getElementById('checkout-email')?.value.trim();
    const phone = document.getElementById('checkout-phone')?.value.trim();
    const simulateStatus = document.getElementById('checkout-payment-mode')?.value || 'SUCCESS';

    if (!name || !email) {
      showToast('Please provide your name and email.', 'warning');
      return;
    }

    const payload = {
      eventId: this.selectedEvent.id,
      customer: { name, email, phone },
      seatIds: Array.from(this.selectedSeats),
      lockToken: this.activeLockToken,
      paymentDetails: {
        method: 'CREDIT_CARD',
        simulateStatus
      }
    };

    const submitBtn = document.getElementById('btn-submit-payment');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing Payment Gateway...';
    }

    const res = await apiClient.bookTicket(payload);
    this.notifyApiCall('POST', '/api/bookings', res.status, res.latency);

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Pay Now & Get Tickets';
    }

    if (!res.ok || !res.data.success) {
      showToast(`Booking Failed (${res.status}): ${res.data.message || res.data.error}`, 'error');
      return;
    }

    clearInterval(this.holdTimerInterval);
    this.currentConfirmedBooking = res.data.data;
    showToast('Payment Approved! Tickets Issued (201 Created)', 'success');

    this.closeCheckoutModal();
    this.renderDigitalPass(this.currentConfirmedBooking);
    this.syncBookingsList();
    this.loadEvents(); // Refresh inventory
  },

  // 5. DIGITAL PASS
  renderDigitalPass(bkg) {
    if (!bkg) return;

    document.getElementById('pass-ref').textContent = bkg.bookingReference;
    document.getElementById('pass-status-pill').textContent = bkg.status;
    document.getElementById('pass-status-pill').className = 'ticket-status-pill';
    document.getElementById('pass-event-title').textContent = bkg.eventTitle;
    document.getElementById('pass-datetime').textContent = `${bkg.eventDate} • ${bkg.eventTime}`;
    document.getElementById('pass-venue').textContent = bkg.eventVenue;
    document.getElementById('pass-attendee').textContent = bkg.customer.name;
    document.getElementById('pass-seats').textContent = bkg.seats.map(s => s.seatNumber).join(', ');
    document.getElementById('pass-total').textContent = `$${bkg.totalAmount.toFixed(2)}`;
    document.getElementById('pass-txn').textContent = bkg.payment.transactionRef;

    // Render Canvas Barcode
    renderQRCodeCanvas('pass-qr-canvas', bkg.qrCodeData);

    const cancelBtn = document.getElementById('btn-cancel-pass');
    if (cancelBtn) cancelBtn.style.display = 'block';

    document.getElementById('ticket-pass-overlay').classList.add('active');
  },

  closeTicketPass() {
    document.getElementById('ticket-pass-overlay').classList.remove('active');
  },

  // 6. CANCEL TICKET (TASK 6)
  async cancelCurrentTicket() {
    if (!this.currentConfirmedBooking) return;

    const bkg = this.currentConfirmedBooking;
    const ok = confirm(`Confirm cancellation of booking ${bkg.bookingReference}? You will receive a full refund of $${bkg.totalAmount.toFixed(2)} and your seats will be released back to the event.`);
    if (!ok) return;

    const res = await apiClient.cancelTicket(bkg.bookingId, 'User requested cancellation in website');
    this.notifyApiCall('POST', `/api/bookings/${bkg.bookingId}/cancel`, res.status, res.latency);

    if (!res.ok || !res.data.success) {
      showToast(`Cancellation error: ${res.data.message || res.data.error}`, 'error');
      return;
    }

    const cancelData = res.data.data;
    showToast(`Booking cancelled. $${cancelData.refund.amount} refunded. Seats released back to inventory!`, 'success');

    // Update status pill on ticket
    const pill = document.getElementById('pass-status-pill');
    if (pill) {
      pill.textContent = 'CANCELLED';
      pill.className = 'ticket-status-pill cancelled';
    }

    const cancelBtn = document.getElementById('btn-cancel-pass');
    if (cancelBtn) cancelBtn.style.display = 'none';

    this.syncBookingsList();
    this.loadEvents();
  },

  // MY BOOKINGS MODAL
  async openMyBookings() {
    await this.syncBookingsList();
    const container = document.getElementById('my-bookings-list-container');
    if (!container) return;

    if (this.myBookings.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <div style="font-size: 32px; margin-bottom: 8px;">🎟️</div>
          <p>You have no active or past bookings yet.</p>
        </div>
      `;
    } else {
      container.innerHTML = this.myBookings.map(b => `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">${b.bookingReference}</div>
            <h4 style="font-size: 1.1rem; font-weight: 700; color: #fff; margin: 4px 0;">${b.eventTitle || 'Live Event'}</h4>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">
              Seats: <strong style="color: var(--accent-cyan);">${b.seats.map(s => s.seatNumber).join(', ')}</strong> • Total: $${b.totalAmount.toFixed(2)}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.8rem; font-weight: 700; color: ${b.status === 'CONFIRMED' ? 'var(--accent-emerald)' : 'var(--accent-coral)'}; margin-bottom: 8px;">
              ${b.status}
            </div>
            <button class="btn-book-tickets" style="padding: 6px 14px; font-size: 0.78rem;" onclick="ticketBoxApp.viewSpecificPass('${b.id}')">
              View Pass
            </button>
          </div>
        </div>
      `).join('');
    }

    document.getElementById('my-bookings-overlay').classList.add('active');
  },

  closeMyBookings() {
    document.getElementById('my-bookings-overlay').classList.remove('active');
  },

  viewSpecificPass(bookingId) {
    const found = this.myBookings.find(b => b.id === bookingId);
    if (found) {
      this.currentConfirmedBooking = found;
      this.closeMyBookings();
      this.renderDigitalPass(found);
    }
  },

  async syncBookingsList() {
    const res = await apiClient.request('/api/bookings');
    if (res.ok && res.data.success) {
      this.myBookings = res.data.data;
      const countEl = document.getElementById('nav-bookings-count');
      if (countEl) countEl.textContent = `(${this.myBookings.length})`;
    }
  },

  // Floating REST API feedback
  notifyApiCall(method, endpoint, status, latency) {
    const toast = document.getElementById('api-live-toast');
    const toastText = document.getElementById('api-live-toast-text');
    if (!toast || !toastText) return;

    toastText.textContent = `${method} ${endpoint} (${status} • ${latency}ms)`;
    toast.style.display = 'flex';

    clearTimeout(this._apiToastTimer);
    this._apiToastTimer = setTimeout(() => {
      toast.style.display = 'none';
    }, 4500);
  }
};

window.ticketBoxApp = ticketBoxApp;
document.addEventListener('DOMContentLoaded', () => ticketBoxApp.init());
