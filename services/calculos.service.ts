import { inversionParams } from "../types/inversionParams.types.ts";

// Definición de interfaces para estructurar los datos
interface Banco {
  nombre: string;
  plazos: {
    dia?: number;
    semana?: number;
    mes?: number;
    trimestre?: number;
    semestre?: number;
    year?: number;
    twoYears?: number;
  };
}

interface Resultado {
  montoInicial: number;
  rendimientoTotal: number;
  inversiones: { nombre: string; tipo: "banco" | "sofipo"; montoAsignado: number; rendimiento: number }[];
}

interface Sofipo {
  name: string;
  nicap: {
    year: number;
    julio: number;
    agosto: number;
    difference: number;
    category: string;
  };
}

interface UdisResponse {
  udis: number;
  seguro_sofipos: number;
  seguro_bancos: number;
}

// Función principal que calcula el resultado de la inversión
export async function getResultado(params: inversionParams): Promise<Resultado> {
  const { monto_a_invertir, fija_o_flexible, modelo_de_inversion } = params;

  // Obtener datos necesarios
  const tasas = await obtenerTasasBancos();
  const valoresSofipos = await obtenerValoresSofipos();
  const { seguro_sofipos, seguro_bancos } = await obtenerValoresUdis();

  // Calcular rendimientos de bancos y Sofipos
  const bancosConRendimiento = calcularRendimientosBancos(tasas, valoresSofipos, modelo_de_inversion);
  bancosConRendimiento.sort((a, b) => b.tasa - a.tasa);

  // Filtrar los mejores bancos y Sofipos
  const mejoresBancos = bancosConRendimiento.filter(banco => banco.valorSofipo === 0);
  const mejoresSofipos = bancosConRendimiento.filter(banco => banco.valorSofipo > 0);

  // Calcular días de inversión según el modelo
  const diasInversion = {
    DIA: 1,
    SEMANA: 7,
    MES: 30,
    TRIMESTRE: 90,
    SEMESTRE: 180,
    YEAR: 365,
    TWO_YEARS: 365 * 2,
  }[modelo_de_inversion] || 0;

  // Distribuir el monto y calcular las inversiones
  const { inversiones, rendimientoTotal } = distribuirMonto(
    monto_a_invertir,
    seguro_bancos,
    seguro_sofipos,
    mejoresBancos,
    mejoresSofipos,
    diasInversion
  );

  return {
    montoInicial: monto_a_invertir,
    rendimientoTotal: Math.round(rendimientoTotal),
    inversiones: inversiones,
  };
}

// Función para obtener las tasas de interés de los bancos
async function obtenerTasasBancos(): Promise<Banco[]> {
  const response = await fetch("http://0.0.0.0:8000/tasas");
  if (!response.ok) {
    throw new Error("No se pudieron obtener las tasas");
  }
  return await response.json();
}

// Función para obtener los valores de las Sofipos
async function obtenerValoresSofipos(): Promise<Sofipo[]> {
  const validacion = await fetch("http://0.0.0.0:8000/sofipos");
  if (!validacion.ok) {
    throw new Error("No se pudieron obtener los valores de las sofipos");
  }
  return await validacion.json();
}

// Función para obtener los valores de UDIS y seguros
async function obtenerValoresUdis(): Promise<UdisResponse> {
  const udisResponse = await fetch("http://0.0.0.0:8000/udis");
  if (!udisResponse.ok) {
    throw new Error("No se pudieron obtener los valores de UDIS");
  }
  return await udisResponse.json();
}

// Función para calcular los rendimientos de los bancos y Sofipos
function calcularRendimientosBancos(tasas: Banco[], valoresSofipos: Sofipo[], modelo_de_inversion: string) {
  return tasas.map(banco => {
    const tasa = obtenerTasaPorModelo(banco, modelo_de_inversion);
    const valorSofipo = obtenerValorSofipo(banco, valoresSofipos);
    return {
      nombre: banco.nombre,
      tasa: tasa,
      valorSofipo: valorSofipo,
    };
  });
}

// Función para obtener la tasa de interés según el modelo de inversión
function obtenerTasaPorModelo(banco: Banco, modelo_de_inversion: string): number {
  switch (modelo_de_inversion) {
    case "DIA":
      return banco.plazos.dia || 0;
    case "SEMANA":
      return banco.plazos.semana || 0;
    case "MES":
      return banco.plazos.mes || 0;
    case "TRIMESTRE":
      return banco.plazos.trimestre || 0;
    case "SEMESTRE":
      return banco.plazos.semestre || 0;
    case "YEAR":
      return banco.plazos.year || 0;
    case "TWO YEARS":
      return banco.plazos.twoYears || 0;
    default:
      console.log("Modelo de inversión no reconocido");
      return 0;
  }
}

