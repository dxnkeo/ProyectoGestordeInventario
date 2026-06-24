import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOutboundEvents, retryOutboundEvent } from '../services/eventService';

const mockEvent = {
  id: 'ev-1',
  eventType: 'stock_received',
  payload: { sku_id: 'SKU-001' },
  status: 'PENDING' as const,
  attempts: 0,
  maxAttempts: 5,
  createdAt: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('eventService.getOutboundEvents', () => {
  it('obtiene eventos sin filtro', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [mockEvent] }),
    } as Response);

    const result = await getOutboundEvents();
    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/events/outbox');
    expect(result).toEqual([mockEvent]);
  });

  it('filtra por status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    await getOutboundEvents('FAILED');
    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/events/outbox?status=FAILED');
  });

  it('lanza Error cuando la respuesta no es ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as Response);
    await expect(getOutboundEvents()).rejects.toThrow('Error al obtener eventos outbox.');
  });
});

describe('eventService.retryOutboundEvent', () => {
  it('reintenta evento y lo retorna', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { ...mockEvent, status: 'PENDING' } }),
    } as Response);

    const result = await retryOutboundEvent('ev-1');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/events/outbox/ev-1/retry',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.status).toBe('PENDING');
  });

  it('lanza Error con mensaje del servidor', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Evento no encontrado.' }),
    } as Response);
    await expect(retryOutboundEvent('no-existe')).rejects.toThrow('Evento no encontrado.');
  });

  it('usa mensaje genérico si falla el parse del error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => { throw new Error('parse fail'); },
    } as Response);
    await expect(retryOutboundEvent('ev-1')).rejects.toThrow('Error al reintentar evento.');
  });
});
