/**
 * Automated Verification Script for Event Ticket Booking System
 * Validates all Round 2 LLD Tasks:
 *  1. Search Event
 *  2. Get Event Details
 *  3. Get Available Tickets
 *  4. Book Ticket (Request & Response validation)
 *  5. Sequence Verification & Concurrency Conflict check
 *  6. Cancel Ticket API & Seat inventory release check
 */

const eventService = require('../src/services/eventService');
const bookingService = require('../src/services/bookingService');
const seatLockManager = require('../src/repositories/seatLockManager');

async function runTests() {
  console.log('--- STARTING LLD AUTOMATED TEST SUITE ---\n');
  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
    }
  }

  try {
    // Test 1: Search Events
    const searchResults = eventService.searchEvents({ query: 'Symphony' });
    assert(searchResults.length > 0 && searchResults[0].id === 'evt_music_fest_2026', 'Task 1.1: Search Event by query returns matching events');

    // Test 2: Get Event Details
    const eventDetails = eventService.getEventDetails('evt_music_fest_2026');
    assert(eventDetails.id === 'evt_music_fest_2026' && eventDetails.tiers.length === 3, 'Task 1.2: Get Event Details returns full details and tiers');

    // Test 3: Get Available Tickets
    const availableTickets = eventService.getAvailableTickets('evt_music_fest_2026');
    assert(availableTickets.availableCount > 0 && availableTickets.seats.length > 0, 'Task 1.3: Get Available Tickets returns real-time seats and counts');

    // Test 4: Concurrency Hold / Lock
    const holdResult = bookingService.holdSeats({
      eventId: 'evt_music_fest_2026',
      seatIds: ['seat_A5', 'seat_A6'],
      userId: 'user_alice'
    });
    assert(holdResult.success && holdResult.lockToken, 'Task 5.1: Concurrency Seat Hold acquires lock with TTL');

    // Test 5: Conflict check (another user trying to hold the same seat)
    let conflictCaught = false;
    try {
      bookingService.holdSeats({
        eventId: 'evt_music_fest_2026',
        seatIds: ['seat_A5'],
        userId: 'user_bob'
      });
    } catch (err) {
      conflictCaught = (err.statusCode === 409);
    }
    assert(conflictCaught, 'Task 4: Concurrency Conflict returns HTTP 409 when seat is locked');

    // Test 6: Book Ticket (Task 1.4, Task 3 & 4)
    const bookingResult = await bookingService.bookTicket({
      eventId: 'evt_music_fest_2026',
      customer: {
        name: 'Alice Cooper',
        email: 'alice@example.com',
        phone: '+1-555-0100'
      },
      seatIds: ['seat_A5', 'seat_A6'],
      lockToken: holdResult.lockToken,
      paymentDetails: { method: 'CREDIT_CARD', simulateStatus: 'SUCCESS' }
    });
    assert(
      bookingResult.bookingId &&
      bookingResult.status === 'CONFIRMED' &&
      bookingResult.seats.length === 2 &&
      bookingResult.payment.status === 'SUCCESS',
      'Task 3 & 4: Book Ticket successfully creates confirmed booking with payment receipt'
    );

    // Test 7: Check Booking Status
    const bookingStatus = bookingService.getBooking(bookingResult.bookingId);
    assert(bookingStatus.status === 'CONFIRMED' && bookingStatus.customer.name === 'Alice Cooper', 'Check Booking Status returns valid booking details');

    // Test 8: Double booking on already booked seat should return 409 Conflict
    let doubleBookingConflict = false;
    try {
      await bookingService.bookTicket({
        eventId: 'evt_music_fest_2026',
        customer: { name: 'Charlie', email: 'charlie@example.com' },
        seatIds: ['seat_A5']
      });
    } catch (err) {
      doubleBookingConflict = (err.statusCode === 409);
    }
    assert(doubleBookingConflict, 'Task 4: Booking already-booked seat returns HTTP 409 Conflict');

    // Test 9: Cancel Ticket API (Task 6)
    const cancelResult = await bookingService.cancelTicket(bookingResult.bookingId, 'Emergency reschedule');
    assert(
      cancelResult.status === 'CANCELLED' &&
      cancelResult.refund.status === 'REFUNDED' &&
      cancelResult.freedSeats.includes('A5'),
      'Task 6: Cancel Ticket marks booking CANCELLED and initiates refund'
    );

    // Test 10: Verify seats are released back to AVAILABLE
    const refreshedEvent = eventService.getAvailableTickets('evt_music_fest_2026');
    const seatA5 = refreshedEvent.seats.find(s => s.id === 'seat_A5');
    assert(seatA5 && seatA5.status === 'AVAILABLE', 'Task 6 Verification: Cancelled seats are immediately returned to AVAILABLE inventory');

    console.log(`\n========================================`);
    console.log(`TEST SUMMARY: ${passed}/${total} TESTS PASSED!`);
    console.log(`========================================\n`);
  } catch (err) {
    console.error('Unexpected error during test execution:', err);
  }
}

runTests();
