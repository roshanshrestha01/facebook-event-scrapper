module.exports = { 
    base_url: 'https://www.facebook.com',
    username: 'input your fb username',
    password: 'password',
    executablePath: '/usr/bin/chromium',
    headless: true,
    event_url : 'https://www.facebook.com/events/${eventId}',
    media_path: __dirname + '/../fb/media',
    data_path: __dirname + '/../fb',
    scroll_event_page: 1
}