// Función para obtener el valor de la Sofipo correspondiente al banco
function obtenerValorSofipo(banco: Banco, valoresSofipos: Sofipo[]): number {
  const nombreBancoNormalizado = banco.nombre.toLowerCase().replace(/\s/g, '');
  const sofipo = valoresSofipos.find(sofipo => 
    sofipo.name.toLowerCase().replace(/\s/g, '') === nombreBancoNormalizado
  );
  return sofipo?.nicap.difference || 0;
}

// Función para calcular el rendimiento de una inversión
function calcularRendimiento(tasa: number | undefined, dias: number, monto: number): number {
  if (tasa == null) return 0;
  return (monto * (tasa / 100) / 365) * dias;
}

// Función para distribuir el monto entre bancos y Sofipos
function distribuirMonto(
  monto_a_invertir: number,
  seguro_bancos: number,
  seguro_sofipos: number,
  mejoresBancos: { nombre: string; tasa: number }[],
  mejoresSofipos: { nombre: string; tasa: number }[],
  diasInversion: number
):
{ inversiones: { nombre: string; tipo: "banco" | "sofipo"; montoAsignado: number; rendimiento: number }[], rendimientoTotal: number } {
  let inversiones: { nombre: string; tipo: "banco" | "sofipo"; montoAsignado: number; rendimiento: number }[] = [];
  let rendimientoTotal = 0;

  // Caso 1: El monto es mayor que el seguro de los bancos
  if (monto_a_invertir > seguro_bancos) {
    // Dividir el monto: una parte para bancos, otra para Sofipos
    const montoBancos = seguro_bancos;
    const montoSofipos = monto_a_invertir - seguro_bancos;
    // Calcular inversiones en bancos
    const inversionesBancos = calcularRendimientoFondo(mejoresBancos.slice(0, 3), montoBancos, diasInversion, true);
    // Calcular inversiones en Sofipos
    const inversionesSofipos = calcularRendimientoFondo(mejoresSofipos.slice(0, 3), montoSofipos, diasInversion, true);
    // Combinar ambas listas de inversiones
    inversiones = [...inversionesBancos, ...inversionesSofipos];
    rendimientoTotal = inversiones.reduce((sum, inv) => sum + inv.rendimiento, 0);
  }

  // Caso 2: El monto es menor que el seguro de los bancos pero mayor que el de las Sofipos
  else if (monto_a_invertir > seguro_sofipos) {
    // Invertir todo el monto en los 3 mejores bancos
    inversiones = calcularRendimientoFondo(mejoresBancos.slice(0, 3), monto_a_invertir, diasInversion, true);
    rendimientoTotal = inversiones.reduce((sum, inv) => sum + inv.rendimiento, 0);  }

  // Caso 3: El monto es menor que el seguro de las Sofipos
  else {
    // Combinar todas las opciones (bancos y Sofipos)
    const todasInversiones = [...mejoresBancos, ...mejoresSofipos];
    inversiones = calcularRendimientoFondo(todasInversiones, monto_a_invertir, diasInversion, false);
    rendimientoTotal = inversiones.reduce((sum, inv) => sum + inv.rendimiento, 0);
  }

  return { inversiones, rendimientoTotal };
}

// Función para calcular el rendimiento de un fondo de inversión
function calcularRendimientoFondo(
  fondos: { nombre: string; tasa: number }[],
  montoTotal: number,
  dias: number,
  dividirMonto: boolean
): { nombre: string; tipo: "banco" | "sofipo"; montoAsignado: number; rendimiento: number }[] {
  return fondos.map(fondo => {
    // Si dividirMonto es true, el monto se divide entre todos los fondos
    const montoAsignado = dividirMonto ? montoTotal / fondos.length : montoTotal;

    // Calcular el rendimiento usando la fórmula: (monto * tasa / 100 / 365) * días
    const rendimiento = calcularRendimiento(fondo.tasa, dias, montoAsignado);

    // Determinar si es un banco o una Sofipo
    const tipo = fondo.tasa === 0 ? "sofipo" : "banco";

    return {
      nombre: fondo.nombre,
      tipo: tipo,
      montoAsignado: montoAsignado,
      rendimiento: rendimiento,
    };
  });
}