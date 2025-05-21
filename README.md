# Exotel POC Node

A proof of concept for integrating Exotel's API to manage phone calls, including advanced features like state management, call recording, and dynamic routing.

## Prerequisites

- Node.js (with ESM support)
- An Exotel account with API credentials

## Setup

1. Clone this repository:

   ```bash
   git clone <repository-url>
   cd exotel-poc-node
   ```

2. Install dependencies:

   ```bash
   yarn install
   ```

3. Configure environment variables:

   Create a `.env` file in the root directory and add the following:

   ```env
   EXOTEL_SID=your_exotel_sid
   EXOTEL_API_KEY=your_exotel_api_key
   EXOTEL_API_TOKEN=your_exotel_api_token
   EXOTEL_SUBDOMAIN=your_exotel_subdomain
   FROM_NUMBER=your_exotel_number
   CALLER_ID=your_caller_id
   TO_NUMBER=recipient_number
   SERVER_ENDPOINT=your_server_endpoint
   ```

## Running the Application

Start the server:

```bash
node src/index.js
```

The server will start on port 3000 (or the port specified in your `.env` file).

## Endpoints

### 1. `/call`

**Method:** GET

Initiates a call between two numbers with state management and call recording.

**Query Parameters:**

- `from`: The caller's number
- `to`: The recipient's number

**Example:**

```bash
curl -X GET 'http://localhost:3000/call?from=919XXXXXXXXX&to=919YYYYYYYYY'
```

### 2. `/exotel/call`

**Method:** GET

Determines the target number dynamically based on the call direction and initiates a call.

**Query Parameters:**

- `CallFrom`: The number initiating the call
- `Direction`: The call direction (`incoming` or `outgoing`)

**Example:**

```bash
curl -X GET 'http://localhost:3000/exotel/call?CallFrom=919XXXXXXXXX&Direction=incoming'
```

### 3. `/call-status`

**Method:** POST

Handles call status updates from Exotel.

**Request Body:**

- `CallSid`: Unique identifier for the call
- `Status`: Current status of the call
- `StartTime`: Call start time
- `EndTime`: Call end time
- `DialCallDuration`: Duration of the call
- `RecordingUrl`: URL of the call recording
- `CustomField`: Custom field data

**Example:**

```bash
curl -X POST 'http://localhost:3000/call-status' \
  -H 'Content-Type: application/json' \
  -d '{"CallSid": "12345", "Status": "completed", "RecordingUrl": "http://example.com/recording.mp3"}'
```

### 4. `/exotel/dial`

**Method:** GET

Returns the recipient's number for testing purposes.

**Example:**

```bash
curl -X GET 'http://localhost:3000/exotel/dial'
```

## Features

- **State Management:** Ensures call state is tracked and managed.
- **Call Recording:** Records calls with dual-channel support.
- **Dynamic Routing:** Determines the target number dynamically based on call direction.
- **Error Handling:** Comprehensive error handling for all endpoints.

## How It Works

1. The application uses Exotel's API to initiate and manage calls.
2. Endpoints are provided to handle call initiation, status updates, and dynamic routing.
3. Logs and responses are captured for debugging and monitoring purposes.

## Direct Call Without API

You can make a direct call without using the API endpoints by uncommenting and modifying the `callOwnService` or `makeCall` function in `src/index.js`.

## License

This project is licensed under the MIT License.
