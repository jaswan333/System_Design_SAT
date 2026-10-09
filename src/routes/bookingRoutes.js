const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

// Acquire temporary hold lock on seats
// POST /api/bookings/hold
router.post('/hold', bookingController.holdSeats);

// Task 1, 2, 3, 4: Book Ticket
// POST /api/bookings
router.post('/', bookingController.bookTicket);

// List all bookings
// GET /api/bookings
router.get('/', bookingController.listAll);

// Check Booking Status
// GET /api/bookings/:bookingId
router.get('/:bookingId', bookingController.getBooking);

// Task 6: Cancel Ticket
// POST /api/bookings/:bookingId/cancel
router.post('/:bookingId/cancel', bookingController.cancelTicket);

module.exports = router;
