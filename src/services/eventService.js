const eventRepository = require('../repositories/eventRepository');
const seatLockManager = require('../repositories/seatLockManager');

class EventService {
  /**
   * Search events with query, category, and city filters
   */
  searchEvents({ query = '', category = '', city = '' } = {}) {
    return eventRepository.findAll({ query, category, city });
  }

  /**
   * Get complete details of an event
   */
  getEventDetails(eventId) {
    const event = eventRepository.findById(eventId);
    if (!event) {
      const error = new Error(`Event with ID '${eventId}' not found.`);
      error.statusCode = 404;
      throw error;
    }
    return event.getDetails();
  }

  /**
   * Get available seats and ticket tiers for an event
   */
  getAvailableTickets(eventId, callerUserId = null) {
    const event = eventRepository.findById(eventId);
    if (!event) {
      const error = new Error(`Event with ID '${eventId}' not found.`);
      error.statusCode = 404;
      throw error;
    }

    const allSeats = event.getAllSeats();
    
    // Map with real-time lock status
    const seatsWithRealtimeStatus = allSeats.map(seat => {
      const isLocked = seatLockManager.isSeatLocked(eventId, seat.id, callerUserId);
      let effectiveStatus = seat.status;
      if (effectiveStatus === 'AVAILABLE' && isLocked) {
        effectiveStatus = 'LOCKED';
      }
      return {
        id: seat.id,
        seatNumber: seat.seatNumber,
        tier: seat.tier,
        price: seat.price,
        status: effectiveStatus,
        isSelectable: effectiveStatus === 'AVAILABLE' || (effectiveStatus === 'LOCKED' && !isLocked)
      };
    });

    const availableSeats = seatsWithRealtimeStatus.filter(s => s.status === 'AVAILABLE');

    // Group availability by tier
    const tiersSummary = event.tiers.map(tier => {
      const tierSeats = seatsWithRealtimeStatus.filter(s => s.tier === tier.name);
      return {
        tierName: tier.name,
        price: tier.price,
        perks: tier.perks,
        totalSeats: tierSeats.length,
        availableSeats: tierSeats.filter(s => s.status === 'AVAILABLE').length
      };
    });

    return {
      eventId: event.id,
      eventTitle: event.title,
      venue: event.venue,
      totalCapacity: allSeats.length,
      availableCount: availableSeats.length,
      tiers: tiersSummary,
      seats: seatsWithRealtimeStatus
    };
  }
}

module.exports = new EventService();
