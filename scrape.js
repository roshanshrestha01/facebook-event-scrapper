const credential = require('./credentials')
const puppeteer = require('puppeteer')
const fs = require('fs')
const request = require('request')


let check_directory = (path) => {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
}

let download = (uri, filename, callback) => {
    request.head(uri, function (err, res, body) {
        console.log('content-type:', res.headers['content-type']);
        console.log('content-length:', res.headers['content-length']);
        const dir = credential.media_path
        check_directory(dir)
        request(uri).pipe(fs.createWriteStream(`${dir}/${filename}.png`)).on('close', callback);
    });
};

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
            dct['id'] = event.getAttribute('id').replace(/anchor.+/g, '')
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
        event_url,
        data_path,
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
    const event_ids = result.map(element => {
        return element['id']
    });

    check_directory(data_path)
    const json = JSON.stringify(result);
    fs.writeFile(`${data_path}/scrape.json`, json, 'utf8');


    console.log('Event detail page visit start ...')
    for (idx in event_ids) {
        event_id = event_ids[idx]
        const event_detail_url = event_url.replace('${eventId}', event_id)
        console.log('Fetching...', event_detail_url)
        await page.goto(event_detail_url);
        await page.waitFor(2)
        const image_url = await page.evaluate(async () => {
            let sleep = (time) => {
                return new Promise((resolve) => setTimeout(resolve, time));
            }
            const cover_link = document.querySelector('#event_header_primary > div:nth-child(1) > div._3kwh > a')
            if (!cover_link) 
                await sleep(1000)
            cover_link.click()
            await sleep(1000)
            const image = document.querySelector('#photos_snowlift > div._n9 > div > div.fbPhotoSnowliftContainer.snowliftPayloadRoot.uiContextualLayerParent > div.clearfix.fbPhotoSnowliftPopup > div.stageWrapper.lfloat._ohe > div.stage > div._2-sx > img')
            const image_url = image.getAttribute('src')
            return image_url
        })
        await download(image_url, event_id, function () {
            console.log('done')
        })

    }
    browser.close()
    return result
};

scrape().then((value) => {
    console.log(result); // Success!
});