const eventRepository = require('../repositories/eventRepository');
const bookingRepository = require('../repositories/bookingRepository');
const seatLockManager = require('../repositories/seatLockManager');
const paymentService = require('./paymentService');
const { Booking } = require('../models');

class BookingService {
  /**
   * Acquire a temporary hold on seats for checkout (Task 5 prerequisite to prevent race conditions)
   */
  holdSeats({ eventId, seatIds, userId = 'guest_user' }) {
    if (!eventId) {
      const error = new Error('Event ID is required.');
      error.statusCode = 400;
      throw error;
    }
    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      const error = new Error('Please select at least one seat to hold.');
      error.statusCode = 400;
      throw error;
    }

    const event = eventRepository.findById(eventId);
    if (!event) {
      const error = new Error(`Event '${eventId}' not found.`);
      error.statusCode = 404;
      throw error;
    }

    // Check each seat validity
    const checkSeatFn = (seatId) => {
      const seat = event.getSeat(seatId);
      return seat && seat.status === 'AVAILABLE';
    };

    const result = seatLockManager.acquireLocks(eventId, seatIds, userId, checkSeatFn);

    if (!result.success) {
      const error = new Error(result.error);
      error.statusCode = 409; // Conflict
      error.conflictSeat = result.conflictSeat;
      throw error;
    }

