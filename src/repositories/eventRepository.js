const { Event, Seat } = require('../models');

class EventRepository {
  constructor() {
    this.events = new Map();
    this._seedInitialData();
  }

  _seedInitialData() {
    // Event 1: Neon Symphony Live in Concert
    const event1 = new Event({
      id: 'evt_music_fest_2026',
      title: 'Neon Symphony: Immersive World Tour',
      category: 'Concert',
      venue: 'Metropolis Arena & Hall',
      city: 'San Francisco',
      date: '2026-11-15',
      time: '19:30',
      bannerUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
      description: 'An electrifying multi-genre concert experience featuring immersive holographic visuals, live orchestra, and world-class vocalists.',
      organizer: 'Sonic Pulse Live',
      tiers: [
        { name: 'VIP', price: 180, perks: 'Front orchestra, VIP lounge pass, complimentary drink' },
        { name: 'PREMIUM', price: 110, perks: 'Center acoustic tier, priority stadium entry' },
        { name: 'STANDARD', price: 65, perks: 'Upper bowl tiered seating, full visual stage view' }
      ]
    });

    const tiersConfig = [
      { rows: ['A', 'B'], tier: 'VIP', price: 180 },
      { rows: ['C', 'D'], tier: 'PREMIUM', price: 110 },
      { rows: ['E', 'F'], tier: 'STANDARD', price: 65 }
    ];

    for (const group of tiersConfig) {
      for (const row of group.rows) {
        for (let col = 1; col <= 8; col++) {
          const seatNo = `${row}${col}`;
          const seatId = `seat_${seatNo}`;
          const isPreBooked = (row === 'A' && (col === 3 || col === 4)) || (row === 'D' && col === 5);
          const seat = new Seat(seatId, event1.id, seatNo, group.tier, group.price, isPreBooked ? 'BOOKED' : 'AVAILABLE');
          event1.addSeat(seat);
        }
      }
    }
    this.events.set(event1.id, event1);

    // Event 2: Global AI & System Architecture Summit
    const event2 = new Event({
      id: 'evt_ai_summit_2026',
      title: 'Global Tech & System Architecture Summit',
      category: 'Conference',
      venue: 'Silicon Convention Center',
      city: 'Seattle',
      date: '2026-12-05',
      time: '09:00',
      bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
      description: 'Premier engineering summit diving deep into high-concurrency microservices, low-level design patterns, and distributed event systems.',
      organizer: 'Distributed Systems Council',
      tiers: [
        { name: 'VIP', price: 350, perks: 'Speaker dinner, VIP Workshop pass' },
        { name: 'PREMIUM', price: 220, perks: 'Full track access, Networking buffet' },
        { name: 'STANDARD', price: 120, perks: 'Main hall keynote pass' }
      ]
    });

    for (const group of tiersConfig) {
      for (const row of group.rows) {
        for (let col = 1; col <= 8; col++) {
          const seatNo = `${row}${col}`;
          const seatId = `seat_${seatNo}`;
          const isPreBooked = (row === 'B' && col === 2) || (row === 'E' && col === 6);
          const seat = new Seat(seatId, event2.id, seatNo, group.tier, group.price, isPreBooked ? 'BOOKED' : 'AVAILABLE');
          event2.addSeat(seat);
        }
      }
    }
    this.events.set(event2.id, event2);

    // Event 3: Champions League Football Championship
    const event3 = new Event({
      id: 'evt_champions_final_2026',
      title: 'Grand Champions Cup Final 2026',
      category: 'Sports',
      venue: 'Titan National Stadium',
      city: 'New York',
      date: '2026-11-28',
      time: '20:00',
      bannerUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
      description: 'The monumental championship showdown under the stadium floodlights with over 80,000 screaming football fans.',
      organizer: 'International Sports League',
      tiers: [
        { name: 'VIP', price: 290, perks: 'Skybox luxury seating, fieldside view' },
        { name: 'PREMIUM', price: 160, perks: 'Lower bowl midfield seats' },
        { name: 'STANDARD', price: 80, perks: 'Upper tier panoramic stadium view' }
      ]
    });

    for (const group of tiersConfig) {
      for (const row of group.rows) {
        for (let col = 1; col <= 8; col++) {
          const seatNo = `${row}${col}`;
          const seatId = `seat_${seatNo}`;
          const isPreBooked = (row === 'A' && col === 1) || (row === 'C' && col === 4);
          const seat = new Seat(seatId, event3.id, seatNo, group.tier, group.price, isPreBooked ? 'BOOKED' : 'AVAILABLE');
          event3.addSeat(seat);
        }
      }
    }
    this.events.set(event3.id, event3);

    // Event 4: Midnight Jazz & Soul Sessions
    const event4 = new Event({
      id: 'evt_jazz_nights_2026',
      title: 'Midnight Jazz & Soul Experience',
      category: 'Concert',
      venue: 'Blue Velvet Symphony Lounge',
      city: 'San Francisco',
      date: '2026-12-18',
      time: '21:00',
      bannerUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1200&q=80',
      description: 'An intimate candlelit jazz night celebrating soulful improvisations, brass trios, and vintage acoustic performances.',
      organizer: 'Golden Gate Sounds',
      tiers: [
        { name: 'VIP', price: 140, perks: 'Front stage candle table & bottle service' },
        { name: 'PREMIUM', price: 95, perks: 'Elevated mezzanine club seating' },
        { name: 'STANDARD', price: 50, perks: 'Lounge bar admission' }
      ]
    });

    for (const group of tiersConfig) {
      for (const row of group.rows) {
        for (let col = 1; col <= 8; col++) {
          const seatNo = `${row}${col}`;
          const seatId = `seat_${seatNo}`;
          const seat = new Seat(seatId, event4.id, seatNo, group.tier, group.price, 'AVAILABLE');
          event4.addSeat(seat);
        }
      }
    }
    this.events.set(event4.id, event4);
  }

  findAll({ query = '', category = '', city = '' } = {}) {
    const list = Array.from(this.events.values());
    return list.filter(evt => {
      const matchQuery = !query || 
        evt.title.toLowerCase().includes(query.toLowerCase()) || 
        evt.description.toLowerCase().includes(query.toLowerCase()) ||
        evt.venue.toLowerCase().includes(query.toLowerCase());
      
      const matchCategory = !category || 
        category === 'ALL' ||
        evt.category.toLowerCase().includes(category.toLowerCase());
      
      const matchCity = !city || 
        city === 'ALL' ||
        evt.city.toLowerCase().includes(city.toLowerCase());

      return matchQuery && matchCategory && matchCity;
    }).map(evt => evt.getSummary());
  }

  findById(id) {
    return this.events.get(id) || null;
  }

  save(event) {
    this.events.set(event.id, event);
    return event;
  }
}

module.exports = new EventRepository();
