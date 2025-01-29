import { ElementHandle, launch } from "jsr:@astral/astral";

export async function getSofiposService() {
  // Launch the browser
  const browser = await launch();
  let sofipos = [];

  // Open a new page
  const page = await browser.newPage("https://sofipos.com/que-es-el-nicap/");

  const table = await page.$("table#tablepress-13");
  const trs = await table?.$$("tr");

  // Remove the header element
  trs?.shift();

  // If there are no rows, return an empty array
  if (trs == undefined) return { values: [] };

  sofipos = await getSofiposData(trs);

  // Close the browser
  await browser.close();

  return sofipos;
}

async function getSofiposData(trs: ElementHandle[]) {
  const sofipos = [];

  for (const tr of trs) {
    const values: string[] = [];
    const tds = trs != undefined ? await tr.$$("td") : [];
    // Get the image of the institution
    const imageInstitution = tds.length > 0 ? tds.shift() : undefined;
    const imageHtml = imageInstitution
      ? await imageInstitution.evaluate((el: any) => el.innerHTML)
      : undefined;

    // TODO: Do this in a better way
    // Get the alt text of the image
    const altMatch = imageHtml.match(/alt="([^"]*)"/);

    const nameInstitution = altMatch ? altMatch[1] : null;

    const nameArray = nameInstitution?.split("-");
    const cleanName = nameArray?.filter(
      (name: string) => name !== "nicap" && name !== "2024" && name !== "sofipo"
    );

    console.log(nameArray);

    if (tds && tds.length > 0) {
      for (const element of tds) {
        const value = await element.evaluate(
          (el: ElementHandle) => el.innerHTML
        );
        values.push(`${value}`);
      }
    }

    const sofipo = {
      name: cleanName[0],
      nicap: {
        year: 2024,
        // Note: Son porcentajes
        julio: parseFloat(values[0].replace("%", "")),
        agosto: parseFloat(values[1].replace("%", "")),
        difference: parseFloat(values[2].replace("%", "")),
        category: values[3],
      },
    };

    sofipos.push(sofipo);
  }

  return sofipos;
}
