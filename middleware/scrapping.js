const puppeteer = require("puppeteer");
const scrollPageToBottom = require("puppeteer-autoscroll-down");
const fs = require("fs");

const URL = "https://www.vinted.fr/";

const saveToFile = (file, content) => {
  fs.writeFile(`./data/${file}`, JSON.stringify(content), (err) => {
    console.log(`content saved in ${file}`);
    if (err) return console.log(err);
  });
};

const scrapHomePage = async () => {
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: 1600,
    height: 1600,
  });
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  /* await scrollPageToBottom(page); */
  await page.waitFor(".feed-grid__item");
  const data = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll(".feed-grid__item"));
    return elements.map((element) => {
      const owner_name = element.querySelector(".c-box__owner .u-flexbox")
        ? element.querySelector(".c-box__owner .u-flexbox").innerText
        : null;
      const owner_image = element.querySelector(".c-box__owner img")
        ? element.querySelector(".c-box__owner img").getAttribute("src")
        : null;
      const owner_link = element.querySelector(".c-box__owner a")
        ? element.querySelector(".c-box__owner a").getAttribute("href")
        : null;
      const product_image = element.querySelector(".c-box__image img")
        ? element.querySelector(".c-box__image img").getAttribute("src")
        : null;
      const product_link = element.querySelector(".c-box__image a")
        ? `https://www.vinted.fr${element
            .querySelector(".c-box__image a")
            .getAttribute("href")}`
        : null;
      const product_title = element.querySelector(".c-box__title")
        ? element.querySelector(".c-box__title").innerText
        : null;
      const product_subtitle = element.querySelector(".c-box__subtitle")
        ? element.querySelector(".c-box__subtitle").innerText
        : null;
      const product_details = element.querySelector(".c-box__details")
        ? element.querySelector(".c-box__details").innerText
        : null;
      return {
        owner_name,
        owner_image,
        owner_link,
        product_image,
        product_link,
        product_title,
        product_subtitle,
        product_details,
      };
    });
  });
  saveToFile("products.json", data);

  await browser.close();
};

scrapHomePage();
