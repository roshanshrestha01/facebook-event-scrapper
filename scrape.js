const credential = require('./credentials')
const puppeteer = require('puppeteer');


let get_link_address = async (page, selector) => {
    const link = await page.evaluate((selector) => {
        const href = document.querySelectorAll(selector)[0].getAttribute("href")
        return href
    }, selector)
    return link
}


let scrape_event_content = async (page) => {
    return 'test';
};

let scrape = async () => {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium',
        headless: false
    });

    const page = await browser.newPage();
    const base_url = 'https://www.facebook.com'

    await page.goto(base_url);
    await page.type('#email', credential.username);
    await page.type('#pass', credential.password);
    await page.click('#loginbutton input');
    await page.waitForNavigation()

    console.log('Navigate to Event page.')
    const event_link = await get_link_address(page, '#navItem_2344061033 > a')
    await page.goto(`${base_url}${event_link}`)

    console.log('Navigate to Discover page.')
    await page.waitFor(2000);
    const discover_link = await get_link_address(page, '#u_0_u > div:nth-child(4) > a')
    await page.goto(`${base_url}${discover_link}`)
    await page.waitFor(2000);

    await page.screenshot({
        path: 'fb.png'
    });
    browser.close()
    const result = await scrape_event_content(page)
    return result
};

scrape().then((value) => {
    console.log('value', value); // Success!
});