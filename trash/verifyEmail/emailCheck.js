const dns = require('dns');
const net = require('net');

/**
 *
 * @param {string}
 * @returns {Promise<boolean>}
 */
async function verifyEmail(email) {
    // проверка адреса
    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValidEmail(email)) {
        return false;
    }

    const [localPart, domain] = email.split('@'); // сплитаем адрес на части

    return new Promise((resolve) => {
        dns.resolveMx(domain, (err, addresses) => {
            if (err || addresses.length === 0) {
                // если записи нет, пробуем найти a записи
                dns.resolve(domain, (errA, addressesA) => {
                    if (errA || addressesA.length === 0) {
                        return resolve(false);
                    }
                    connectToSmtp(addressesA[0]); 
                });
                return;
            }

            // берём сервер с самым высоким приоритетом и чекаем его через smtp
            addresses.sort((a, b) => a.priority - b.priority);
            const mxHost = addresses[0].exchange;
            connectToSmtp(mxHost);
        });

        /**
         * 
         * @param {string} mxHost - smtp сервер
         */
        function connectToSmtp(mxHost) {
            const client = net.createConnection(25, mxHost);

            client.on('connect', () => {
                client.write(`HELO test\r\n`);
                client.write(`MAIL FROM:<test@example.com>\r\n`);
                client.write(`RCPT TO:<${email}>\r\n`);
            });

            let success = false;

            // обработка ответов
            client.on('data', (data) => {
                const response = data.toString();
                if (response.startsWith('250')) success = true; // адрес существуте
                else if (response.startsWith('550') || response.startsWith('450')) success = false; // адреса не существует
            });

            client.on('end', () => resolve(success));

            client.on('error', () => resolve(false));

            setTimeout(() => {
                client.end();
            }, 10000);
        }
    });
}

// юзаем bas для вызова функции
(async () => {
    const emailToVerify = _argument; // получаем наш адрес
    const result = await verifyEmail(emailToVerify)
    _result = result; // возвращаем результат в bas (true или false)
})();
