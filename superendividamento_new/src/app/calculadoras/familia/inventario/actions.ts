'use server';

import { calcularInventario, InventarioConfig, ResultadoInventario } from '@/modules/family/inventarioEngine';

export async function calcularInventarioAction(
    config: InventarioConfig,
): Promise<ResultadoInventario[]> {
    return calcularInventario(config);
}
