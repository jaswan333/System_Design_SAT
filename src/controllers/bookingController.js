const bookingService = require('../services/bookingService');
const seatLockManager = require('../repositories/seatLockManager');
const eventRepository = require('../repositories/eventRepository');

class BookingController {
  /**
   * Acquire seat hold during selection (prevents race condition in Step 4/5)
   * POST /api/bookings/hold
   * Status: 201 Created / 409 Conflict
   */
  async holdSeats(req, res, next) {
    try {
      const { eventId, seatIds, userId } = req.body;
      const result = bookingService.holdSeats({ eventId, seatIds, userId });
      return res.status(201).json({
        success: true,
        statusCode: 201,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Task 1 & Task 3: Book Ticket API
   * POST /api/bookings
   * Status: 201 Created / 400 Bad Request / 402 Payment Required / 409 Conflict
   */
  async bookTicket(req, res, next) {
    try {
      const { eventId, customer, seatIds, lockToken, paymentDetails } = req.body;
      const result = await bookingService.bookTicket({
        eventId,
        customer,
        seatIds,
        lockToken,
        paymentDetails
      });

      return res.status(201).json({
        success: true,
        statusCode: 201,
        message: 'Tickets successfully booked and confirmed',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Check Booking Status API
   * GET /api/bookings/:bookingId
   * Status: 200 OK / 404 Not Found
   */
  async getBooking(req, res, next) {
    try {
      const { bookingId } = req.params;
      const booking = bookingService.getBooking(bookingId);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        data: booking
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Task 6: Cancel Ticket API
   * POST /api/bookings/:bookingId/cancel
   * Status: 200 OK / 400 Bad Request / 404 Not Found
   */
  async cancelTicket(req, res, next) {
    try {
      const { bookingId } = req.params;
      const { reason } = req.body || {};
      const result = await bookingService.cancelTicket(bookingId, reason);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * List all bookings (for history & demo)
   * GET /api/bookings
   */
  async listAll(req, res, next) {
    try {
      const list = bookingService.getAllBookings();
      return res.status(200).json({
        success: true,
        statusCode: 200,
        count: list.length,
        data: list
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * System Monitoring State API
   * GET /api/system/state
   */
  async getSystemState(req, res, next) {
    try {
      const activeLocks = seatLockManager.getActiveLocks();
      const allEvents = eventRepository.findAll().map(e => eventRepository.findById(e.id).getDetails());
      const allBookings = bookingService.getAllBookings();

      return res.status(200).json({
        success: true,
        statusCode: 200,
        data: {
          timestamp: new Date().toISOString(),
          activeLocksCount: activeLocks.length,
          activeLocks,
          totalBookingsCount: allBookings.length,
          recentBookings: allBookings.slice(0, 5),
          events: allEvents
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BookingController();
