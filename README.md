# Exotel Call POC

A simple proof of concept for making phone calls using the Exotel API.

## Prerequisites

- Node.js (with ESM support)
- Exotel account with API credentials

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   yarn install
   ```
3. Configure environment variables:
   Update the `.env` file with your Exotel credentials:
   ```
   EXOTEL_SID=your_exotel_sid
   EXOTEL_API_KEY=your_exotel_api_key
   EXOTEL_API_TOKEN=your_exotel_api_token
   EXOTEL_SUBDOMAIN=your_exotel_subdomain
   FROM_NUMBER=your_exotel_number
   ```

## Running the application

Start the server:

```
node src/index.js
```

The server will start on port 3000 (or the port specified in your environment).

## Making a call

Send a POST request to the `/call` endpoint with a JSON body:

```
curl -X POST http://localhost:3000/call \
  -H "Content-Type: application/json" \
  -d '{"toNumber": "919XXXXXXXXX"}'
```

Replace `919XXXXXXXXX` with the phone number you want to call (including country code).

## Direct call without API

You can also make a direct call without using the API endpoint by uncommenting and modifying the example code at the bottom of `src/index.js`.

## How it works

This POC uses Exotel's Connect API to establish a call between two numbers:

1. When you make a request, it connects your Exotel number to the recipient's number
2. The call is initiated as a transaction call (use 'trans' for transactional calls)
3. The server logs the response from Exotel and returns the result to you
