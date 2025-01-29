import { launch } from "jsr:@astral/astral";

type Plazo = {
  permanente: number;
  dia: number;
  semana: number;
  mes: number;
  trimestre: number;
  semestre: number;
  year: number;
  twoYears: number;
};

type Cuenta = {
  nombre: string;
  plazos: Plazo;
};

/**
 * Fetches and processes data from a remote CSV file, transposing the data and converting it into an array of `Cuenta` objects.
 *
 * @returns {Promise<Cuenta[]>} A promise that resolves to an array of `Cuenta` objects.
 *
 * @throws Will log an error to the console if the fetch operation fails.
 */
export async function getTasasService() {
  const data = await fetch("https://datawrapper.dwcdn.net/AqQwN/5/dataset.csv")
    .then((response) => response.text())
    .catch((error) => console.error(error));

  const rows = data ? data.split("\n") : [];
  const tabSeparatedData = rows.map((row) => row.split("\t"));

  // Transpose the matrix
  const transposedData: string[][] = tabSeparatedData[0].map((_, colIndex) =>
    tabSeparatedData.map((row) => row[colIndex])
  );

  const cuentas: Cuenta[] = [];

  for (let i = 1; i < transposedData.length; i++) {
    const cuenta: Cuenta = {
      nombre: transposedData[i][0],
      plazos: {
        permanente: parseFloat(transposedData[i][1].replace("%", "")),
        dia: parseFloat(transposedData[i][2].replace("%", "")),
        semana: parseFloat(transposedData[i][3].replace("%", "")),
        mes: parseFloat(transposedData[i][4].replace("%", "")),
        trimestre: parseFloat(transposedData[i][5].replace("%", "")),
        semestre: parseFloat(transposedData[i][6].replace("%", "")),
        year: parseFloat(transposedData[i][7].replace("%", "")),
        twoYears: parseFloat(transposedData[i][8].replace("%", "")),
      },
    };

    cuentas.push(cuenta);
  }

  return cuentas;
}
export default async function getUdisService() {
  let udis;
  // Launch the browser
  const browser = await launch();

  // Open a new page
  const page = await browser.newPage(
    "https://www.dof.gob.mx/indicadores_detalle.php?cod_tipo_indicador=159&dfecha=04%2F01%2F2025&hfecha=04%2F01%2F2025#gsc.tab=0"
  );

  const udisElement = await page.$$(
    'p[style="display:block;float:left;width:45%; font-size: 10pt;"]'
  );

  // TODO: refactor this to use a more robust method to get the udis value
  udis = await udisElement[1].evaluate((el: any) => el.textContent);
  udis = udis.split("  ")[1];
  udis = parseFloat(udis);

  // Close the browser
  await browser.close();
  const SEGURO_SOFIPOS= 25000; // 25,000 udis es el valor actual
  const SEGURO_BANCO= 400000; // 400,000 udis es el valor actual
/* 
se espera que la función regrese un objeto con los siguientes valores:
udis: valor de la udi
seguro_sofipos: valor del seguro de depósito para sofipos
seguro_bancos: valor del seguro de depósito para bancos
*/
  return { udis: udis,seguro_sofipos: udis*SEGURO_SOFIPOS, seguro_bancos: udis*SEGURO_BANCO, };
  
}