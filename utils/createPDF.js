const Puppeteer = require('puppeteer');
const hbs = require('handlebars');
const path = require('path');
const fs = require('fs-extra');
const moment = require('moment');
//...

const compile = async function (templateName, data) {
  const filePath = path.join(process.cwd(), 'templates', `${templateName}.hbs`);

  // get the html
  const html = await fs.readFile(filePath, 'utf8');
  return hbs.compile(html)(data.toObject());
};

/**
 *
 * @param {string} templateName
 * @param {Array} data
 * @returns
 */
module.exports = async (templateName, data) => {
  try {
    const browser = await Puppeteer.launch({
      headless: true,
      ignoreDefaultArgs: ['--disable-extensions'],
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    const content = await compile(templateName, data);
    await page.setContent(content);
    await page.pdf({
      path: `monthDetails.pdf`,
      format: 'A4',
      printBackground: true,
    });

    console.log('Done create pdf');

    await browser.close();
    return true;
  } catch (error) {
    console.log('Do not create pdf');
    return false;
  }
};
