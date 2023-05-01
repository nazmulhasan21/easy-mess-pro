const Puppeteer = require('puppeteer');
const hbs = require('handlebars');
const path = require('path');
const fs = require('fs-extra');
const moment = require('moment');
const { degrees, PDFDocument, StandardFonts, rgb } = require('pdf-lib');
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
      //  args: ['--no-sandbox', '--disable-setuid-sandbox'],
      args: ['--lang=bn-BD,bn'],
    });
    const page = await browser.newPage();

    // Set the language for the page to Bangali
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'bn',
    });

    const content = await compile(templateName, data);
    await page.setContent(content);
    await page.pdf({
      path: `monthDetails.pdf`,
      format: 'A4',
      printBackground: true,
      margin: 50,
      extraHTTPHeaders: {
        'Accept-Language': 'bn',
      },
      preferCSSPageSize: true,
      // Use a custom font that supports Bangali characters
      // For example, you can download a free Bangali font from Google Fonts:
      // https://fonts.google.com/specimen/Bangla
      // Then, load the font in your HTML/CSS and specify it here:
      // See https://developers.google.com/fonts/docs/getting_started#specifying_font_families_and_styles_in_a_stylesheet
      // for instructions on how to load Google Fonts in your HTML/CSS.
      // fontFamily: 'Bangla, sans-serif',
    });
    console.log('Done create pdf');

    // Add watermark to PDF

    const pdfDoc = await PDFDocument.load(
      fs.readFileSync(path.join(process.cwd(), 'monthDetails.pdf'))
    );

    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const imageBytes = fs.readFileSync(
      path.join(process.cwd(), 'easy-mess-app.jpeg')
    );
    const image = await pdfDoc.embedJpg(imageBytes);
    for (const page of pages) {
      const { width, height } = page.getSize();
      const fontSize = 50;
      console.log(width);
      const text = 'Easy               Mess App';
      const textWidth = font.widthOfTextAtSize(text, fontSize);

      page.drawImage(image, {
        x: width / 2,
        y: height / 2 - 100,
        width: 200,
        height: 200,
        rotate: degrees(45),
        opacity: 0.1,
      });
      page.drawText(text, {
        x: width / 2 - 150,
        y: height / 2 - 120,
        size: fontSize,
        font: font,
        color: rgb(0.1, 0.8, 0.9),
        rotate: degrees(45),
        opacity: 0.2,
      });
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync('monthDetails_watermark.pdf', pdfBytes);
    console.log('Done create pdf with watermark');

    await browser.close();
    return true;
  } catch (error) {
    // console.log('Do not create pdf');
    // console.log(error);
    return false;
  }
};
