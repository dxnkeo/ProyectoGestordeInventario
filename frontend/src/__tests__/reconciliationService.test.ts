import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getReconciliationReport,
  exportReconciliationCsv,
  createPhysicalCount,
  regularizeDifference,
} from '../services/reconciliationService';

const mockRow = {
  productId: 'p1',
  sku: 'SKU-001',
  productName: 'Producto',
  locationId: 'l1',
  locationName: 'Bodega',
  period: '2026-06',
  stockLogico: 10,
  reservado: 2,
  stockDisponible: 8,
  stockFisico: 9,
  diferencia: -1,
  estado: 'FALTANTE' as const,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('reconciliationService.getReconciliationReport', () => {
  it('obtiene reporte de conciliación por periodo', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [mockRow] }),
    } as Response);

    const result = await getReconciliationReport('2026-06');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/reports/reconciliation?period=2026-06'
    );
    expect(result).toEqual([mockRow]);
  });

  it('lanza Error con mensaje del servidor', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Periodo inválido.' }),
    } as Response);
    await expect(getReconciliationReport('bad')).rejects.toThrow('Periodo inválido.');
  });

  it('usa mensaje genérico si falla el parse del error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => { throw new Error('parse fail'); },
    } as Response);
    await expect(getReconciliationReport('2026-06')).rejects.toThrow(
      'Error al obtener reporte de conciliación.'
    );
  });
});

describe('reconciliationService.exportReconciliationCsv', () => {
  it('abre ventana con URL de exportación', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    exportReconciliationCsv('2026-06');
    expect(openSpy).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/reports/reconciliation/export?period=2026-06',
      '_blank'
    );
  });
});

describe('reconciliationService.createPhysicalCount', () => {
  const dto = { sku: 'SKU-001', locationId: 'l1', countedQty: 10, period: '2026-06' };

  it('registra conteo físico', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'c1', countedQty: 10 } }),
    } as Response);

    const result = await createPhysicalCount(dto);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/reports/physical-counts',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(dto) })
    );
    expect(result.countedQty).toBe(10);
  });

  it('lanza Error cuando la respuesta no es ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'SKU no encontrado.' }),
    } as Response);
    await expect(createPhysicalCount(dto)).rejects.toThrow('SKU no encontrado.');
  });

  it('usa mensaje genérico si falla el parse del error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => { throw new Error('parse fail'); },
    } as Response);
    await expect(createPhysicalCount(dto)).rejects.toThrow('Error al registrar conteo físico.');
  });
});

describe('reconciliationService.regularizeDifference', () => {
  const dto = { productId: 'p1', locationId: 'l1', period: '2026-06' };

  it('regulariza diferencia exitosamente', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { adjusted: true } }),
    } as Response);

    const result = await regularizeDifference(dto);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/reports/reconciliation/regularize',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(dto) })
    );
    expect(result.adjusted).toBe(true);
  });

  it('lanza Error con mensaje genérico', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);
    await expect(regularizeDifference(dto)).rejects.toThrow('Error al regularizar diferencia.');
  });

  it('usa mensaje genérico si falla el parse del error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => { throw new Error('parse fail'); },
    } as Response);
    await expect(regularizeDifference(dto)).rejects.toThrow('Error al regularizar diferencia.');
  });
});
