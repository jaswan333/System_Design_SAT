/**
 * Flow Simulator: Step-by-Step Customer Journey
 * Implements Task 5: Customer -> Search Event -> View Event -> Select Ticket -> Book -> Payment -> Confirmation
 * Plus Task 6: Cancel Ticket
 */

const flowApp = {
  currentStep: 1,
  selectedEvent: null,
  eventTicketsData: null,
  selectedSeats: new Set(),
  activeLockToken: null,
  lockExpiresAt: null,
  lockTimerInterval: null,
  confirmedBooking: null,

  init() {
    this.loadEvents();
  },

  goToStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > 6) return;

    // Guard steps if prerequisites are not fulfilled
    if (stepNumber >= 2 && !this.selectedEvent) {
      showToast('Please select an event first!', 'warning');
      return;
    }
    if (stepNumber >= 4 && this.selectedSeats.size === 0) {
      showToast('Please select at least one seat!', 'warning');
      return;
    }
    if (stepNumber === 6 && !this.confirmedBooking) {
      showToast('No booking confirmed yet.', 'warning');
      return;
    }

    this.currentStep = stepNumber;

    // Update Step Indicators
    for (let i = 1; i <= 6; i++) {
      const navItem = document.getElementById(`step-nav-${i}`);
      const view = document.getElementById(`flow-step-${i}`);

      if (navItem) {
        navItem.classList.remove('active', 'completed');
        if (i === stepNumber) {
          navItem.classList.add('active');
        } else if (i < stepNumber) {
          navItem.classList.add('completed');
        }
      }

      if (view) {
        view.style.display = (i === stepNumber) ? 'block' : 'none';
      }
    }

    // Update progress bar width
    const progressFill = document.getElementById('flow-progress-fill');
    if (progressFill) {
      const percentage = ((stepNumber - 1) / 5) * 100;
      progressFill.style.width = `${percentage}%`;
    }

    window.scrollTo({ top: 120, behavior: 'smooth' });
  },

  // 1. SEARCH EVENTS
  async loadEvents() {
    const query = document.getElementById('event-search-input')?.value.trim() || '';
    const category = document.getElementById('event-category-select')?.value || 'ALL';
    const city = document.getElementById('event-city-select')?.value || 'ALL';

    const grid = document.getElementById('events-grid-container');
    if (grid) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">Loading events from REST API...</div>';
    }

    const res = await apiClient.searchEvents({ query, category, city });
    if (!res.ok || !res.data.success) {
      showToast('Failed to load events', 'error');
      return;
    }

    const events = res.data.data;
    if (grid) {
      if (events.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">No events found matching your search.</div>';
        return;
      }

      grid.innerHTML = events.map(evt => `
        <div class="event-card" id="card-${evt.id}">
          <img class="event-banner-img" src="${evt.bannerUrl}" alt="${evt.title}" loading="lazy">
          <div class="event-card-body">
            <span class="event-card-category">${evt.category}</span>
            <h3 class="event-card-title">${evt.title}</h3>
            
            <div class="event-meta-row">
              <span class="icon">📍</span>
              <span>${evt.venue}, ${evt.city}</span>
            </div>
            
            <div class="event-meta-row">
              <span class="icon">📅</span>
              <span>${evt.date} • ${evt.time}</span>
            </div>

            <div class="event-meta-row" style="margin-top: 4px;">
              <span class="badge-tag">🎟️ ${evt.availableSeats} / ${evt.totalSeats} Available</span>
            </div>

            <div class="event-card-footer">
              <div>
                <span class="event-price-tag">From </span>
                <span class="event-price-value">$${evt.startingPrice}</span>
              </div>
              <button class="btn btn-primary" onclick="flowApp.selectAndOpenEvent('${evt.id}')">
                View & Book →
              </button>
            </div>
          </div>
        </div>
      `).join('');
    }
  },

  onSearchChange() {
    clearTimeout(this._searchTimeout);
    this._searchTimeout = setTimeout(() => this.loadEvents(), 250);
  },

  // 2. VIEW EVENT DETAILS
  async selectAndOpenEvent(eventId) {
    const res = await apiClient.getEventDetails(eventId);
    if (!res.ok || !res.data.success) {
      showToast('Could not fetch event details', 'error');
      return;
    }

    this.selectedEvent = res.data.data;
    this.selectedSeats.clear();
    this.renderEventDetails();
    this.goToStep(2);
  },

  renderEventDetails() {
    const container = document.getElementById('event-details-content');
    if (!container || !this.selectedEvent) return;

    const evt = this.selectedEvent;
    container.innerHTML = `
      <div class="event-details-hero">
        <img class="event-details-img" src="${evt.bannerUrl}" alt="${evt.title}">
        <div>
          <span class="event-card-category">${evt.category}</span>
          <h2 style="font-size: 1.8rem; font-weight: 800; margin: 8px 0 12px; color: #fff;">${evt.title}</h2>
          
          <div class="event-meta-row" style="font-size: 0.95rem;">
            <span class="icon">📍</span>
            <span>${evt.venue}, ${evt.city}</span>
          </div>
          <div class="event-meta-row" style="font-size: 0.95rem;">
            <span class="icon">📅</span>
            <span>${evt.date} at ${evt.time}</span>
          </div>
          <div class="event-meta-row" style="font-size: 0.95rem;">
            <span class="icon">🏢</span>
            <span>Organized by <strong>${evt.organizer}</strong></span>
          </div>

          <p style="color: var(--text-muted); margin: 16px 0; font-size: 0.92rem; line-height: 1.6;">
            ${evt.description}
          </p>

          <h4 style="font-size: 0.9rem; text-transform: uppercase; color: var(--text-dim); margin-top: 14px;">Available Ticket Tiers</h4>
          <div class="tier-pills-container">
            ${evt.tiers.map(t => `
              <div class="tier-pill">
                <div class="tier-pill-name">${t.name}</div>
                <div class="tier-pill-price">$${t.price}</div>
                <div class="tier-pill-perks">${t.perks}</div>
              </div>
            `).join('')}
          </div>

          <div style="margin-top: 24px; display: flex; gap: 14px;">
            <button class="btn btn-primary" style="padding: 12px 28px; font-size: 1rem;" onclick="flowApp.loadSeatMapAndProceed()">
              Select Seats on Interactive Map →
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // 3. SELECT SEATS (INTERACTIVE SEAT MAP)
  async loadSeatMapAndProceed() {
    if (!this.selectedEvent) return;
    const res = await apiClient.getAvailableTickets(this.selectedEvent.id);
    if (!res.ok || !res.data.success) {
      showToast('Could not load seat map inventory', 'error');
      return;
    }

    this.eventTicketsData = res.data.data;
    this.selectedSeats.clear();
    this.renderSeatMap();
    this.goToStep(3);
  },

  renderSeatMap() {
    const titleEl = document.getElementById('seat-map-event-title');
    const subtitleEl = document.getElementById('seat-map-event-subtitle');
    const gridContainer = document.getElementById('seat-grid-container');

    if (titleEl) titleEl.textContent = `${this.selectedEvent.title} — Seat Map`;
    if (subtitleEl) subtitleEl.textContent = `${this.selectedEvent.venue} • Real-time Available Seats: ${this.eventTicketsData.availableCount} / ${this.eventTicketsData.totalCapacity}`;

    if (!gridContainer || !this.eventTicketsData) return;

    // Group seats by Row letter (e.g. 'A', 'B', 'C')
    const rowsMap = new Map();
    for (const seat of this.eventTicketsData.seats) {
      const rowLetter = seat.seatNumber.charAt(0);
      if (!rowsMap.has(rowLetter)) {
        rowsMap.set(rowLetter, []);
      }
      rowsMap.get(rowLetter).push(seat);
    }

    gridContainer.innerHTML = Array.from(rowsMap.entries()).map(([rowLetter, seats]) => `
      <div class="seat-row">
        <span class="seat-row-label">${rowLetter}</span>
        ${seats.map(s => {
          let stateClass = 'seat-available';
          let titleHint = `${s.seatNumber} (${s.tier}) - $${s.price}`;

          if (s.status === 'BOOKED') {
            stateClass = 'seat-booked';
            titleHint = `${s.seatNumber} - Already Booked`;
          } else if (s.status === 'LOCKED') {
            stateClass = 'seat-locked';
            titleHint = `${s.seatNumber} - Temporarily Held by another user`;
          }

          const tierClass = `tier-${s.tier.toLowerCase()}`;
          const isSelected = this.selectedSeats.has(s.id);
          if (isSelected) stateClass += ' seat-selected';

          return `
            <div 
              class="seat-item ${tierClass} ${stateClass}" 
              id="seat-btn-${s.id}" 
              title="${titleHint}"
              onclick="flowApp.toggleSeatSelection('${s.id}')"
            >
              ${s.seatNumber}
            </div>
          `;
        }).join('')}
        <span class="seat-row-label">${rowLetter}</span>
      </div>
    `).join('');

    this.updateSelectionSummary();
  },

  toggleSeatSelection(seatId) {
    const seatObj = this.eventTicketsData.seats.find(s => s.id === seatId);
    if (!seatObj) return;

    if (seatObj.status === 'BOOKED') {
      showToast(`Seat ${seatObj.seatNumber} is already booked.`, 'error');
      return;
    }
    if (seatObj.status === 'LOCKED') {
      showToast(`Seat ${seatObj.seatNumber} is temporarily on hold by another buyer.`, 'warning');
      return;
    }

    if (this.selectedSeats.has(seatId)) {
      this.selectedSeats.delete(seatId);
    } else {
      if (this.selectedSeats.size >= 6) {
        showToast('Maximum 6 seats allowed per booking transaction.', 'warning');
        return;
      }
      this.selectedSeats.add(seatId);
    }

    // Update visual button
    const btn = document.getElementById(`seat-btn-${seatId}`);
    if (btn) {
      if (this.selectedSeats.has(seatId)) {
        btn.classList.add('seat-selected');
      } else {
        btn.classList.remove('seat-selected');
      }
    }

    this.updateSelectionSummary();
  },

  updateSelectionSummary() {
    const badgesContainer = document.getElementById('selected-seats-badges');
    const totalEl = document.getElementById('selection-total-price');
    const proceedBtn = document.getElementById('btn-proceed-to-hold');

    let total = 0;
    const selectedSeatObjects = [];

    for (const seatId of this.selectedSeats) {
      const seat = this.eventTicketsData.seats.find(s => s.id === seatId);
      if (seat) {
        selectedSeatObjects.push(seat);
        total += seat.price;
      }
    }

    if (badgesContainer) {
      if (selectedSeatObjects.length === 0) {
        badgesContainer.innerHTML = '<span style="color: var(--text-dim); font-size: 0.85rem;">None selected yet</span>';
      } else {
        badgesContainer.innerHTML = selectedSeatObjects.map(s => `
          <span class="badge-tag" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border-color: rgba(16, 185, 129, 0.4);">
            ${s.seatNumber} (${s.tier} $${s.price})
          </span>
        `).join('');
      }
    }

    if (totalEl) totalEl.textContent = `$${total}`;
    if (proceedBtn) {
      proceedBtn.disabled = (this.selectedSeats.size === 0);
    }
  },

  // 4. HOLD SEATS & PROCEED (TASK 5: PREVENT RACE CONDITIONS)
  async holdSeatsAndProceed() {
    if (this.selectedSeats.size === 0) return;

    const seatIds = Array.from(this.selectedSeats);
    const userId = document.getElementById('cust-email')?.value.trim() || 'jane.doe@example.com';

    showToast('Acquiring atomic seat lock (5m hold)...', 'info');

    const res = await apiClient.holdSeats(this.selectedEvent.id, seatIds, userId);
    if (!res.ok || !res.data.success) {
      showToast(res.data.message || 'Seat lock failed (Possible conflict)', 'error');
      // Refresh seat map to reflect conflict
      this.loadSeatMapAndProceed();
      return;
    }

    this.activeLockToken = res.data.data.lockToken;
    this.lockExpiresAt = res.data.data.expiresAt;

    showToast('Seat lock acquired! You have 5 minutes to checkout.', 'success');
    this.startLockCountdownTimer();
    this.populateCheckoutScreen();
    this.goToStep(4);
  },

  startLockCountdownTimer() {
    clearInterval(this.lockTimerInterval);
    const timerDisplay = document.getElementById('hold-countdown-timer');

    this.lockTimerInterval = setInterval(() => {
      const remainingMs = this.lockExpiresAt - Date.now();
      if (remainingMs <= 0) {
        clearInterval(this.lockTimerInterval);
        if (timerDisplay) timerDisplay.textContent = 'EXPIRED';
        showToast('Your seat hold has expired. Please select seats again.', 'error');
        this.goToStep(3);
        this.loadSeatMapAndProceed();
        return;
      }

      const totalSec = Math.floor(remainingMs / 1000);
      const mins = Math.floor(totalSec / 60).toString().padStart(2, '0');
      const secs = (totalSec % 60).toString().padStart(2, '0');
      if (timerDisplay) timerDisplay.textContent = `${mins}:${secs}`;
    }, 1000);
  },

  populateCheckoutScreen() {
    if (!this.selectedEvent || !this.eventTicketsData) return;

    document.getElementById('checkout-event-title').textContent = this.selectedEvent.title;
    document.getElementById('checkout-event-venue').textContent = `${this.selectedEvent.venue}, ${this.selectedEvent.city} • ${this.selectedEvent.date}`;

    let subtotal = 0;
    const seatNames = [];
    for (const seatId of this.selectedSeats) {
      const s = this.eventTicketsData.seats.find(item => item.id === seatId);
      if (s) {
        seatNames.push(s.seatNumber);
        subtotal += s.price;
      }
    }

    document.getElementById('checkout-seats-list').textContent = seatNames.join(', ');
    document.getElementById('checkout-subtotal').textContent = `$${subtotal}`;
    document.getElementById('checkout-grand-total').textContent = `$${subtotal}`;
  },

  // 5. SUBMIT BOOKING (TASK 1, 3, 4, 5)
  async submitBooking() {
    const name = document.getElementById('cust-name')?.value.trim();
    const email = document.getElementById('cust-email')?.value.trim();
    const phone = document.getElementById('cust-phone')?.value.trim();
    const payMethod = document.getElementById('pay-method')?.value || 'CREDIT_CARD';
    const simulateStatus = document.getElementById('pay-simulation-outcome')?.value || 'SUCCESS';

    if (!name || !email) {
      showToast('Please enter both name and email address.', 'warning');
      return;
    }

    const payload = {
      eventId: this.selectedEvent.id,
      customer: { name, email, phone },
      seatIds: Array.from(this.selectedSeats),
      lockToken: this.activeLockToken,
      paymentDetails: {
        method: payMethod,
        simulateStatus
      }
    };

    const submitBtn = document.getElementById('btn-confirm-booking');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing Payment...';
    }

    const res = await apiClient.bookTicket(payload);

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '💳 Confirm & Pay Now';
    }

    if (!res.ok || !res.data.success) {
      showToast(`Booking Failed (${res.status} ${res.statusText}): ${res.data.message || res.data.error}`, 'error');
      return;
    }

    clearInterval(this.lockTimerInterval);
    this.confirmedBooking = res.data.data;
    showToast('Booking successfully confirmed! HTTP 201 Created', 'success');

    this.renderConfirmationScreen();
    this.goToStep(6);
  },

  // 6. CONFIRMATION SCREEN (TASK 5 & 6)
  renderConfirmationScreen() {
    const bkg = this.confirmedBooking;
    if (!bkg) return;

    document.getElementById('ticket-booking-ref').textContent = bkg.bookingReference;
    document.getElementById('ticket-badge-status').textContent = bkg.status;
    document.getElementById('ticket-badge-status').style.color = '#34d399';
    document.getElementById('ticket-event-title').textContent = bkg.eventTitle;
    document.getElementById('ticket-event-datetime').textContent = `${bkg.eventDate} • ${bkg.eventTime}`;
    document.getElementById('ticket-event-venue').textContent = bkg.eventVenue;
    document.getElementById('ticket-customer-name').textContent = bkg.customer.name;
    document.getElementById('ticket-customer-email').textContent = bkg.customer.email;
    document.getElementById('ticket-seats-numbers').textContent = bkg.seats.map(s => s.seatNumber).join(', ');
    document.getElementById('ticket-payment-ref').textContent = bkg.payment.transactionRef;
    document.getElementById('ticket-total-paid').textContent = `$${bkg.totalAmount.toFixed(2)}`;

    // Render Canvas QR Code
    renderQRCodeCanvas('qr-code-canvas', bkg.qrCodeData);

    const cancelBtn = document.getElementById('btn-cancel-ticket');
    if (cancelBtn) {
      cancelBtn.disabled = false;
      cancelBtn.style.opacity = '1';
    }
  },

  // TASK 6: CANCEL TICKET API
  async cancelCurrentTicket() {
    if (!this.confirmedBooking) return;

    const confirmed = confirm(`Are you sure you want to cancel booking ${this.confirmedBooking.bookingReference}? This will release the seats back to available inventory and initiate a full refund of $${this.confirmedBooking.totalAmount}.`);
    if (!confirmed) return;

    const res = await apiClient.cancelTicket(this.confirmedBooking.bookingId, 'Customer requested cancellation via UI');
    if (!res.ok || !res.data.success) {
      showToast(`Cancellation failed: ${res.data.message || res.data.error}`, 'error');
      return;
    }

    const cancelData = res.data.data;
    showToast(`Booking cancelled! Seats [${cancelData.freedSeats.join(', ')}] released back to inventory. Refund $${cancelData.refund.amount} initiated.`, 'success');

    // Update UI
    const badge = document.getElementById('ticket-badge-status');
    if (badge) {
      badge.textContent = 'CANCELLED';
      badge.style.color = '#f43f5e';
      badge.style.borderColor = '#f43f5e';
    }

    const cancelBtn = document.getElementById('btn-cancel-ticket');
    if (cancelBtn) {
      cancelBtn.disabled = true;
      cancelBtn.style.opacity = '0.5';
    }

    // Trigger state update
    if (window.monitorApp) {
      window.monitorApp.refreshState();
    }
  },

  inspectInApiExplorer() {
    if (!this.confirmedBooking) return;
    const apiTabBtn = document.getElementById('tab-api-btn');
    if (apiTabBtn) apiTabBtn.click();
    showToast(`Inspect booking status using GET /api/bookings/${this.confirmedBooking.bookingId}`, 'info');
  }
};

window.flowApp = flowApp;
