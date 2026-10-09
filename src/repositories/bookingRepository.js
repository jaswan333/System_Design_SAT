class BookingRepository {
  constructor() {
    this.bookings = new Map(); // bookingId -> Booking
    this.refIndex = new Map(); // bookingReference -> bookingId
  }

  save(booking) {
    this.bookings.set(booking.id, booking);
    this.refIndex.set(booking.bookingReference, booking.id);
    return booking;
  }

  findById(bookingId) {
    return this.bookings.get(bookingId) || null;
  }

  findByReference(reference) {
    const id = this.refIndex.get(reference);
    return id ? this.bookings.get(id) : null;
  }

  findAll() {
    return Array.from(this.bookings.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

module.exports = new BookingRepository();
