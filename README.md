# Google Search Console API Keyword Downloader

A Google Search Console API NodeJS script that downloads keywords from all search console properties

## Quick Overview

Google Search Console API is lacking documentation or examples for NodeJS. This is a basic NodeJS implementation that illustrates how to access the Google Search Console API from NodeJS using JWT Authentication as described in the [Google Drive API Quickstart documents](https://developers.google.com/drive/v3/web/quickstart/nodejs). The script downloads a list of all sites within a single account, and then saves keywords from the last 90 days as CSV files.

## Step 1: Turn on the GSC API
1. Use [this wizard](https://console.developers.google.com/start/api?id=webmasters) to create or select a project in the Google Developers Console and automatically turn on the API. Click Continue, then Go to credentials.
2. On the Add Credentials To Your Project page, click the Cancel button.
3. At the top of the page, select the OAuth consent screen tab. Select an Email address, enter a Product name if not already set, and click the Save button.
4. Select the Credentials tab, click the Create credentials button and select OAuth client ID.
5. Select the application type Other, enter the name "GSC API Keywords", and click the Create button.
6. Click OK to dismiss the resulting dialog.
7. Click the file_download (Download JSON) button to the right of the client ID.
8. Move this file to your working directory and rename it client_secret.json.

## Step 2: Installation and Initial Download

1. `git clone repo` 
2. `yarn` or `npm install`
3. `node index.js`
4. The oAuth2 request will be initiated, and instructions will print out in the terminal. These instructions will look similar to:
    ``` 
Authorize this app by visiting this url:  https://accounts.google.com/o/oauth2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fwebmasters.readonly&response_type=code&client_id=foobar.apps.googleusercontent.com&redirect_uri=urn%3fAieeee33tf%3Awg%3Aoauth%3A2.0%3Aoob Enter the code from that page here:
    ```
5. Copy the URL and paste it in your web browser 
6. login
7. Paste code in from Google. It will look something like `7Annnjy_RmTffaE//ERkp-0RygRsgavEDAnaeErTewqQ_za2143DFBnaw`
8. Any time you want to run the code you just run `node index.js` from the command line. 
9. Note: To switch accounts you must delete your previously saved credentials at `~/.credentials/gsc-credentials.json`
8. Files currently save 90 days of data automatically in `./saves`
9.. Set up a cron job if you are looking to have this done automatically

For subsequent keyword downloads, running `node index.js` is all you have to do.

## Other Notes

### The script currently...
- Retrieves all sites in account
- Covers the last 90 days (max)
- Fetches 5k keywords (max)
- Respects rate limits (5 QPS/200 QPM)
- Fetches all data for each keyword (Clicks, CTR, Impressions, Position) 
- Each property is saved as a unique CSV
  - Will not overwrite CSVs that have the same title. 
  - Saved title is `startDate to endDate - properturl.csv` (for example `2017-09-17 to 2017-12-16 - www.google.com.csv`).
- Uses a setTimeout function with a rate limit of 500 seconds instead of a proper throttle at 5 per second or 200 per minute. 
  - This should work on most connections, but there is a possibility for rate limit errors on an intermittent connection (i.e. if you're on a plane).
- Has CLI options using these flags
  - `--startDate` or `-s` --> The start date for downloading keywords. Must be formatted YYYY-MM-DD. The default is 2 days ago.
  - `--endDate` or `-e` --> The end date for downloading keywords. Must be formatted YYYY-MM-DD. The default is 92 days ago.
  - `--rowLimit` or `-l` --> The number of keywords downloaded. Can range from 1-5000. Default is 5000.
  - `--searchType` or `-t` --> The type of search. Can be "image" or "video". Defaults to "web".
  - `--dimensions` or `-d` --> The dimensions you want to include. Default is page and query.

**If you are like many SEOs and have multiple accounts for GSC. To use a different account, you must delete your previously saved credentials at ~/.credentials/gsc-credentials.json**

## Future Updates

1. In Progress: Add in the ability to take other custom argv options 
  - `dimensionFilterGroups` 
  - `dimensionFilterGroups.groupType`
  - `dimensionFilterGroups.filters.dimension`
    - `device` ('mobile','desktop','tablet') 
    - `page`
    - `country` 
    - `query` 
    - `searchAppearance`
  - `startRow`
2. Add the ability to remove erroneous or deprecated URLs that have an undefined key (i.e. tracking http://example.com and http://www.example.com but http://www.example.com was never used). Currently, the script has readonly access to the GSC api.