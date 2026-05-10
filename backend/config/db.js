const { execFileSync } = require('child_process');
const dns = require('dns').promises;
const mongoose = require('mongoose');

const runPowerShellJson = (script, arg) => {
    const output = execFileSync('powershell.exe', [
        '-NoProfile',
        '-Command',
        `& { param($name) ${script} }`,
        arg
    ], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
    }).trim();

    return output ? JSON.parse(output) : null;
};

const resolveSrvWithWindowsDns = (hostname) => {
    const srvName = `_mongodb._tcp.${hostname}`;

    const srvRecords = runPowerShellJson(
        '$ErrorActionPreference = "Stop"; Resolve-DnsName -Type SRV $name | Select-Object NameTarget,Port | ConvertTo-Json -Compress',
        srvName
    );

    const txtRecords = runPowerShellJson(
        '$ErrorActionPreference = "Stop"; Resolve-DnsName -Type TXT $name | ForEach-Object { $_.Strings -join "" } | ConvertTo-Json -Compress',
        hostname
    );

    const srvList = Array.isArray(srvRecords) ? srvRecords : [srvRecords];
    const txtList = Array.isArray(txtRecords) ? txtRecords : [txtRecords].filter(Boolean);

    return {
        hosts: srvList.map((record) => `${record.NameTarget.replace(/\.$/, '')}:${record.Port}`),
        txtOptions: txtList
    };
};

const buildStandardMongoUri = (srvUri) => {
    const url = new URL(srvUri);
    const { hosts, txtOptions } = resolveSrvWithWindowsDns(url.hostname);

    if (!hosts.length) {
        throw new Error(`No MongoDB SRV records found for ${url.hostname}`);
    }

    const params = new URLSearchParams(url.searchParams);

    txtOptions.forEach((optionString) => {
        const txtParams = new URLSearchParams(optionString);

        txtParams.forEach((value, key) => {
            if (!params.has(key)) {
                params.set(key, value);
            }
        });
    });

    if (!params.has('tls') && !params.has('ssl')) {
        params.set('tls', 'true');
    }

    const password = url.password ? `:${url.password}` : '';
    const auth = url.username ? `${url.username}${password}@` : '';
    const query = params.toString();

    return `mongodb://${auth}${hosts.join(',')}${url.pathname}${query ? `?${query}` : ''}`;
};

const getMongoUri = async () => {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
        throw new Error('Missing MongoDB URI. Add MONGODB_URI to backend/.env.');
    }

    if (!mongoUri.startsWith('mongodb+srv://')) {
        return mongoUri;
    }

    const url = new URL(mongoUri);

    try {
        await dns.resolveSrv(`_mongodb._tcp.${url.hostname}`);
        return mongoUri;
    } catch (error) {
        if (process.platform !== 'win32' || error.code !== 'ECONNREFUSED') {
            throw error;
        }

        console.warn('Node DNS refused the MongoDB SRV lookup; using Windows DNS fallback.');
        return buildStandardMongoUri(mongoUri);
    }
};

const connectDB = async () => {
    try {
        const mongoUri = await getMongoUri();

        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 10000
        });

        console.log('MongoDB Connected');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
