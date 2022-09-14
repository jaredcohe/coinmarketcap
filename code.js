/*
  This google script pulls crypto prices from Coinmarketcap's API based on token IDs.
  Get list of token IDs from google sheet, pull prices from Coinmarketcap API, write those prices to the sheet.
  Replace YOUR_API_KEY with your API key.
  Use the template sheet CryptoPriceList.
  https://docs.google.com/spreadsheets/d/1GK-ya5TGQjrQtzrfH2owUYart-DLoWK_OlMVzw8x-GQ/edit#gid=984890815
  @jaredcohe
*/

// Function that runs on clicking the button in the sheet
function updatePrices() {
    // Get google sheet object
    var CryptoPriceListSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("CryptoPriceList");

    // Get list of tokenIds from the sheet
    var tokenIdsArrayOfArrays = pullTokenIdsFromCryptoPriceListSheet(CryptoPriceListSheet);

    // Convert array of arrays to list of comma separated to fit API data structure
    var tokenIdsCommaSeparatedString = convertArrayOfArraysIntoCommaSeparatedString(tokenIdsArrayOfArrays);
    
    // Get prices from coinmarketcap
    var priceList = getTickerListPricesApiV2(tokenIdsCommaSeparatedString, tokenIdsArrayOfArrays);

    // Write to the sheet starting
    CryptoPriceListSheet.getRange(7, 3, priceList.length, 1).setValues(priceList);
};

// Pull up to 1000 tokenIds from the sheet column B starting in row 7
function pullTokenIdsFromCryptoPriceListSheet(CryptoPriceListSheet) {
    var tokenIdsWithBlanks = CryptoPriceListSheet.getRange(7, 2, 1000, 1).getValues();
    var tokenIds = [];
    var tokenNotBlank = true;
    var i = 0;
    var id;
    
    while (tokenNotBlank) {
        id = tokenIdsWithBlanks[i];
        i++;
        if (id == "") {
            tokenNotBlank = false;
        } else {
            tokenIds.push(id);
        }
    }

    return tokenIds;
}

/*
  Accepts array of arrays with tokenIds as input and outputs string with comma separated list of IDs
  To get token IDs either: 
  Run this and search for the token symbol in the page "ETH" and look next to it for the ID: 
  curl -H "X-CMC_PRO_API_KEY: YOUR_API_KEY" -H "Accept: application/json" -d "start=1&limit=5000&convert=USD" -G https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest
  Or pull it from the Coinmarketcap webpage https://coinmarketcap.com/currencies/ethereum/ by inspecting
  the page and looking for this data: ""pageProps":{"info":{"id":1027 ... "
*/
function convertArrayOfArraysIntoCommaSeparatedString(tokenIdsArrayOfArrays) {
    var tokenIdString = "";
    var tokenIdsArrayOfArraysLength = tokenIdsArrayOfArrays.length;
    tokenIdsArrayOfArrays.forEach(function (idArray, i) {
        tokenIdString = tokenIdString + idArray[0];
        if (i < tokenIdsArrayOfArraysLength-1) {
            tokenIdString = tokenIdString + ",";
        }
    });

    return tokenIdString;
};

// Get the data from Coinmarketcap API for the tickers passed in
function getTickerListPricesApiV2(tickersListCommaSeparatedString, tokenIdsArrayOfArrays) {
    var coinMarketCapAPICall = {
        method: 'GET',
        qs: {
          convert: 'USD'
        },
        headers: { 'X-CMC_PRO_API_KEY': 'YOUR_API_KEY' },
        json: true,
        gzip: true,
    }

    var coinMarketCapUrl = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?id=${tickersListCommaSeparatedString}`
    var result = UrlFetchApp.fetch(coinMarketCapUrl, coinMarketCapAPICall);
    var txt = result.getContentText();
    var d = JSON.parse(txt);
    var priceList = [];

    tokenIdsArrayOfArrays.forEach(function (idArray) {
        priceList.push([d["data"][idArray[0]]["quote"]["USD"]["price"]]);
    });
    return priceList;
};
