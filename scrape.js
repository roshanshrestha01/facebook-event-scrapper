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
            await sleep(2000)
        }

        let data = []
        const events = document.querySelectorAll("#u_0_t > div > div._5c_7._4bl7 > div > div > div:nth-child(2) > ul li")
        for (let i = 0; i < events.length - 1; i++) {
            const event = events[i];
            data.push(event.getAttribute('id').replace(/anchor.+/g, ''))
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

    let results = []
    const event_ids = await scrape_event_content(page)

    check_directory(data_path)

    let image_not_found_events = []
    console.log('Total events:', event_ids.length)
    console.log('Event detail page visit start ...')
    for (idx in event_ids) {
        event_id = event_ids[idx]
        const event_detail_url = event_url.replace('${eventId}', event_id)
        console.log('Fetching...', event_detail_url)
        await page.goto(event_detail_url);
        await page.waitFor(2)
        const event_data = await page.evaluate(async (event_id) => {
            let sleep = (time) => {
                return new Promise((resolve) => setTimeout(resolve, time));
            }

            let getInnerHTMLOrNull = (element) => {
                if (element)
                    return element.innerHTML
                return null
            }

            let getAttributeOrNull = (element, attr) => {
                if (element)
                    return element.getAttribute(attr)
                return null
            }

            await sleep(500)

            let dct = {}

            let selector = {
                'title': '#seo_h1_tag',
                'date': '#title_subtitle > span',
                'venue': {
                    'one_day': '._xkh a._5xhk',
                    'multi_day': '._xkh a._5xhk',
                    'video': '._xkh a'
                },
                'location': {
                    'one_day': '._xkh a._5xhk + div',
                    'multi_day': '._xkh a._5xhk + div',
                    'video': '._xkh a + div',
                },
                'timeinfo': {
                    'one_day': '#event_time_info > div > table > tbody > tr > td._51m-._4930._phw._51mw > div > div > div:nth-child(2) > div > div._2ycp._5xhk',
                    'multi_day': '#event_time_info > a > table > tbody > tr > td._51m-._51mw > div > div._4dpf._phw > div > div:nth-child(2) > div > div._2ycp._5xhk',
                    'video': '#event_time_info > div > table > tbody > tr > td._51m-._4930._phw._51mw > div > div > div:nth-child(2) > div > div._2ycp._5xhk',
                },
                'organizer': {
                    'one_day': '#title_subtitle > div > div > div > div > div > a:nth-child(1)',
                    'multi_day': '#title_subtitle > div > a',
                    'video': '#title_subtitle > div > div > div > div > div > a',
                }
            }

            const title = document.querySelector(selector.title)
            const date = document.querySelector(selector.date)

            let selector_key = 'one_day'

            if (!date) {
                selector_key = 'multi_day'
            }

            const video = document.querySelector('video#u_0_13')
            if (video) {
                selector_key = 'video'
            }

            const venue = document.querySelector(selector.venue[selector_key])
            const location = document.querySelector(selector.location[selector_key])
            const timeinfo = document.querySelector(selector.timeinfo[selector_key])
            const organizer = document.querySelector(selector.organizer[selector_key])
            dct['id'] = event_id
            dct['selector'] = selector_key
            dct['title'] = getInnerHTMLOrNull(title)
            dct['date'] = getAttributeOrNull(date, 'title')
            dct['venue'] = getInnerHTMLOrNull(venue)
            dct['location'] = getInnerHTMLOrNull(location)
            dct['time_info'] = getInnerHTMLOrNull(timeinfo)
            dct['time_content'] = getAttributeOrNull(timeinfo, 'content')
            dct['organizer'] = getInnerHTMLOrNull(organizer)

            const see_more = document.querySelector('._63eo')
            if (see_more)
                see_more.click()

            const description = document.querySelector('div._63ew')
            dct['description'] = getInnerHTMLOrNull(description)

            if (selector_key == 'multi_day') {
                const events_date = document.querySelectorAll('._1oa6 > div')
                let _event_date = []
                let _time_content = []
                for (let i = 0; i < events_date.length; i++) {
                    const event_date = events_date[i];
                    event_date.click()
                    await sleep(500)
                    const _datetimediv = document.querySelector(selector.timeinfo[selector_key])
                    const datetime_content = getAttributeOrNull(_datetimediv, 'content')
                    _time_content.push(datetime_content)
                    const _datetime = datetime_content.split(' to ')
                    const _start_date = new Date(_datetime[0])
                    const _end_date = new Date(_datetime[1])
                    _event_date.push(
                        [_start_date.toLocaleString(), _end_date.toLocaleString()]
                    )
                }
                dct['time_content'] = _time_content
                dct['event_day'] = _event_date
            } else {
                const datetime = dct['time_content'].split(' to ')
                const start_date = new Date(datetime[0])
                const end_date = new Date(datetime[1])
                dct['event_day'] = [[start_date.toLocaleString(), end_date.toLocaleString()]]
            }


            const show_map = document.querySelector('#u_0_1g a')
            if (show_map) {
                show_map.click()
                await sleep(500)
            }
            const map = document.querySelector('._4j7v > img')

            if (map) {
                const map_src = getAttributeOrNull(map, 'src')
                const map_regex = 'markers.*&'
                const found = map_src.match(map_regex)
                if (found) {
                    const marker = found[0].replace('markers=', '').replace('&', '').split('%2C')
                    dct['latitude'] = marker[0]
                    dct['longitude'] = marker[1]
                }
            }

            
            const cover_link = document.querySelector('#event_header_primary > div:nth-child(1) > div._3kwh > a')
            if (cover_link) {
                cover_link.click()
                await sleep(1000)
                const image = document.querySelector('#photos_snowlift > div._n9 > div > div.fbPhotoSnowliftContainer.snowliftPayloadRoot.uiContextualLayerParent > div.clearfix.fbPhotoSnowliftPopup > div.stageWrapper.lfloat._ohe > div.stage > div._2-sx > img')
                dct['image_url'] = getAttributeOrNull(image, 'src')
            } else {
                dct['image_url'] = null
            }
            
            
            const categories = document.querySelectorAll('div._62hs._4-u3 > div > ul > li > a')
            let categories_data = []
            for (let i = 0; i < categories.length; i++) {
                const category = categories[i];
                categories_data.push(getInnerHTMLOrNull(category))
            }
            dct['categories'] = categories_data
            return dct
        }, event_id)
        results.push(event_data)
        if (event_data.image_url) {
            await download(event_data.image_url, event_id, function () {
                console.log('done')
            })
        } else {
            image_not_found_events.push(event_id)
            console.log(`Cannot find image for ${event_id}.`)
        }
    }

    const data = {
        'events_without_image': image_not_found_events,
        'results': results
    }
    fs.writeFile(`${data_path}/scrape.json`, JSON.stringify(data), 'utf8');

    browser.close()
    return results
};

scrape().then((value) => {
    console.log('Finish'); // Success!
});