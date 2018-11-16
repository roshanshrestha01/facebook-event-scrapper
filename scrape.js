import credentials from './credentials'
const puppeteer = require('puppeteer');


let get_link_address = async (page, selector) => {
    console.log('asdf')
    const address = await page.evaluate(() => {
        console.log('inner', document.querySelectorAll(selector)[0].getAttribute("href"))
        return document.querySelectorAll(selector)[0].getAttribute("href")
    })
    console.log('address', address)
    return address
}


let scrape = async () => {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium',
        headless: false
    });

    const page = await browser.newPage();
    const base_url = 'https://www.facebook.com' 
    await page.goto(base_url);
    await page.type('#email', credentail.username);
    await page.type('#pass', credentail.password);
    await page.click('#loginbutton input');
    await page.waitForNavigation()

    console.log('init')
    let address
    await page.evaluate(() => {
        console.log(document.querySelectorAll('#navItem_2344061033 > a')[0].getAttribute("href"))
        address = document.querySelectorAll('#navItem_2344061033 > a')[0].getAttribute("href")
        return document.querySelectorAll('#navItem_2344061033 > a')[0].getAttribute("href")
      })
    console.log(address)
    console.log('end')
    // const event_link = get_link_address(page, '#navItem_2344061033 > a')
    //     .then((data) => {
    //         console.log(data)
    //     })
    // console.log(event_link)

    await page.goto(`${base_url}${event_link}`)
    
    await page.waitForNavigation()

    // await page.evaluate(() => {
    //     return document.querySelectorAll('#navItem_2344061033 > a')[0].getAttribute("href")
    // })

    // await pa
    
    // await page.waitForNavigation()
    await page.screenshot({path: 'fb.png'});
    browser.close()
    const result = 'asdf'
    return result
};

scrape().then((value) => {
    console.log(value); // Success!
});