    return {
      success: true,
      eventId,
      lockedSeats: result.lockedSeats,
      lockToken: result.lockToken,
      expiresAt: result.expiresAt,
      ttlSeconds: result.ttlSeconds,
      message: `Seats held for ${result.ttlSeconds} seconds. Complete payment before expiration.`
    };
  }

  /**
   * Book Ticket API (Task 1, Task 3, Task 4)
   * Orchestrates seat verification, payment processing, booking creation and state update.
   */
  async bookTicket({
    eventId,
    customer,
    seatIds,
    lockToken = null,
    paymentDetails = { method: 'CREDIT_CARD', simulateStatus: 'SUCCESS' }
  }) {
    // 1. Validation
    if (!eventId) {
      const err = new Error('Missing required field: eventId.');
      err.statusCode = 400;
      throw err;
    }
    if (!customer || !customer.name || !customer.email) {
      const err = new Error('Missing customer information (name and email are required).');
      err.statusCode = 400;
      throw err;
    }
    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      const err = new Error('At least one seat must be selected for booking.');
      err.statusCode = 400;
      throw err;
    }

    // 2. Fetch Event
    const event = eventRepository.findById(eventId);
    if (!event) {
      const err = new Error(`Event '${eventId}' not found.`);
      err.statusCode = 404;
      throw err;
    }

    // 3. Verify Seats & Calculate Amount
    const bookedSeatObjects = [];
    let totalAmount = 0;

    for (const seatId of seatIds) {
      const seat = event.getSeat(seatId);
      if (!seat) {
        const err = new Error(`Seat '${seatId}' does not exist for event '${eventId}'.`);
        err.statusCode = 404;
        throw err;
      }

      // Check if seat is permanently booked
      if (seat.status === 'BOOKED') {
        const err = new Error(`Seat ${seat.seatNumber} is already booked by another user.`);
        err.statusCode = 409; // HTTP 409 Conflict
        err.unavailableSeats = [seat.seatNumber];
        throw err;
      }

      // Check if locked by someone else
      const isLockedByOther = seatLockManager.isSeatLocked(eventId, seatId, customer.email, lockToken);
      if (isLockedByOther) {
        const err = new Error(`Seat ${seat.seatNumber} is temporarily on hold by another customer.`);
        err.statusCode = 409; // HTTP 409 Conflict
        err.unavailableSeats = [seat.seatNumber];
        throw err;
      }

      bookedSeatObjects.push({
        id: seat.id,
        seatNumber: seat.seatNumber,
        tier: seat.tier,
        price: seat.price
      });
      totalAmount += seat.price;
    }

    // 4. Temporary Booking ID for Payment reference
    const bookingId = `bkg_${Math.random().toString(36).substring(2, 10)}`;
    const bookingRef = `EVT-${Math.floor(10000 + Math.random() * 90000)}`;

    // 5. Execute Payment
    const paymentResult = await paymentService.processPayment({
      bookingId,
      amount: totalAmount,
      currency: 'USD',
      method: paymentDetails.method || 'CREDIT_CARD',
      simulateStatus: paymentDetails.simulateStatus || 'SUCCESS'
    });

    if (!paymentResult.success) {
      // Payment Failed: release any lock
      if (lockToken) {
        seatLockManager.releaseLocks(eventId, seatIds, lockToken);
      }
      const err = new Error(paymentResult.message || 'Payment processing failed.');
      err.statusCode = 402; // Payment Required
      throw err;
    }

    // 6. Transition Seats to BOOKED
    for (const seatId of seatIds) {
      const seat = event.getSeat(seatId);
      if (seat) {
        seat.book();
      }
    }

    // Release temporary lock now that seats are permanently booked
    seatLockManager.releaseLocks(eventId, seatIds, lockToken);

    // 7. Create & Persist Booking
    const booking = new Booking({
      id: bookingId,
      bookingReference: bookingRef,
      eventId: event.id,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone || 'N/A'
      },
      seats: bookedSeatObjects,
      totalAmount,
      currency: 'USD',
      status: 'CONFIRMED',
      paymentId: paymentResult.paymentId,
      paymentMethod: paymentDetails.method || 'CREDIT_CARD'
    });

    bookingRepository.save(booking);

    return {
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      status: booking.status,
      eventId: event.id,
      eventTitle: event.title,
      eventVenue: event.venue,
      eventDate: event.date,
      eventTime: event.time,
      customer: booking.customer,
      seats: booking.seats,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      payment: {
        paymentId: paymentResult.paymentId,
        status: 'SUCCESS',
        transactionRef: paymentResult.transactionRef,
        method: booking.paymentMethod
      },
      bookedAt: booking.createdAt,
      qrCodeData: booking.qrPayload
    };
  }

  /**
   * Check Booking Status (Task: Check booking status)
   */
  getBooking(bookingIdentifier) {
    let booking = bookingRepository.findById(bookingIdentifier);
    if (!booking) {
      booking = bookingRepository.findByReference(bookingIdentifier);
    }
    if (!booking) {
      const err = new Error(`Booking with reference or ID '${bookingIdentifier}' was not found.`);
      err.statusCode = 404;
      throw err;
    }
    const event = eventRepository.findById(booking.eventId);
    return {
      ...booking,
      eventTitle: event ? event.title : 'Unknown Event',
      eventVenue: event ? event.venue : 'Unknown Venue',
      eventDate: event ? event.date : 'N/A',
      eventTime: event ? event.time : 'N/A'
    };
  }

  /**
   * Cancel Ticket API (Task 6)
   * Cancels booking, releases seats back to inventory, and triggers refund.
   */
  async cancelTicket(bookingIdentifier, reason = 'Customer requested cancellation') {
    let booking = bookingRepository.findById(bookingIdentifier);
    if (!booking) {
      booking = bookingRepository.findByReference(bookingIdentifier);
    }
    if (!booking) {
      const err = new Error(`Booking '${bookingIdentifier}' not found.`);
      err.statusCode = 404;
      throw err;
    }

    if (booking.status === 'CANCELLED') {
      const err = new Error(`Booking '${booking.bookingReference}' is already cancelled.`);
      err.statusCode = 400; // Bad Request
      throw err;
    }

    // 1. Release Seats back to AVAILABLE
    const event = eventRepository.findById(booking.eventId);
    if (event) {
      for (const seatItem of booking.seats) {
        const seat = event.getSeat(seatItem.id);
        if (seat) {
          seat.release();
        }
      }
    }

    // 2. Trigger Refund
    const refundResult = await paymentService.processRefund({
      paymentId: booking.paymentId,
      refundAmount: booking.totalAmount,
      reason
    });

    // 3. Mark Booking as CANCELLED
    booking.cancel(reason, 1.0);
    bookingRepository.save(booking);

    return {
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      status: booking.status,
      cancelledAt: booking.cancelledAt,
      reason: booking.cancellationReason,
      refund: {
        refundId: refundResult.refundId,
        refundRef: refundResult.refundRef,
        amount: booking.refundAmount,
        currency: booking.currency,
        status: refundResult.status
      },
      freedSeats: booking.seats.map(s => s.seatNumber),
      message: `Booking ${booking.bookingReference} has been successfully cancelled. ${booking.seats.length} seats released back to available inventory. Refund of $${booking.refundAmount} initiated.`
    };
  }

  getAllBookings() {
    return bookingRepository.findAll();
  }
}

module.exports = new BookingService();
