const express = require('express');
const cors = require('cors');
const path = require('path');

const eventRoutes = require('./src/routes/eventRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const bookingController = require('./src/controllers/bookingController');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.get('/api/system/state', bookingController.getSystemState);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'Event Ticket Booking System (LLD)',
    timestamp: new Date().toISOString()
  });
});

// 404 Handler for undefined API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    error: 'NOT_FOUND',
    message: `API endpoint '${req.method} ${req.originalUrl}' does not exist.`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    statusCode,
    error: err.name || 'API_ERROR',
    message: err.message || 'Internal Server Error'
  };

  if (err.unavailableSeats) {
    response.unavailableSeats = err.unavailableSeats;
  }
  if (err.conflictSeat) {
    response.conflictSeat = err.conflictSeat;
  }

  res.status(statusCode).json(response);
});

// Fallback to index.html for SPA-style routing if needed
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🎟️  EVENT TICKET BOOKING SYSTEM - LLD ENGINE STARTED`);
    console.log(`📍  Server running at: http://localhost:${PORT}`);
    console.log(`📡  REST APIs available:`);
    console.log(`    - GET  /api/events                       (Search Events)`);
    console.log(`    - GET  /api/events/:id                   (Get Event Details)`);
    console.log(`    - GET  /api/events/:id/available-tickets (Get Available Tickets)`);
    console.log(`    - POST /api/bookings/hold                (Hold Seat - Concurrency lock)`);
    console.log(`    - POST /api/bookings                     (Book Ticket)`);
    console.log(`    - GET  /api/bookings/:id                 (Check Booking Status)`);
    console.log(`    - POST /api/bookings/:id/cancel          (Cancel Ticket)`);
    console.log(`    - GET  /api/system/state                 (Live Lock & Inventory Monitor)`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
