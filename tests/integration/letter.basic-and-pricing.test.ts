import request from 'supertest';
import { testApp } from '../helpers/testApp';
import { FakeClock } from '../helpers/FakeClock';
import { FakeExchangeRateProvider } from '../helpers/FakeExchangeRateProvider';

function setup() {
  const clock = new FakeClock(new Date('2024-01-01T00:00:00.000Z'));
  const exchangeRateProvider = new FakeExchangeRateProvider().alwaysSucceedWith({
    ARS: 1000,
    BRL: 5.4,
    EUR: 0.92,
    CLP: 950,
    UYU: 40,
    MXN: 18,
  });
  const { app } = testApp({ clock, exchangeRateProvider });
  return { app };
}

describe('Letter — basic flow and pricing (B1-B4, P1-P4)', () => {
  it('B1: PAX-001 + AA001 economy -> COMPLETED without errors', async () => {
    const { app } = setup();
    const res = await request(app)
      .post('/reservations/process')
      .send({
        reservations: [
          { id: 'B1', passengerId: 'PAX-001', flightCode: 'AA001', origin: 'MIA', destination: 'JFK', seatClass: 'economy' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.results[0].status).toBe('COMPLETED');
    expect(res.body.results[0].errors).toEqual([]);
  });

  it('B2: PAX-999 (non-existent) -> REJECTED with PASSENGER_NOT_FOUND, rest of the filters skipped', async () => {
    const { app } = setup();
    const res = await request(app)
      .post('/reservations/process')
      .send({
        reservations: [
          { id: 'B2', passengerId: 'PAX-999', flightCode: 'AA001', origin: 'MIA', destination: 'JFK', seatClass: 'economy' },
        ],
      });

    const result = res.body.results[0];
    expect(result.status).toBe('REJECTED');
    expect(result.errors).toContainEqual(expect.objectContaining({ code: 'PASSENGER_NOT_FOUND' }));
    const otherSteps = result.trace.filter((step: { filter: string }) => step.filter !== 'PassengerValidation');
    expect(otherSteps.length).toBeGreaterThan(0);
    otherSteps.forEach((step: { status: string }) => expect(step.status).toBe('skipped'));
  });

  it('B3: LA8070 (0 seats) -> REJECTED with NO_SEATS_AVAILABLE', async () => {
    const { app } = setup();
    const res = await request(app)
      .post('/reservations/process')
      .send({
        reservations: [
          { id: 'B3', passengerId: 'PAX-001', flightCode: 'LA8070', origin: 'GRU', destination: 'SCL', seatClass: 'economy' },
        ],
      });

    const result = res.body.results[0];
    expect(result.status).toBe('REJECTED');
    expect(result.errors).toContainEqual(expect.objectContaining({ code: 'NO_SEATS_AVAILABLE' }));
  });

  it('B4: a malformed item and a valid one in the same batch -> malformed REJECTED with detail, valid processed (200)', async () => {
    const { app } = setup();
    const res = await request(app)
      .post('/reservations/process')
      .send({
        reservations: [
          { id: 'B4-bad', passengerId: 'PAX-001' },
          {
            id: 'B4-good',
            passengerId: 'PAX-001',
            flightCode: 'AA001',
            origin: 'MIA',
            destination: 'JFK',
            seatClass: 'economy',
          },
        ],
      });

    expect(res.status).toBe(200);
    const [bad, good] = res.body.results;
    expect(bad.status).toBe('REJECTED');
    expect(bad.errors.length).toBeGreaterThan(0);
    expect(good.status).toBe('COMPLETED');
  });

  it('P1: PAX-001/AA001 economy -> total 265.00 USD', async () => {
    const { app } = setup();
    const res = await request(app)
      .post('/reservations/process')
      .send({
        reservations: [
          { id: 'P1', passengerId: 'PAX-001', flightCode: 'AA001', origin: 'MIA', destination: 'JFK', seatClass: 'economy' },
        ],
      });

    expect(res.body.results[0].pricing.totalUSD).toBe(265);
  });

  it('P2: PAX-002 Gold / AA001 economy -> loyalty discount 30, total 231.40', async () => {
    const { app } = setup();
    const res = await request(app)
      .post('/reservations/process')
      .send({
        reservations: [
          { id: 'P2', passengerId: 'PAX-002', flightCode: 'AA001', origin: 'MIA', destination: 'JFK', seatClass: 'economy' },
        ],
      });

    const pricing = res.body.results[0].pricing;
    expect(pricing.loyaltyDiscountUSD).toBe(30);
    expect(pricing.totalUSD).toBe(231.4);
  });

  it('P3: PAX-003 child Gold / AR1300 business -> subtotal 159.38, total 223.50', async () => {
    const { app } = setup();
    const res = await request(app)
      .post('/reservations/process')
      .send({
        reservations: [
          { id: 'P3', passengerId: 'PAX-003', flightCode: 'AR1300', origin: 'EZE', destination: 'GRU', seatClass: 'business' },
        ],
      });

    const pricing = res.body.results[0].pricing;
    expect(pricing.subtotalUSD).toBe(159.38);
    expect(pricing.totalUSD).toBe(223.5);
  });

  it('P4: PAX-004 senior Silver / IB6844 first -> subtotal 2448, total 3022.76', async () => {
    const { app } = setup();
    const res = await request(app)
      .post('/reservations/process')
      .send({
        reservations: [
          { id: 'P4', passengerId: 'PAX-004', flightCode: 'IB6844', origin: 'EZE', destination: 'MAD', seatClass: 'first' },
        ],
      });

    const pricing = res.body.results[0].pricing;
    expect(pricing.subtotalUSD).toBe(2448);
    expect(pricing.totalUSD).toBe(3022.76);
  });
});
