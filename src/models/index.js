/**
 * Domain Models for Event Ticket Booking System
 */

class Seat {
  /**
   * @param {string} id - Unique seat ID (e.g., 'A1', 'VIP-1')
   * @param {string} eventId
   * @param {string} seatNumber - Display seat number ('A1', 'B2', etc.)
   * @param {string} tier - 'VIP' | 'PREMIUM' | 'STANDARD'
   * @param {number} price
   * @param {string} status - 'AVAILABLE' | 'LOCKED' | 'BOOKED'
   */
  constructor(id, eventId, seatNumber, tier, price, status = 'AVAILABLE') {
    this.id = id;
    this.eventId = eventId;
    this.seatNumber = seatNumber;
    this.tier = tier;
    this.price = price;
    this.status = status;
    this.lockedBy = null; // userId or draftSessionId
    this.lockExpiresAt = null;
  }

  isAvailable() {
    if (this.status === 'AVAILABLE') return true;
    if (this.status === 'LOCKED' && this.lockExpiresAt && Date.now() > this.lockExpiresAt) {
      // Expired lock treated as available
      return true;
    }
    return false;
  }

  lock(userId, ttlMs = 300000) { // 5 minutes default
    this.status = 'LOCKED';
    this.lockedBy = userId;
    this.lockExpiresAt = Date.now() + ttlMs;
  }

  release() {
    this.status = 'AVAILABLE';
    this.lockedBy = null;
    this.lockExpiresAt = null;
  }

  book() {
    this.status = 'BOOKED';
    this.lockedBy = null;
    this.lockExpiresAt = null;
  }
}

class Event {
  /**
   * @param {Object} data
   */
  constructor({
    id,
    title,
    category,
    venue,
    city,
    date,
    time,
    bannerUrl,
    description,
    organizer,
    tiers = []
  }) {
    this.id = id;
    this.title = title;
    this.category = category;
    this.venue = venue;
    this.city = city;
    this.date = date;
    this.time = time;
    this.bannerUrl = bannerUrl;
    this.description = description;
    this.organizer = organizer;
    this.tiers = tiers; // [{ name: 'VIP', price: 150, rows: ['A'], cols: 6 }, ...]
    this.seats = new Map(); // seatId -> Seat instance
  }

  addSeat(seat) {
    this.seats.set(seat.id, seat);
  }

  getSeat(seatId) {
    return this.seats.get(seatId);
  }

  getAllSeats() {
    return Array.from(this.seats.values());
  }

  getAvailableSeats() {
    return this.getAllSeats().filter(seat => seat.isAvailable());
  }

  getSummary() {
    const totalSeats = this.seats.size;
    const availableSeats = this.getAvailableSeats().length;
    return {
      id: this.id,
      title: this.title,
      category: this.category,
      venue: this.venue,
      city: this.city,
      date: this.date,
      time: this.time,
      bannerUrl: this.bannerUrl,
      organizer: this.organizer,
      startingPrice: Math.min(...this.tiers.map(t => t.price)),
      totalSeats,
      availableSeats
    };
  }

  getDetails() {
    const totalSeats = this.seats.size;
    const availableSeats = this.getAvailableSeats().length;
    return {
      ...this.getSummary(),
      description: this.description,
      tiers: this.tiers,
      seatInventory: {
        total: totalSeats,
        available: availableSeats,
        booked: this.getAllSeats().filter(s => s.status === 'BOOKED').length,
        locked: this.getAllSeats().filter(s => s.status === 'LOCKED' && !s.isAvailable()).length
      }
    };
  }
}

class Booking {
  /**
   * @param {Object} data
   */
  constructor({
    id,
    bookingReference,
    eventId,
    customer,
    seats = [],
    totalAmount,
    currency = 'USD',
    status = 'CONFIRMED',
    paymentId = null,
    paymentMethod = 'CREDIT_CARD'
  }) {
    this.id = id;
    this.bookingReference = bookingReference;
    this.eventId = eventId;
    this.customer = customer; // { name, email, phone }
    this.seats = seats; // Array of seat summaries { id, seatNumber, tier, price }
    this.totalAmount = totalAmount;
    this.currency = currency;
    this.status = status; // 'CONFIRMED' | 'CANCELLED' | 'PENDING'
    this.paymentId = paymentId;
    this.paymentMethod = paymentMethod;
    this.createdAt = new Date().toISOString();
    this.cancelledAt = null;
    this.cancellationReason = null;
    this.refundAmount = 0;
    this.qrPayload = `TKT:${bookingReference}|EVT:${eventId}|SEATS:${seats.map(s => s.seatNumber).join(',')}|USR:${customer.email}`;
  }

  cancel(reason = 'Customer request', refundPercentage = 1.0) {
    this.status = 'CANCELLED';
    this.cancelledAt = new Date().toISOString();
    this.cancellationReason = reason;
    this.refundAmount = Number((this.totalAmount * refundPercentage).toFixed(2));
  }
}

class Payment {
  constructor({
    id,
    bookingId,
    amount,
    currency = 'USD',
    method = 'CREDIT_CARD',
    status = 'SUCCESS',
    transactionRef
  }) {
    this.id = id;
    this.bookingId = bookingId;
    this.amount = amount;
    this.currency = currency;
    this.method = method;
    this.status = status;
    this.transactionRef = transactionRef;
    this.timestamp = new Date().toISOString();
  }
}

module.exports = {
  Seat,
  Event,
  Booking,
  Payment
};
