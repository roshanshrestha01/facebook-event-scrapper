const credential = require('./credentials')
const puppeteer = require('puppeteer');

let get_link_address = async (page, selector) => {
    const link = await page.evaluate((selector) => {
        const href = document.querySelectorAll(selector)[0].getAttribute("href")
        return href
    }, selector)
    return link
}

let goTo = async (page, selector) => {
    const {base_url} = credential
    const link = await get_link_address(page, selector)
    await page.goto(`${base_url}${link}`)
    await page.waitFor(1000);
    return link
}


let scrape_event_content = async (page) => {
    const content = await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
        setTimeout(function(){ window.scrollTo(0, document.body.scrollHeight);; }, 2000);
        return 'content';
    })
    return content;
};

let scrape = async () => {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium',
        args: ["--disable-notifications"],
        headless: false
    });

    const page = await browser.newPage();
    const {base_url, username, password} = credential

    await page.goto(base_url);
    await page.type('#email', username);
    await page.type('#pass', password);
    await page.click('#loginbutton input');
    await page.waitForNavigation()

    console.log('Navigate to Event page.')
    await goTo(page, '#navItem_2344061033 > a')

    console.log('Navigate to Discover page.')
    await goTo(page, '#u_0_u > div:nth-child(4) > a')

    const result = await scrape_event_content(page)
    
    // await page.screenshot({
    //     path: 'fb.png'
    // });

    browser.close()
    return result
};

scrape().then((value) => {
    console.log('value', value); // Success!
});