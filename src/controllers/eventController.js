const eventService = require('../services/eventService');

class EventController {
  /**
   * Task 1: Search Event API
   * GET /api/events?query=...&category=...&city=...
   * HTTP 200 OK
   */
  async searchEvents(req, res, next) {
    try {
      const { query, category, city } = req.query;
      const events = eventService.searchEvents({ query, category, city });
      return res.status(200).json({
        success: true,
        statusCode: 200,
        count: events.length,
        data: events,
        meta: {
          query: query || '',
          category: category || 'ALL',
          city: city || 'ALL'
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Task 1: Get Event Details API
   * GET /api/events/:eventId
   * HTTP 200 OK / 404 Not Found
   */
  async getEventDetails(req, res, next) {
    try {
      const { eventId } = req.params;
      const eventDetails = eventService.getEventDetails(eventId);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        data: eventDetails
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Task 1: Get Available Tickets / Seats API
   * GET /api/events/:eventId/available-tickets
   * HTTP 200 OK / 404 Not Found
   */
  async getAvailableTickets(req, res, next) {
    try {
      const { eventId } = req.params;
      const { userId } = req.query;
      const result = eventService.getAvailableTickets(eventId, userId);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EventController();
