const fs = require('fs');
const readline = require('readline');
const google = require('googleapis');
const googleAuth = require('google-auth-library');
const moment = require('moment');
const RateLimiter = require('limiter').RateLimiter;

const minuteLimiter = new RateLimiter(200, 'minute');
const secondLimiter = new RateLimiter(5, 'second');

 

// {
//   "dimensions": [
//    "page",
//    "query"
//   ],
//   "rowLimit": 5000,
//   "startDate": "2017-09-10",
//   "endDate": "2017-12-19",
//   "dimensionFilterGroups": [
//    {
//     "filters": [
//      {
//       "dimension": "searchAppearance",
//       "expression": "RICHCARD",
//       "operator": "contains"
//      }
//     ]
//    }
//   ]
//   }
  



const defaultEndDate = moment()
  .subtract(2, 'd')
  .format('YYYY-MM-DD');
const defaultStartDate = moment()
  .subtract(92, 'd')
  .format('YYYY-MM-DD');

const argv = require('yargs').options({
  startDate: {
    alias: 'sd',
    demandOption: false,
    describe:
      'The start date for downloading keywords. Must be formatted YYYY-MM-DD. The default is `${defaultStartDate}` ',
    type: 'string',
    default: defaultStartDate
  },
  endDate: {
    alias: 'ed',
    demandOption: false,
    describe:
      'The end date for downloading keywords. Must be formatted YYYY-MM-DD. The default is `${defaultEndDate}`',
    type: 'string',
    default: defaultEndDate
  },
  rowLimit: {
    alias: 'rl',
    demandOption: false,
    describe:
      'The number of keywords downloaded. Can range from 1-5000. Default is 5000.',
    type: 'number',
    default: 5000
  },
  searchType: {
    alias: 'st',
    demandOption: false,
    describe:
      'The type of search. Can be "image" or "video". Defaults to "web".',
    default: 'web',
    choices: ['image', 'web', 'video']
  },
  dimensions: {
    alias: 'd',
    demandOption: false,
    describe: 'The dimensions you want to include. Default is page and query. Other acceptable values are country, device, and searchAppearance. If you select searchAppearance it will be used as a dimension filter group for page and query.',
    default: ['page','query'],
    choices: ['page','query','country','device','searchAppearance']
  }
}).argv;

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/gsc-credentials.json
const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];
const TOKEN_DIR =
  (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) +
  '/.credentials/';
const TOKEN_PATH = TOKEN_DIR + 'gsc-credentials.json';

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Drive API.
  authorize(JSON.parse(content), getDocs);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const clientSecret = credentials.installed.client_secret;
  const clientId = credentials.installed.client_id;
  const redirectUrl = credentials.installed.redirect_uris[0];
  const auth = new googleAuth();
  const oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Lists the names and IDs of up to 10 files.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */

function getDocs(auth) {
  const webmasters = google.webmasters('v3');
  webmasters.sites.list(
    {
      auth: auth,
      rowLimit: 1000
    },
    function(err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        return;
      }
      const urlList = response.siteEntry;
      if (urlList.length === 0) {
        console.log('No URLs found.');
      } else {
        const sites = urlList.map(f => f.siteUrl);
        searchAnalyticsQuery(sites);
      }
    }
  );

  const searchAnalyticsQuery = function(sitesArr) {
    console.log(
      'This will download keywords from ' +
        argv.startDate +
        ' to ' +
        argv.endDate
    );

    if (!fs.existsSync('saves')) {
      fs.mkdirSync('saves');
    }

    sitesArr.forEach(function(site, index) {
      const limiter = sitesArr.length > 200 ? minuteLimiter : secondLimiter;

      let filename = site.replace(/(^\w+:|^)\/\//, '').replace(/\/$/, ''); // replace protocol and trailing slash
      filename =
        argv.startDate +
        ' to ' +
        argv.endDate +
        ' - ' +
        filename +
        ' - ' +
        argv.searchType +
        '.csv';

      limiter.removeTokens(1, function() {
        const sitUrlEncoded = encodeURIComponent(site);

        const query = {
          auth: auth,
          siteUrl: sitUrlEncoded,
          resource: {
            startDate: argv.startDate,
            endDate: argv.endDate,
            dimensions: argv.dimensions,
            searchType: argv.searchType,
            rowLimit: argv.rowLimit,
            aggregationType: "byPage"
          }
        }
        webmasters.searchanalytics.query(query,
          function(err, response) {
            if (err) {
              console.log('The API returned an error: ' + err);
              return;
            } else {
              console.log(JSON.stringify(response))
              let rows = response.rows;
              console.log(rows);
              if (rows === undefined) {
                console.log(
                  `this rows is undefined for ${site}`
                );
              } else {
                // console.log(`Keys: ${JSON.stringify(rows).length}`)
                }
              }
            }
        );
      });
    });
  };
}
