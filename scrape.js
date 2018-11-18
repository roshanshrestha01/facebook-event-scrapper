const credential = require('./credentials')
const puppeteer = require('puppeteer')

let get_link_address = async (page, selector) => {
    const link = await page.evaluate((selector) => {
        const href = document.querySelectorAll(selector)[0].getAttribute("href")
        return href
    }, selector)
    return link
}

let goTo = async (page, selector) => {
    const {
        base_url
    } = credential
    const link = await get_link_address(page, selector)
    await page.goto(`${base_url}${link}`)
    await page.waitFor(1000);
    return link
}


let scrape_event_content = async (page) => {
    const {
        scroll_event_page
    } = credential
    console.log(scroll_event_page)
    const content = await page.evaluate(async (scroll_event_page) => {

        let sleep = (time) => {
            return new Promise((resolve) => setTimeout(resolve, time));
        }

        for (let i = 0; i < scroll_event_page; i++) {
            window.scrollTo(0, document.body.scrollHeight);
            await sleep(1000)
            // window.scrollTo(0, document.body.scrollHeight);
        }

        let data = []
        const events = document.querySelectorAll("#u_0_t > div > div._5c_7._4bl7 > div > div > div:nth-child(2) > ul li")
        for (let i = 0; i < events.length - 1; i++) {
            let dct = {};
            const event = events[i];
            const title = event.querySelector('div a._7ty')
            const info = event.querySelector('div span:not(._5ls1):not(._5x8v):not(._5a4-):not([role]):not(._5a4z)').innerHTML
            const month = event.querySelector('div span._5a4-').innerHTML
            const date = event.querySelector('div span._5a4z').innerHTML
            const today = new Date()
            const year = today.getFullYear()
            let see_more = true
            while (see_more) {
                const see_more_button = event.querySelector("p._4etw a[title='See more']")
                if (see_more_button)
                    see_more_button.click()
                see_more = !see_more_button.classList.contains('_4a6u');
            }
            const description = event.querySelector("p._4etw span")
            dct['title'] = title.innerHTML
            dct['description'] = description.innerHTML
            dct['info'] = info
            dct['start_date'] = `${date} ${month}, ${year}`
            data.push(dct)
        }
        return data;
    }, scroll_event_page)
    return content;
};

let scrape = async () => {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium',
        args: ["--disable-notifications"],
        headless: false
    });

    const page = await browser.newPage();
    const {
        base_url,
        username,
        password
    } = credential

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
    // await page.waitForNavigation()
    browser.close()
    return result
};

scrape().then((value) => {
    console.log('value', value); // Success!
});