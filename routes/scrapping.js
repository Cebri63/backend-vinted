const puppeteer = require("puppeteer");

const URL = "https://www.vinted.fr/";

const getData = async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: "networkidle2" });
  await page.waitFor(12000);
  const data = await page.evaluate(() => {
    /* return [...document.querySelectorAll(".feed-grid__item")]; */
    /* return document.querySelector(".feed-grid").innerHTML; */
    /* return Array.from(document.querySelectorAll(".feed-grid__item")); */
  });

  console.log(data);

  await browser.close();
};

getData();
