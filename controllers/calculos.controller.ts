import { getResultado } from "../services/calculos.service.ts";
import { inversionParams } from "../types/inversionParams.types.ts";

export function getCalculos(params:inversionParams) {
    return getResultado(params);
}