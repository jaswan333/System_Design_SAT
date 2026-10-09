const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

// Task 1: Search Event
// GET /api/events
router.get('/', eventController.searchEvents);

// Task 1: Get Event Details
// GET /api/events/:eventId
router.get('/:eventId', eventController.getEventDetails);

// Task 1: Get Available Tickets
// GET /api/events/:eventId/available-tickets
router.get('/:eventId/available-tickets', eventController.getAvailableTickets);

module.exports = router;
